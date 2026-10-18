import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { whatsappHolaLink } from "@/lib/whatsapp";

const STEPS = [
  { title: "Regístrate", body: "Tu número de WhatsApp y el distrito de tu hogar." },
  { title: "Escribe «Hola»", body: "Así verificamos tu número y abres la conversación." },
  {
    title: "Recibe y pregunta",
    body: "Avisos de lluvia de SENAMHI con su nivel, fuente y hora. Pregunta por otra zona cuando viajes.",
  },
];

/**
 * Home hero. The product is the WhatsApp channel; the web is where people sign up and look at
 * the map. Copy follows the bot rules: informative, never "safe", always the source.
 */
export function WhatsappHero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="tocapu-field overflow-hidden rounded-2xl border border-border-subtle"
    >
      <div className="grid gap-8 px-5 py-8 md:grid-cols-[1.15fr_1fr] md:items-center md:px-10 md:py-12">
        <div className="grid gap-5">
          <p className="text-sm font-bold tracking-[0.12em] text-accent-primary uppercase">
            Lluvias en el Perú · por WhatsApp
          </p>
          <h1
            id="hero-title"
            className="font-heading text-[34px] leading-[1.05] font-extrabold text-cacao md:text-[48px]"
          >
            El aviso de lluvia de tu distrito llega a tu WhatsApp.
          </h1>
          <p className="max-w-[52ch] text-[17px] text-text-secondary">
            Con el nivel que da SENAMHI, la fuente y la hora del dato. Es informativo y no reemplaza
            a INDECI ni a SENAMHI.
          </p>
          <div className="flex flex-wrap gap-3">
            {whatsappHolaLink && (
              <a
                href={whatsappHolaLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-whatsapp px-5 text-[17px] font-bold text-white shadow-md hover:bg-whatsapp-hover hover:text-white hover:no-underline"
              >
                <MessageCircle className="size-5" aria-hidden />
                Escribir «Hola» por WhatsApp
              </a>
            )}
            <Link
              to={"/auth/signup" as "/"}
              className="inline-flex h-12 items-center rounded-xl border-2 border-cacao px-5 text-[17px] font-bold text-cacao hover:bg-cacao hover:text-[#fdf9f2] hover:no-underline"
            >
              Crear mi cuenta
            </Link>
          </div>
        </div>
        <ol className="grid gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-xs"
            >
              <span
                aria-hidden
                className="font-heading grid size-10 shrink-0 place-items-center rounded-lg bg-accent-primary text-xl font-extrabold text-white"
              >
                {index + 1}
              </span>
              <span className="grid gap-0.5">
                <span className="font-heading text-lg font-bold text-cacao">{step.title}</span>
                <span className="text-[15px] text-text-secondary">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="andean-band" aria-hidden />
    </section>
  );
}
