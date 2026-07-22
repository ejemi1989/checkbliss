import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-soft border-t border-line pt-section pb-section-sm px-[var(--spacing-gutter)]" role="contentinfo">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-16 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-7">
          <div>
            <img src="/assets/images/logo/logo-wrd.png" alt="CheckinBliss" className="h-8 w-auto mb-3" />
            <p className="font-sans text-sm leading-relaxed text-ink-secondary max-w-[32ch]">
              Verified Hospitality. Built on trust, shaped by detail, defined by quality, intention, and care.
            </p>
          </div>
          <div>
            <div className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-5">Navigation</div>
            {["Stay", "Lifestyle", "About"].map((l) => (
              <Link key={l} href={l === "Stay" ? "/search" : "#"} className="block font-sans text-sm text-ink-secondary mb-2 no-underline hover:text-green-soft transition-colors">
                {l}
              </Link>
            ))}
          </div>
          <div>
            <div className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-5">Legal</div>
            {["Privacy Policy", "Cookies Policy", "Terms of Service", "Accessibility"].map((l) => (
              <span key={l} className="block font-sans text-sm text-ink-secondary mb-2 cursor-pointer hover:text-green-soft transition-colors">
                {l}
              </span>
            ))}
          </div>
          <div>
            <div className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-5">Destinations</div>
            {["Lagos", "Abuja", "Coming Soon"].map((l) => (
              <Link key={l} href={l === "Coming Soon" ? "#" : `/search?where=${l}`} className="block font-sans text-sm text-ink-secondary mb-2 no-underline hover:text-green-soft transition-colors">
                {l}
              </Link>
            ))}
            <div className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-mute mb-5 mt-8">Contact</div>
            <span className="block font-sans text-sm text-ink-secondary mb-2">hello@checkinbliss.com</span>
            <span className="block font-sans text-sm text-ink-secondary mb-2">+44 000 000 000</span>
            <span className="block font-sans text-sm text-ink-secondary mb-2 cursor-pointer hover:text-green-soft transition-colors">Press Enquiries</span>
          </div>
        </div>

        <div className="p-8 bg-brass text-bone text-center mb-10 rounded-sm">
          <p className="font-display italic text-[clamp(18px,2vw,26px)]">
            Built on trust, shaped by detail, defined by <em className="not-italic font-semibold">quality, intention, and care.</em>
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 text-[13px] text-mute max-sm:flex-col max-sm:text-center">
          <span className="flex gap-x-5">
            <a href="#" className="text-mute hover:text-green-soft transition-colors" aria-label="Instagram">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="#" className="text-mute hover:text-green-soft transition-colors" aria-label="LinkedIn">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            <a href="#" className="text-mute hover:text-green-soft transition-colors" aria-label="X (Twitter)">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l6.5 8.5L4 20h3l5-5.5L17 20h4l-7-9.5L21 4h-3l-4.5 5L8 4H4z"/>
              </svg>
            </a>
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 text-[13px] text-mute max-sm:flex-col max-sm:text-center">
          <span>&copy; {new Date().getFullYear()} CheckinBliss. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
