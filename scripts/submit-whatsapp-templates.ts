/**
 * Creates the KlAimate utility templates in Zavu and submits them to Meta.
 *
 * Dry-run is the default and does not call the network:
 *   pnpm run whatsapp:templates
 * Real submit needs the flag plus ZAVUDEV_API_KEY and ZAVU_SENDER_ID:
 *   pnpm run whatsapp:templates -- --submit
 *
 * The live sender reports canSendTemplates=false until a payment method exists.
 * Submitting templates does not by itself enable delivery.
 */
import { WHATSAPP_TEMPLATES } from "../packages/domain/src/whatsapp/catalog.ts";

const API = "https://api.zavu.dev/v1/templates";

const submit = process.argv.includes("--submit") && !process.argv.includes("--dry-run");
const apiKey = process.env.ZAVUDEV_API_KEY?.trim() ?? "";
const senderId = process.env.ZAVU_SENDER_ID?.trim() ?? "";
const publicUrl = process.env.APP_PUBLIC_URL?.trim().replace(/\/$/, "");

function examplesFor(template: (typeof WHATSAPP_TEMPLATES)[number]): Record<string, string> {
  const examples = { ...template.examples };
  if (publicUrl && "enlace" in examples) {
    examples.enlace = `${publicUrl}/piura`;
  }
  return examples;
}

function createBody(template: (typeof WHATSAPP_TEMPLATES)[number]) {
  return {
    name: template.name,
    language: template.language,
    body: template.body,
    whatsappCategory: template.category,
    variables: [...template.variables],
    buttons: template.buttons.map((button) => ({ type: button.type, text: button.text })),
  };
}

function submitBody(template: (typeof WHATSAPP_TEMPLATES)[number]) {
  return {
    senderId,
    category: template.category,
    variableExamples: examplesFor(template),
  };
}

async function main(): Promise<void> {
  for (const template of WHATSAPP_TEMPLATES) {
    const create = createBody(template);
    const review = submitBody(template);
    console.log(`\n# ${template.name}`);
    console.log("POST /v1/templates");
    console.log(JSON.stringify(create, null, 2));
    console.log("POST /v1/templates/{id}/submit");
    console.log(JSON.stringify(review, null, 2));
  }

  if (!submit) {
    console.log("\nDry-run. Pass --submit to create and submit these templates.");
    return;
  }
  if (!apiKey || !senderId) {
    console.error("Real submit needs ZAVUDEV_API_KEY and ZAVU_SENDER_ID.");
    process.exitCode = 1;
    return;
  }

  for (const template of WHATSAPP_TEMPLATES) {
    const created = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody(template)),
    });
    const createdBody = (await created.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!created.ok || !createdBody.id) {
      console.error(
        `create ${template.name} failed`,
        created.status,
        createdBody.message ?? createdBody,
      );
      process.exitCode = 1;
      return;
    }
    const reviewed = await fetch(`${API}/${createdBody.id}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submitBody(template)),
    });
    const reviewedBody = await reviewed.json().catch(() => ({}));
    console.log(`submitted ${template.name} id=${createdBody.id} status=${reviewed.status}`);
    console.log(JSON.stringify(reviewedBody));
    if (!reviewed.ok) {
      process.exitCode = 1;
      return;
    }
  }
}

await main();
