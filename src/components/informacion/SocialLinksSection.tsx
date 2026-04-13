import { Instagram, MessageCircle } from "lucide-react"

const INSTAGRAM_URL = "https://www.instagram.com/fernando_perdomo_/"
const WHATSAPP_URL = "https://wa.me/5493777622754"

export function SocialLinksSection() {
  return (
    <section className="bg-[var(--button-secondary-bg)] border border-[var(--card-border)] rounded-xl p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
        Redes Sociales
      </h2>
      <div className="flex gap-3">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium gap-1.5 px-2.5 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Instagram className="w-4 h-4" />
          Instagram
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium gap-1.5 px-2.5 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
      </div>
    </section>
  )
}