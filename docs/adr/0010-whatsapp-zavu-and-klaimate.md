# ADR 0010: WhatsApp via Zavu, explicit sender, table queue

- Status: accepted in the repository. It contradicts matrix D-03, D-08, D-09 and D-11 until a human approves `KNOWLEDGE.base/proposals/2026-10-18-klaimate-agente.md`.
- Date: 2026-10-18

## Context

The delivery needs a WhatsApp path on the existing Hono worker. The connected Zavu account has two senders. The default sender is SMS. The WhatsApp sender (Achalau HCO, `kd7b3sknk6z3xvn5pykzgkc7a58ghwe7`, +1 980 705 5482) is not the default, and its payment setup reports `canSendTemplates=false`. Cloudflare Queues are not configured on this worker. The visible product name requested for the hackathon build is KlAimate; Linear v0.4 still says Cerca WhatsApp.

## Decision

- The notification adapter always sends `Zavu-Sender` from `ZAVU_SENDER_ID`, `channel: "whatsapp"`, and `fallbackEnabled: false`. A blank sender id fails closed and does not call the network.
- Inside the 24 hour window the dispatcher sends free text. Outside it, template mode runs only when `ZAVU_CAN_SEND_TEMPLATES=true`. Otherwise the job is stored as a terminal failure (`can_send_templates_false`) and is not retried. HTTP 402 and payment or template errors from Zavu are terminal as well.
- The durable queue is `emergency_map_notification_job` plus a 15 minute cron and an internal HTTP trigger. That is the plan B already named in D-09. No queue binding is added.
- Phone numbers are AES-GCM ciphertext plus a separate HMAC for lookup. Logs mask the number. Inbound messages from the stored number verify it and open the window. BAJA, STOP, PARAR and CANCELAR opt out immediately and schedule erasure (default 30 days).
- The inbound webhook is `POST /api/v1/webhooks/zavu`, signature `X-Zavu-Signature`, configured on the WhatsApp sender (Senders → Achalau HCO → Webhooks → `message.inbound`).
- The UI display name is KlAimate. Package scope, the `/cerca` route and the table prefix stay as they are.
- Without `LLM_API_KEY` the agent uses a deterministic composer that still calls the data tools. Open-Meteo stays a forecast, never an official notice (ADR 0008).

## Consequences

Template delivery stays blocked until someone adds a payment method on the WhatsApp sender and Meta approves the utility templates. The demo path is the user's own "Hola", which opens the service window. A later matrix update has to record the name, the conversational agent, Zavu as the chosen provider, and verification by an inbound message from the registered number.
