import { z } from "astro/zod";

import { draftField, featureItem, pageSeo } from "./shared";

export const featuresPageSchema = pageSeo.extend({
  template: z.literal("features"),
  eyebrow: z.string().min(1).optional(),
  features: z.array(featureItem).min(1),
  draft: draftField,
});
