/* Shared stroke icons. strokeWidth 1.5 throughout for consistency with the editorial brand. */

type IconProps = { className?: string; size?: number };

const base = (size: number, className: string | undefined) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

export const Icon = {
  BarChart3: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg>
  ),
  Shield: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  UserCog: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><circle cx="18" cy="15" r="3" /><circle cx="9" cy="7" r="4" /><path d="M10 15H6a4 4 0 0 0-4 4v1" /><path d="M21.7 16.4l-.9-.3" /><path d="M15.2 13.9l-.9-.3" /><path d="M16.6 18.7l.3-.9" /><path d="M19.1 12.2l.3-.9" /><path d="M19.6 18.7l-.4-1" /><path d="M16.8 12.3l-.4-1" /><path d="M14.3 16.6l1-.4" /><path d="M20.7 13.8l1-.4" /></svg>
  ),
  Coins: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>
  ),
  Building2: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>
  ),
  Users: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  List: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
  ),
  Settings: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
  LogOut: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  ),
  MessageCircle: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
  ),
  Bell: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
  ),
  X: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  Hamburger: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size, className)}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  ),
  Calendar: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  Clipboard: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
  ),
  CheckSquare: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  Bed: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>
  ),
  Plus: ({ className, size = 14 }: IconProps) => (
    <svg {...base(size, className)} strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  Receipt: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>
  ),
  Sync: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size, className)}><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" /></svg>
  ),
  ArrowUpRight: ({ className, size = 14 }: IconProps) => (
    <svg {...base(size, className)}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
  ),
  ArrowDownRight: ({ className, size = 14 }: IconProps) => (
    <svg {...base(size, className)}><line x1="7" y1="7" x2="17" y2="17" /><polyline points="17 7 17 17 7 17" /></svg>
  ),
  Dot: ({ className, size = 8 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 8 8" fill="currentColor" className={className}><circle cx="4" cy="4" r="3" /></svg>
  ),
} as const;

export type IconName = keyof typeof Icon;
