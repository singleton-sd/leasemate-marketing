import { z } from "astro/zod";

import { draftField, pageSeo } from "./shared";

export const pricingPageSchema = pageSeo.extend({
  template: z.literal("pricing"),
  eyebrow: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  placeholder: z.literal(true),
  draft: draftField,
});
