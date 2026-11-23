import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { contactPageSchema } from "./content/schemas/contact";
import { featuresPageSchema } from "./content/schemas/features";
import { homePageSchema } from "./content/schemas/home";
import { privacyPageSchema, termsPageSchema } from "./content/schemas/legal";
import { pricingPageSchema } from "./content/schemas/pricing";
import { waitlistPageSchema } from "./content/schemas/waitlist";

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.discriminatedUnion("template", [
    homePageSchema,
    featuresPageSchema,
    pricingPageSchema,
    contactPageSchema,
    waitlistPageSchema,
    privacyPageSchema,
    termsPageSchema,
  ]),
});

export const collections = { pages };
