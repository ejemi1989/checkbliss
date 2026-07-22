import "@/app/styles/main.css";
import "@/app/styles/property.css";

export default function BuildingLayout({ children }: { children: React.ReactNode }) {
  return <div className="prop-body">{children}</div>;
}
