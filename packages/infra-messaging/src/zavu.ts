import type {
  ILlmPort,
  INotificationPort,
  LlmCompletion,
  LlmMessage,
  LlmToolDefinition,
  NotificationSendResult,
} from "@emergency-map/domain/repositories";
import { maskPhone, redactPhones } from "@emergency-map/domain/rules";

const ZAVU_MESSAGES_URL = "https://api.zavu.dev/v1/messages";

export interface ZavuNotifierOptions {
  apiKey: string;
  /**
   * WhatsApp sender id. Required. The project default sender is SMS-only, so a
   * request without `Zavu-Sender` would leave from the wrong channel.
   */
  senderId: string;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export interface ZavuHttpRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Pure request builder. Tests lock the sender header and the whatsapp channel. */
export function buildZavuMessageRequest(
  options: { apiKey: string; senderId: string },
  payload: Record<string, unknown>,
): ZavuHttpRequest {
  if (!options.senderId.trim()) {
    throw new Error("ZAVU_SENDER_ID is required; the default sender is not WhatsApp.");
  }
  return {
    url: ZAVU_MESSAGES_URL,
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "Zavu-Sender": options.senderId,
    },
    body: {
      ...payload,
      channel: "whatsapp",
      fallbackEnabled: false,
    },
  };
}

interface ZavuErrorBody {
  code?: string;
  message?: string;
}

/**
 * Payment and template-setup failures are terminal. The live sender currently
 * reports canSendTemplates=false until a payment method exists, and retrying
 * that does not make the message leave.
 */
export function classifyZavuFailure(
  status: number,
  body: ZavuErrorBody,
): {
  terminal: boolean;
  code: string;
  message: string;
} {
  const code = (body.code ?? `http_${status}`).toLowerCase();
  const message = body.message ?? "";
  const blob = `${code} ${message}`.toLowerCase();
  const terminal =
    status === 402 ||
    status === 400 ||
    status === 403 ||
    status === 404 ||
    blob.includes("payment") ||
    blob.includes("billing") ||
    blob.includes("cansendtemplates") ||
    blob.includes("template") ||
    blob.includes("not approved") ||
    blob.includes("waba");
  return {
    terminal: terminal || (status >= 400 && status < 500 && status !== 429),
    code,
    message: message || `Zavu respondió ${status}`,
  };
}

async function postMessage(
  options: ZavuNotifierOptions,
  payload: Record<string, unknown>,
): Promise<NotificationSendResult> {
  const log = options.log ?? (() => undefined);
  if (!options.senderId.trim()) {
    log("zavu_skipped sender_id_required");
    return {
      status: "failed",
      terminal: true,
      code: "sender_id_required",
      message: "ZAVU_SENDER_ID es obligatorio. El sender por defecto del proyecto es solo SMS.",
    };
  }

  let request: ZavuHttpRequest;
  try {
    request = buildZavuMessageRequest(
      { apiKey: options.apiKey, senderId: options.senderId },
      payload,
    );
  } catch (error) {
    return {
      status: "failed",
      terminal: true,
      code: "sender_id_required",
      message: error instanceof Error ? error.message : "sender_id_required",
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network";
    log(redactPhones(`zavu_network ${message}`));
    return { status: "failed", terminal: false, code: "network", message };
  }

  const raw = await response.text();
  if (response.ok) {
    let providerMessageId = "sent";
    try {
      const parsed = JSON.parse(raw) as { message?: { id?: string }; id?: string };
      providerMessageId = parsed.message?.id ?? parsed.id ?? providerMessageId;
    } catch {
      providerMessageId = "sent";
    }
    return { status: "sent", providerMessageId };
  }

  let parsed: ZavuErrorBody = {};
  try {
    parsed = JSON.parse(raw) as ZavuErrorBody;
  } catch {
    parsed = { message: raw.slice(0, 180) };
  }
  const failure = classifyZavuFailure(response.status, parsed);
  log(redactPhones(`zavu_failed ${failure.code} ${failure.message}`));
  return {
    status: "failed",
    terminal: failure.terminal,
    code: failure.code,
    message: failure.message,
  };
}

export function createZavuNotifier(options: ZavuNotifierOptions): INotificationPort {
  return {
    async sendText(input) {
      options.log?.(redactPhones(`zavu_text ${maskPhone(input.to)}`));
      return postMessage(options, {
        to: input.to,
        messageType: "text",
        text: input.text,
      });
    },
    async sendTemplate(input) {
      options.log?.(redactPhones(`zavu_template ${maskPhone(input.to)} ${input.templateName}`));
      return postMessage(options, {
        to: input.to,
        messageType: "template",
        content: {
          templateId: input.templateName,
          templateVariables: input.variables,
        },
      });
    },
  };
}

export interface OpenAiLlmOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export function createOpenAiCompatibleLlm(options: OpenAiLlmOptions): ILlmPort {
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = options.model ?? "gpt-4o-mini";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async complete(input): Promise<LlmCompletion> {
      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: input.messages.map(toOpenAiMessage),
            tools: input.tools.map(toOpenAiTool),
          }),
        });
      } catch {
        return {
          kind: "message",
          text: "No tengo información confirmada: el modelo de lenguaje no respondió.",
        };
      }
      if (!response.ok) {
        return {
          kind: "message",
          text: "No tengo información confirmada: el modelo de lenguaje no respondió.",
        };
      }
      const payload = (await response.json()) as {
        choices?: {
          message?: {
            content?: string | null;
            tool_calls?: { id: string; function: { name: string; arguments: string } }[];
          };
        }[];
      };
      const message = payload.choices?.[0]?.message;
      const calls = message?.tool_calls ?? [];
      if (calls.length > 0) {
        return {
          kind: "tool_calls",
          calls: calls.map((call) => ({
            id: call.id,
            name: call.function.name,
            arguments: parseArgs(call.function.arguments),
          })),
        };
      }
      return { kind: "message", text: message?.content ?? "" };
    },
  };
}

/**
 * OpenAI chat format: a tool result must follow the assistant message that requested it and
 * carry that call's id. Results without the assistant `tool_calls` message are rejected (400).
 */
export function toOpenAiMessage(message: LlmMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.toolCallId ?? message.name ?? "tool",
    };
  }
  if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function toOpenAiTool(tool: LlmToolDefinition): Record<string, unknown> {
  return {
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  };
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
  return {};
}
