import "@/app/styles/main.css";
import "@/app/styles/listings.css";

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="lst-body">{children}</div>;
}
