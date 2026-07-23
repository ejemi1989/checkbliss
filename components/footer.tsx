import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-nav">
          <div>
            <p className="fcol-head">Explore</p>
            <a href="/list-property" className="fcol-link">List your property</a>
            <span className="fcol-link fcol-link--coming">Partnerships</span>
            <span className="fcol-link fcol-link--soon">
              Affiliate programme<span className="fcol-soon-badge">Soon</span>
            </span>
            <span className="fcol-link fcol-link--coming">Journal</span>
            <span className="fcol-link fcol-link--coming">CheckinBliss vs Airbnb</span>
          </div>
          <div>
            <p className="fcol-head">Support</p>
            <a href="#" className="fcol-link">Help centre</a>
            <a href="mailto:hello@checkinbliss.com" className="fcol-link">Contact us</a>
            <a href="/policy" className="fcol-link">Policy</a>
            <span className="fcol-link fcol-link--soon">
              Reviews<span className="fcol-soon-badge">Soon</span>
            </span>
          </div>
          <div>
            <p className="fcol-head">CheckinBliss</p>
            <a href="#" className="fcol-link">Our story</a>
            <a href="#" className="fcol-link">The CheckinBliss standard</a>
            <a href="#" className="fcol-link">CheckinBliss for business</a>
            <a href="#" className="fcol-link">Press</a>
          </div>
        </div>
        <div className="foot-bottom">
          <div className="foot-row foot-row--statement">
            <div className="foot-row">
              <Link href="/search?where=Lagos" className="foot-dest-link">Lagos</Link>
              <span className="foot-sep">&middot;</span>
              <Link href="/search?where=Abuja" className="foot-dest-link">Abuja</Link>
              <span className="foot-sep">&middot;</span>
              <span className="foot-dest-soon">Coming soon:</span>
              <span className="foot-dest-muted">Port Harcourt, Accra, Nairobi</span>
            </div>
            <div className="foot-socials">
              <a href="#" className="foot-social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                </svg>
              </a>
              <a href="#" className="foot-social-link" aria-label="TikTok">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="foot-row foot-row--statement">
            <p className="foot-legal">CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027. &copy; 2026</p>
            <div className="foot-row">
              <a href="#" className="foot-legal-link">Privacy</a>
              <span className="foot-sep">&middot;</span>
              <a href="#" className="foot-legal-link">Terms</a>
              <span className="foot-sep">&middot;</span>
              <a href="#" className="foot-legal-link">Cookies</a>
              <span className="foot-sep">&middot;</span>
              <a href="#" className="foot-legal-link">Accessibility</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
