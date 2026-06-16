import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-ink px-8 pb-8 pt-section max-sm:px-5 max-sm:pt-section-sm" role="contentinfo">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-4 gap-12 max-md:grid-cols-2 max-md:gap-8 max-[480px]:grid-cols-1 max-[480px]:gap-6">
          <div>
            <h4 className="font-serif text-sm font-medium text-brass mb-3.5">Support</h4>
            <ul className="space-y-2">
              {["Help Centre", "Safety information", "Cancellation options", "Contact us"].map((l) => (
                <li key={l}><span className="cursor-pointer font-sans text-xs text-white/45 transition-colors hover:text-brass">{l}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-sm font-medium text-brass mb-3.5">Discover</h4>
            <ul className="space-y-2">
              {["Lagos stays", "Abuja stays", "Curated neighbourhoods", "Travel guide"].map((l) => (
                <li key={l}><span className="cursor-pointer font-sans text-xs text-white/45 transition-colors hover:text-brass">{l}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-sm font-medium text-brass mb-3.5">Legal</h4>
            <ul className="space-y-2">
              {["Privacy policy", "Terms of service", "Cookies", "GDPR & NDPR"].map((l) => (
                <li key={l}><span className="cursor-pointer font-sans text-xs text-white/45 transition-colors hover:text-brass">{l}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-sm font-medium text-brass mb-3.5">Company</h4>
            <ul className="space-y-2">
              {["About us", "Press & media", "Trustpilot reviews", "Operated by Lyxio Curtis Ltd"].map((l) => (
                <li key={l}><span className="cursor-pointer font-sans text-xs text-white/45 transition-colors hover:text-brass">{l}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/6 pt-5 max-sm:flex-col max-sm:gap-3 max-sm:text-center">
          <Link href="/" className="font-sans text-sm font-bold text-white no-underline tracking-tight">
            checkin<span className="text-brass">Bliss</span>
          </Link>
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Lyxio Curtis Ltd. Built for the diaspora.
          </p>
        </div>
      </div>
    </footer>
  );
}
