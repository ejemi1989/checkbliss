import Link from "next/link";

function SocialIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex items-center justify-center w-[34px] h-[34px] border border-hairline rounded-full text-ink hover:border-green-soft hover:text-green-soft transition-colors"
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline pt-16 pb-12" role="contentinfo">
      <div className="max-w-[1240px] mx-auto px-[var(--spacing-gutter)]">

        {/* 3-column nav */}
        <nav className="grid grid-cols-3 gap-10 pb-12 border-b border-hairline max-sm:grid-cols-1 max-sm:gap-8" aria-label="Footer navigation">
          {/* Explore */}
          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">Explore</h3>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">How it works</Link>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Selection process</Link>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Hospitality</Link>
            <Link href="/list-property" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">List your property</Link>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">Support</h3>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">FAQ</Link>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Contact us</Link>
            <span className="flex items-center gap-2 font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default">
              Affiliate programme
              <span className="font-sans text-[9px] tracking-[.1em] uppercase font-bold px-2 py-[2px] border border-hairline rounded-full text-mute whitespace-nowrap">Soon</span>
            </span>
            <span className="block font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default">Reviews</span>
          </div>

          {/* CheckinBliss */}
          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">CheckinBliss</h3>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">About us</Link>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Story</Link>
            <Link href="/search" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Press</Link>
            <span className="block font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default">Careers</span>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="py-8 flex flex-col gap-4">
          {/* Destinations row */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <Link href="/search?where=Lagos" className="font-sans text-sm font-medium text-ink no-underline hover:text-green-soft transition-colors">Lagos</Link>
            <span className="text-hairline select-none">·</span>
            <Link href="/search?where=Abuja" className="font-sans text-sm font-medium text-ink no-underline hover:text-green-soft transition-colors">Abuja</Link>
            <span className="text-hairline select-none">·</span>
            <span className="font-sans text-[13px] text-mute font-semibold">Coming soon:</span>
            <span className="font-sans text-[13px] text-mute italic">Port Harcourt,</span>
            <span className="font-sans text-[13px] text-mute italic">Accra,</span>
            <span className="font-sans text-[13px] text-mute italic">Nairobi</span>
          </div>

          {/* Statement + social */}
          <div className="flex items-center justify-between flex-wrap gap-6 max-sm:flex-col max-sm:items-start">
            <p className="font-sans text-xs leading-relaxed text-mute">
              CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <SocialIcon label="Instagram">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </SocialIcon>
              <SocialIcon label="TikTok">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12a4 4 0 107 3V6h3a8 8 0 01-4 7" />
                </svg>
              </SocialIcon>
              <SocialIcon label="X (Twitter)">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4l6.5 8.5L4 20h3l5-5.5L17 20h4l-7-9.5L21 4h-3l-4.5 5L8 4H4z" />
                </svg>
              </SocialIcon>
            </div>
          </div>
        </div>

        {/* Legal links */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <Link href="/privacy" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Privacy</Link>
          <span className="text-hairline select-none">·</span>
          <Link href="/terms" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Terms</Link>
          <span className="text-hairline select-none">·</span>
          <Link href="/cookies" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Cookies</Link>
          <span className="text-hairline select-none">·</span>
          <Link href="/accessibility" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Accessibility</Link>
        </div>

        {/* Newsletter */}
        <div className="mt-10 p-8 bg-brass text-bone rounded-sm text-center">
          <p className="font-display italic text-[clamp(18px,2vw,26px)]">
            Built on trust, shaped by detail, defined by <em className="not-italic font-semibold">quality, intention, and care.</em>
          </p>
          <form className="flex gap-3 mt-6 max-w-[480px] mx-auto max-[560px]:flex-col" aria-label="Newsletter sign-up">
            <input
              type="email"
              placeholder="Enter your email address"
              aria-label="Email address"
              className="flex-1 bg-transparent border-b border-bone/30 px-3 py-3 text-bone text-sm placeholder:text-bone/50 outline-none font-sans max-[560px]:text-center"
            />
            <button type="submit" className="bg-bone text-brass font-sans text-sm font-semibold px-6 py-3 rounded-sm transition-colors hover:bg-bone-secondary shrink-0 max-[560px]:w-full">
              Subscribe
            </button>
          </form>
        </div>

      </div>
    </footer>
  );
}
