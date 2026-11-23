import { z } from "astro/zod";

import { draftField } from "./shared";

const legalPageFields = {
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  updated: z.string().trim().min(1),
  draft: draftField,
};

export const privacyPageSchema = z.object({
  template: z.literal("privacy"),
  ...legalPageFields,
});

export const termsPageSchema = z.object({
  template: z.literal("terms"),
  ...legalPageFields,
});
