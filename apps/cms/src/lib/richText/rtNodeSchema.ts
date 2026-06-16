import { z } from "zod"

const markSchema = z.enum(["bold", "italic", "underline", "code", "strikethrough"])

const hrefSchema = z.string().refine((s) => {
  if (s.startsWith("/")) return true
  try {
    const u = new URL(s)
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol)
  } catch {
    return false
  }
}, { message: "href must be http(s), mailto:, tel:, or a relative /-path" })

const textSchema = z.object({
  t: z.literal("text"),
  v: z.string(),
  marks: z.array(markSchema).optional(),
  style: z.string().optional(),
  color: z.string().optional(),
  font: z.string().optional(),
})

const lineBreakSchema = z.object({ t: z.literal("linebreak") })

const linkSchema: z.ZodType<unknown> = z.object({
  t: z.literal("link"),
  href: hrefSchema,
  rel: z.enum(["external", "internal"]).optional(),
  children: z.lazy(() => z.array(z.union([textSchema, linkSchema, lineBreakSchema]))),
})

const inlineSchema = z.union([textSchema, linkSchema, lineBreakSchema])

const alignSchema = z.enum(["left", "center", "right", "justify"]).optional()
const paragraphSchema   = z.object({ t: z.literal("paragraph"), align: alignSchema, style: z.string().optional(), children: z.array(inlineSchema) })
const headingSchema     = z.object({ t: z.literal("heading"), level: z.union([z.literal(2), z.literal(3), z.literal(4)]), align: alignSchema, style: z.string().optional(), children: z.array(inlineSchema) })
const listItemSchema: z.ZodType<unknown> = z.object({
  t: z.literal("listItem"),
  children: z.lazy(() => z.array(blockSchema)),
})
const listSchema        = z.object({ t: z.literal("list"), ordered: z.boolean(), items: z.array(listItemSchema) })
const blockquoteSchema: z.ZodType<unknown> = z.object({
  t: z.literal("blockquote"),
  children: z.lazy(() => z.array(blockSchema)),
})
const dividerSchema     = z.object({ t: z.literal("divider") })
const themedSchema: z.ZodType<unknown> = z.object({
  t: z.literal("themed"),
  id: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
  children: z.lazy(() => z.array(blockSchema)).optional(),
})

const blockSchema: z.ZodType<unknown> = z.union([
  paragraphSchema, headingSchema, listSchema, blockquoteSchema, dividerSchema, themedSchema
])

const blockRootSchema  = z.object({ t: z.literal("root"), variant: z.literal("block"),  children: z.array(blockSchema) })
const inlineRootSchema = z.object({ t: z.literal("root"), variant: z.literal("inline"), children: z.array(inlineSchema) })

export const rtRootSchema = z.union([blockRootSchema, inlineRootSchema])
export type RtRootParsed = z.infer<typeof rtRootSchema>
