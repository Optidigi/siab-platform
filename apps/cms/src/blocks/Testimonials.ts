import { Quote } from "lucide-react"
import { truncate, type BlockWithMeta } from "./_summary"

export const Testimonials: BlockWithMeta = {
  slug: "testimonials",
  icon: Quote,
  description: "Customer testimonials",
  interfaceName: "TestimonialsBlock",
  fields: [
    { name: "title", type: "text" },
    { name: "items", type: "array", required: true, fields: [
      { name: "quote", type: "textarea", required: true },
      { name: "author", type: "text", required: true },
      { name: "role", type: "text" },
      { name: "avatar", type: "upload", relationTo: "media" }
    ]},
    { name: "anchor", type: "text", required: false,
      admin: {
        description: "Optional in-page anchor id (e.g. 'reviews'). Renders as <section id>.",
      }
    },
  ],
  summary: (v) => {
    const title = typeof v.title === "string" ? v.title.trim() : ""
    return title ? truncate(title, 40) : undefined
  },
}
