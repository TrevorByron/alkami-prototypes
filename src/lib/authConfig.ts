export const allowedEmailDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN ?? "alkami.com").replace(/^@/, "").trim().toLowerCase();

export function isAllowedEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.endsWith(`@${allowedEmailDomain}`) && email.indexOf("@") > 0;
}
