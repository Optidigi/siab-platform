import { MousePointerClick } from "lucide-react"
import { validateSafeHref } from "@/lib/security/safeHref"
import { firstRichText, truncate, type BlockWithMeta } from "./_summary"

export const CTA: BlockWithMeta = {
  slug: "cta",
  icon: MousePointerClick,
  description: "Call-to-action with button",
  interfaceName: "CTABlock",
  fields: [
    { name: "eyebrow", type: "json",
      admin: {
        editor: "richTextInline",
        description: "Short script-font label above the headline."
      } as any
    },
    { name: "headline", type: "json",
      admin: {
        editor: "richTextInline",
        description: "Primary CTA heading."
      } as any
    },
    { name: "description", type: "json",
      admin: {
        editor: "richTextBlock",
        description: "Supporting text below the headline."
      } as any
    },
    { name: "primary", type: "group", fields: [
      { name: "label", type: "text" },
      { name: "href", type: "text", validate: validateSafeHref }
    ]},
    { name: "secondary", type: "group", fields: [
      { name: "label", type: "text" },
      { name: "href", type: "text", validate: validateSafeHref }
    ]},
    {
      name: "backgroundImage",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Optional decorative background image for quote-style CTA sections.",
      },
    },
    { name: "anchor", type: "text", required: false,
      admin: {
        description: "Optional in-page anchor id (e.g. 'contact'). Renders as <section id>.",
      }
    },
  ],
  summary: (v) => {
    const text = firstRichText(v.headline)
    return text ? truncate(text.trim(), 40) : undefined
  },
}
