import { z } from "zod";
import {
  LEAD_COMPANY_MAX,
  LEAD_EMAIL_MAX,
  LEAD_NAME_MAX,
  LEAD_WEBSITE_MAX,
} from "./lead-intake.ts";

export const SAFE_NAME_MAX = LEAD_NAME_MAX;
export const SAFE_EMAIL_MAX = LEAD_EMAIL_MAX;
export const SAFE_COMPANY_MAX = LEAD_COMPANY_MAX;
export const SAFE_WEBSITE_MAX = LEAD_WEBSITE_MAX;

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;

export const SAFE_EMAIL_RE =
  /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/;

const optionalPlainText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      `${label} contains invalid characters.`,
    );

export const waitlistFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(SAFE_NAME_MAX, `Name must be at most ${SAFE_NAME_MAX} characters.`)
    .refine(
      (value) => !CONTROL_CHARS_RE.test(value),
      "Name contains invalid characters.",
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(SAFE_EMAIL_MAX, `Email must be at most ${SAFE_EMAIL_MAX} characters.`)
    .regex(SAFE_EMAIL_RE, "Enter a valid email address."),
  company: optionalPlainText(SAFE_COMPANY_MAX, "Organisation"),
  consent: z.literal(true, {
    error: "Please confirm you have read the privacy policy.",
  }),
  marketingOptIn: z.boolean(),
  website: optionalPlainText(SAFE_WEBSITE_MAX, "Website"),
});

export type WaitlistFormValues = z.infer<typeof waitlistFormSchema>;

export type WaitlistFormDefaultValues = Omit<WaitlistFormValues, "consent"> & {
  consent: boolean;
};
