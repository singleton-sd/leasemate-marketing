export type NavItem = {
  label: string;
  href: string;
};

export const primaryNav = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
] as const satisfies readonly NavItem[];

export const footerNav = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "Waitlist", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const satisfies Record<string, readonly NavItem[]>;

export function withBase(path: string, base: string): string {
  if (
    path.startsWith("http") ||
    path.startsWith("#") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (path === "/") return `${normalizedBase}/`;
  return `${normalizedBase}${path}`;
}

export function isActivePath(
  pathname: string,
  href: string,
  base: string,
): boolean {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = withBase(href, base).replace(/\/$/, "") || "/";
  if (href === "/") {
    return current === target;
  }
  return current === target || current.endsWith(href);
}
