/** Build-time waitlist POST flag. Off until SSD-718 is live in production. */
export function isLeadIntakeEnabled(value?: string): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
