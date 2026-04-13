const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3454.7185117518666!2d-59.53316112367533!3d-30.016238029970342!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x944c8a4e24ab8b61%3A0x4c1c5b4cf6707481!2sSgto.%20Cabral%20545%2C%20W3423%20Esquina%2C%20Corrientes!5e0!3m2!1ses!2sar!4v1776119715161!5m2!1ses!2sar"

export function AddressSection() {
  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
        Dirección
      </h2>
      <p className="text-lg text-[var(--foreground)]">
        Sargento Cabral 545, Esquina, Corrientes
      </p>
      <div className="mt-4 w-full overflow-hidden rounded-lg border border-[var(--card-border)]">
        <iframe
          src={GOOGLE_MAPS_EMBED_URL}
          width="100%"
          height="200"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación del gimnasio"
          className="aspect-video w-full"
        />
      </div>
    </section>
  )
}