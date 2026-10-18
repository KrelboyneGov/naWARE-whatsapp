import { describe, expect, it } from "vitest";
import { WHATSAPP_TEMPLATES } from "../../whatsapp/catalog";
import { templatePolicyViolations } from "../template-policy";

describe("WhatsApp template catalog", () => {
  it("keeps every utility template inside Meta's variable and tone rules", () => {
    for (const template of WHATSAPP_TEMPLATES) {
      expect(templatePolicyViolations(template)).toEqual([]);
      expect(template.buttons).toEqual([{ type: "quick_reply", text: "BAJA" }]);
      for (const name of template.variables) {
        expect(template.examples[name as keyof typeof template.examples]).toBeTruthy();
      }
    }
  });

  it("rejects a body that starts with a variable, shouts, or uses a shortener", () => {
    const broken = templatePolicyViolations({
      name: "mala",
      language: "es",
      category: "UTILITY",
      body: "{{distrito}} {{nivel}} TIENE UNA OFERTA IMPERDIBLE!! mira https://bit.ly/x ahora",
      variables: ["distrito", "nivel"],
      buttons: [],
    });
    expect(broken).toEqual(
      expect.arrayContaining([
        "starts_with_variable",
        "adjacent_variables",
        "shortened_link",
        "repeated_exclamation",
        "repeated_caps",
        "baja_button",
      ]),
    );
  });
});
