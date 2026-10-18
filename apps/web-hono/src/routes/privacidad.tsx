import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({ meta: [{ title: "Privacidad · KlAimate" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 text-[15px] leading-relaxed">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Privacidad</h1>
      <p>
        Este texto es la base del registro de KlAimate. No es un dictamen sobre la Ley 29733: ese
        requisito sigue por verificar con la fuente oficial.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Responsable</h2>
        <p>
          El responsable del tratamiento es el equipo que opera KlAimate en este despliegue. El
          contacto es el correo de la cuenta con la que te registras, o el canal que el equipo
          publique en el repositorio. La baja inmediata no espera ese contacto: responde BAJA por
          WhatsApp.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Finalidad</h2>
        <p>
          Usamos el número y la zona (distrito) para enviarte avisos informativos de clima de esa
          zona y, si escribes al bot, para guardar una memoria corta de la conversación y avisarte
          si cambia lo que consultaste. No usamos el número para marketing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué guardamos</h2>
        <p>
          El número se guarda cifrado. La búsqueda usa un hash distinto, no el número en claro. La
          memoria de la conversación también va cifrada. La zona queda a nivel de distrito; no
          guardamos el punto exacto del navegador. Los registros de esta aplicación están en una
          base de datos personales <strong>en trámite</strong> ante la ANPD.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Conservación</h2>
        <p>
          Mientras la cuenta sigue activa y no pediste la baja, conservamos el número y la memoria
          para poder avisarte. Después de BAJA (o STOP, PARAR, CANCELAR) dejamos de enviar y
          programamos el borrado o la anonimización del número y de la memoria. El plazo por defecto
          es 30 días, configurable con DATA_RETENTION_DAYS.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Derechos ARCO</h2>
        <p>
          Puedes pedir acceso, rectificación, cancelación u oposición. Responder BAJA es la
          oposición y el inicio de la cancelación de los avisos y de la memoria asociada al número.
          Para el resto, escribe desde la cuenta registrada.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Transferencia fuera del Perú</h2>
        <p>
          El envío por WhatsApp pasa por Meta y por Zavu, proveedores fuera del Perú. Sin esa
          transferencia no sale el mensaje. La casilla del registro tiene que aceptarlo; no viene
          marcada.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Mayores de edad</h2>
        <p>El registro es solo para personas adultas. Si no lo eres, no crees una cuenta.</p>
      </section>

      <p>
        <Link to="/auth/signup" className="font-medium text-primary hover:underline">
          Volver al registro
        </Link>
      </p>
    </article>
  );
}
