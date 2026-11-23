import { draftCmsField, templateField, type CmsField } from "./cms.ts";

const legalCmsFields: CmsField[] = [
  {
    label: "Title",
    name: "title",
    widget: "string",
    hint: "Page title (browser tab / SEO).",
  },
  {
    label: "Description",
    name: "description",
    widget: "text",
    hint: "Short meta description for SEO.",
  },
  {
    label: "Updated",
    name: "updated",
    widget: "string",
    hint: "Visible last-updated line, including draft status.",
  },
  draftCmsField,
];

export const privacyPageCms = {
  file: "src/content/pages/privacy.md",
  label: "Privacy",
  name: "privacy",
  fields: [templateField("privacy"), ...legalCmsFields],
};

export const termsPageCms = {
  file: "src/content/pages/terms.md",
  label: "Terms",
  name: "terms",
  fields: [templateField("terms"), ...legalCmsFields],
};
