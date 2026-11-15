import { draftCmsField, seoCmsFields, templateField } from "./cms.ts";

export const pricingPageCms = {
  file: "src/content/pages/pricing.md",
  label: "Pricing",
  name: "pricing",
  fields: [
    templateField("pricing"),
    ...seoCmsFields,
    { label: "Eyebrow", name: "eyebrow", widget: "string", required: false },
    { label: "Note", name: "note", widget: "text", required: false },
    {
      label: "Placeholder",
      name: "placeholder",
      widget: "hidden",
      default: true,
    },
    draftCmsField,
  ],
};
