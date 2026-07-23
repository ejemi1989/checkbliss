import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-hairline pt-16 pb-12" role="contentinfo">
      <div className="max-w-[1240px] mx-auto px-8">

        {/* 3-column nav */}
        <nav className="grid grid-cols-3 gap-10 pb-12 border-b border-hairline max-sm:grid-cols-1 max-sm:gap-8" aria-label="Footer navigation">
          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">Explore</h3>
            <Link href="/list-property" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">List your property</Link>
            <span className="block font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default select-none">Partnerships</span>
            <span className="flex items-center gap-2 font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default select-none">
              Affiliate programme
              <span className="shrink-0 font-sans text-[9px] tracking-[.1em] uppercase font-bold px-2 py-[2px] border border-hairline rounded-full text-mute">Soon</span>
            </span>
            <span className="block font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default select-none">Journal</span>
            <span className="block font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default select-none">CheckinBliss vs Airbnb</span>
          </div>

          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">Support</h3>
            <a href="#" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Help centre</a>
            <a href="mailto:hello@checkinbliss.com" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Contact us</a>
            <Link href="/policy" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Policy</Link>
            <span className="flex items-center gap-2 font-sans text-[14.5px] text-hairline font-medium mb-[10px] cursor-default select-none">
              Reviews
              <span className="shrink-0 font-sans text-[9px] tracking-[.1em] uppercase font-bold px-2 py-[2px] border border-hairline rounded-full text-mute">Soon</span>
            </span>
          </div>

          <div>
            <h3 className="font-sans text-xs tracking-[.08em] uppercase text-mute font-semibold mb-[18px]">CheckinBliss</h3>
            <a href="#" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Our story</a>
            <a href="#" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">The CheckinBliss standard</a>
            <a href="#" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">CheckinBliss for business</a>
            <a href="#" className="block font-sans text-[14.5px] text-ink font-medium mb-[10px] no-underline hover:text-green-soft transition-colors">Press</a>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="pt-8 pb-4 flex flex-col gap-4">
          {/* Destinations + social */}
          <div className="flex items-center justify-between flex-wrap gap-6 max-sm:flex-col max-sm:items-start">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <Link href="/search?where=Lagos" className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors">Lagos</Link>
              <span className="text-hairline select-none">&middot;</span>
              <Link href="/search?where=Abuja" className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors">Abuja</Link>
              <span className="text-hairline select-none">&middot;</span>
              <span className="font-sans text-[13px] text-mute font-semibold">Coming soon:</span>
              <span className="font-sans text-[13px] text-mute italic">Port Harcourt, Accra, Nairobi</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a href="#" aria-label="Instagram" className="flex items-center justify-center w-[34px] h-[34px] border border-hairline rounded-full text-ink hover:border-green-soft hover:text-green-soft transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                </svg>
              </a>
              <a href="#" aria-label="TikTok" className="flex items-center justify-center w-[34px] h-[34px] border border-hairline rounded-full text-ink hover:border-green-soft hover:text-green-soft transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Company + legal */}
          <div className="flex items-center justify-between flex-wrap gap-6 max-sm:flex-col max-sm:items-start">
            <p className="font-sans text-xs leading-relaxed text-mute">
              CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027. &copy; 2026
            </p>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <a href="#" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Privacy</a>
              <span className="text-hairline select-none">&middot;</span>
              <a href="#" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Terms</a>
              <span className="text-hairline select-none">&middot;</span>
              <a href="#" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Cookies</a>
              <span className="text-hairline select-none">&middot;</span>
              <a href="#" className="font-sans text-[13px] text-mute font-medium no-underline hover:text-green-soft transition-colors">Accessibility</a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
