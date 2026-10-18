import { describe, expect, it, vi } from "vitest";
import { buildZavuMessageRequest, classifyZavuFailure, createZavuNotifier } from "./zavu";

const WHATSAPP_SENDER_ID = "kd7b3sknk6z3xvn5pykzgkc7a58ghwe7";

describe("Zavu WhatsApp sender", () => {
  it("always addresses the explicit WhatsApp sender and never the SMS default", () => {
    const request = buildZavuMessageRequest(
      { apiKey: "test-key", senderId: WHATSAPP_SENDER_ID },
      { to: "+51987654321", messageType: "text", text: "Hola" },
    );

    expect(request.url).toBe("https://api.zavu.dev/v1/messages");
    expect(request.headers["Zavu-Sender"]).toBe(WHATSAPP_SENDER_ID);
    expect(request.headers.Authorization).toBe("Bearer test-key");
    expect(request.body.channel).toBe("whatsapp");
    expect(request.body.fallbackEnabled).toBe(false);
    expect(request.body).not.toHaveProperty("senderId", undefined);
  });

  it("refuses to call the network when ZAVU_SENDER_ID is missing", async () => {
    const fetchImpl = vi.fn();
    const notifier = createZavuNotifier({
      apiKey: "test-key",
      senderId: "  ",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await notifier.sendText({ to: "+51987654321", text: "Hola" });
    expect(result).toMatchObject({ status: "failed", terminal: true, code: "sender_id_required" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends templates with the same sender header and treats payment errors as terminal", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ code: "payment_required", message: "canSendTemplates is false" }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
    const notifier = createZavuNotifier({
      apiKey: "test-key",
      senderId: WHATSAPP_SENDER_ID,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await notifier.sendTemplate({
      to: "+51987654321",
      templateName: "alerta_semaforo_zona",
      variables: { distrito: "Piura" },
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = (fetchImpl.mock.calls as unknown as Array<[unknown, RequestInit]>)[0]?.[1];
    if (!init?.headers) throw new Error("missing request init");
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(String(init.body)) as {
      channel: string;
      fallbackEnabled: boolean;
      messageType: string;
    };
    expect(headers["Zavu-Sender"]).toBe(WHATSAPP_SENDER_ID);
    expect(body.channel).toBe("whatsapp");
    expect(body.fallbackEnabled).toBe(false);
    expect(body.messageType).toBe("template");
    expect(result).toMatchObject({ status: "failed", terminal: true, code: "payment_required" });
    expect(
      classifyZavuFailure(402, { code: "payment_required", message: "canSendTemplates is false" })
        .terminal,
    ).toBe(true);
  });

  it("does not log the full destination number", async () => {
    const lines: string[] = [];
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ message: { id: "msg_1" } }), { status: 200 }),
    );
    const notifier = createZavuNotifier({
      apiKey: "test-key",
      senderId: WHATSAPP_SENDER_ID,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      log: (line) => lines.push(line),
    });
    await notifier.sendText({ to: "+51987654321", text: "Hola" });
    expect(lines.join("\n")).not.toContain("+51987654321");
  });
});
