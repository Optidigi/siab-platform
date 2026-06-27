import fs from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "packages/contracts/block-sources")
const retrievedAt = new Date().toISOString().slice(0, 10)

const tailwindPlusCategories = [
  ["heroes", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes"],
  ["feature-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/feature-sections"],
  ["cta-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/cta-sections"],
  ["bento-grids", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/bento-grids"],
  ["pricing", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/pricing"],
  ["header", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/header"],
  ["newsletter-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/newsletter-sections"],
  ["stats-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/stats-sections"],
  ["testimonials", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/testimonials"],
  ["blog-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/blog-sections"],
  ["contact-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/contact-sections"],
  ["team-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/team-sections"],
  ["content-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/content-sections"],
  ["logo-clouds", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/logo-clouds"],
  ["faq-sections", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/faq-sections"],
  ["footers", "https://tailwindcss.com/plus/ui-blocks/marketing/sections/footers"],
  ["element-headers", "https://tailwindcss.com/plus/ui-blocks/marketing/elements/headers"],
  ["element-banners", "https://tailwindcss.com/plus/ui-blocks/marketing/elements/banners"],
  ["element-flyout-menus", "https://tailwindcss.com/plus/ui-blocks/marketing/elements/flyout-menus"],
]

const hyperUiCategories = [
  "announcements",
  "banners",
  "blog-cards",
  "buttons",
  "cards",
  "contact-forms",
  "ctas",
  "faqs",
  "feature-grids",
  "footers",
  "headers",
  "logo-clouds",
  "newsletter",
  "pricing",
  "sections",
  "team-sections",
]

const prelineCategories = [
  "hero-sections",
  "hero-sliders",
  "hero-forms",
  "announcement-banners",
  "website-headers",
  "floating-headers",
  "team-sections",
  "testimonials",
  "testimonial-cards",
  "stats",
  "clients",
  "marquee",
  "feature-sections",
  "content-sections",
  "icon-blocks",
  "gallery-grids",
  "faq-sections",
  "contact-pages",
  "website-footers",
  "pricing-cards",
  "pricing-tables",
  "pricing-pages",
  "cta-sections",
]

const prelineFormsCategories = [
  "newsletter-signup-forms",
]

const mambaCategories = [
  "banner",
  "blog",
  "call-to-action",
  "contact",
  "faq",
  "feature",
  "footer",
  "gallery",
  "header",
  "hero",
  "pricing",
  "stats",
  "steps",
  "team",
  "testimonial",
  "timeline",
]

const tailblocksCategories = new Set([
  "blog",
  "contact",
  "content",
  "cta",
  "ecommerce",
  "feature",
  "footer",
  "gallery",
  "header",
  "hero",
  "pricing",
  "statistic",
  "step",
  "team",
  "testimonial",
])

function htmlDecode(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeText(file, text) {
  await ensureDir(path.dirname(file))
  await fs.writeFile(file, text)
}

async function writeJson(file, value) {
  await writeText(file, `${JSON.stringify(value, null, 2)}\n`)
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "siteinabox-block-source-archiver/1.0",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`)
  return await response.text()
}

function extractBalancedObject(text, start) {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === "\"") inString = false
      continue
    }
    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function extractTailwindPlusSubcategory(pageHtml) {
  const decoded = htmlDecode(pageHtml)
  const key = "\"subcategory\":"
  const keyIndex = decoded.indexOf(key)
  if (keyIndex < 0) throw new Error("Tailwind Plus page did not expose subcategory payload")
  const objectStart = decoded.indexOf("{", keyIndex + key.length)
  const objectText = extractBalancedObject(decoded, objectStart)
  if (!objectText) throw new Error("Tailwind Plus subcategory payload could not be parsed")
  return JSON.parse(objectText)
}

function sourceRelPath(...parts) {
  return path.posix.join("packages/contracts/block-sources", ...parts)
}

async function archiveTailwindPlus() {
  const entries = []
  for (const [category, url] of tailwindPlusCategories) {
    const page = await fetchText(url)
    const pageDir = path.join(OUT_DIR, "tailwind-plus/marketing", category)
    await writeText(path.join(pageDir, "page.html"), page)

    const subcategory = extractTailwindPlusSubcategory(page)
    const downloadable = subcategory.components.filter((component) => component.downloadable === true && component.snippet?.code)
    for (const component of downloadable) {
      const id = String(component.id)
      const componentDir = path.join(pageDir, id)
      const metadata = {
        sourceName: "Tailwind Plus",
        sourceUrl: `${url}#component-${id.replace(/-dark$/, "")}`,
        retrievalUrl: url,
        retrievedAt,
        licenseStatus: "Operator-approved free/downloadable Tailwind Plus component payload.",
        category,
        upstreamId: id,
        upstreamName: component.name,
        freeState: "downloadable",
        language: component.snippet.language,
        version: component.snippet.version,
        supportsDarkMode: component.snippet.supportsDarkMode,
        sourcePath: sourceRelPath("tailwind-plus/marketing", category, id, "snippet.html"),
      }
      await writeText(path.join(componentDir, "snippet.html"), component.snippet.code)
      await writeJson(path.join(componentDir, "metadata.json"), metadata)
      entries.push(metadata)
    }
  }
  await writeJson(path.join(OUT_DIR, "tailwind-plus/manifest.json"), {
    sourceName: "Tailwind Plus",
    retrievedAt,
    entries,
    counts: {
      categories: tailwindPlusCategories.length,
      downloadableComponents: entries.length,
    },
  })
  return entries.length
}

function uniqueMatches(text, regex) {
  return [...new Set([...text.matchAll(regex)].map((match) => match[1] ?? match[0]))]
}

async function archiveHyperUi() {
  const entries = []
  for (const category of hyperUiCategories) {
    const url = `https://hyperui.dev/components/marketing/${category}`
    let page
    try {
      page = await fetchText(url)
    } catch {
      continue
    }
    const pageDir = path.join(OUT_DIR, "hyperui/marketing", category)
    await writeText(path.join(pageDir, "page.html"), page)
    const examplePaths = uniqueMatches(page, /["'](\/examples\/marketing\/[^"']+?\.html)["']/g)
    for (const examplePath of examplePaths) {
      const exampleUrl = new URL(examplePath, url).toString()
      let exampleHtml
      try {
        exampleHtml = await fetchText(exampleUrl)
      } catch {
        continue
      }
      const id = slugify(examplePath.replace(/^\/examples\/marketing\//, "").replace(/\.html$/, ""))
      const componentDir = path.join(pageDir, id)
      const metadata = {
        sourceName: "HyperUI",
        sourceUrl: url,
        retrievalUrl: exampleUrl,
        retrievedAt,
        licenseStatus: "MIT licensed public component example.",
        category,
        upstreamId: id,
        upstreamName: id,
        freeState: "free-public",
        sourcePath: sourceRelPath("hyperui/marketing", category, id, "example.html"),
      }
      await writeText(path.join(componentDir, "example.html"), exampleHtml)
      await writeJson(path.join(componentDir, "metadata.json"), metadata)
      entries.push(metadata)
    }
  }
  await writeJson(path.join(OUT_DIR, "hyperui/manifest.json"), {
    sourceName: "HyperUI",
    retrievedAt,
    entries,
    counts: {
      categories: hyperUiCategories.length,
      examples: entries.length,
    },
  })
  return entries.length
}

async function archivePreline() {
  const entries = []
  const pages = [
    ...prelineCategories.map((category) => ({ group: "marketing", category, url: `https://preline.co/blocks/marketing/${category}/` })),
    ...prelineFormsCategories.map((category) => ({ group: "forms", category, url: `https://preline.co/blocks/forms/${category}/` })),
  ]
  for (const { group, category, url } of pages) {
    let page
    try {
      page = await fetchText(url)
    } catch {
      continue
    }
    const pageDir = path.join(OUT_DIR, "preline", group, category)
    await writeText(path.join(pageDir, "page.html"), page)
    const iframePaths = [
      ...uniqueMatches(page, /["'](\/blocks\/(?:marketing|forms)\/[^"']*?\/iframes\/free\/[^"']+?\.html)["']/g),
      ...uniqueMatches(page, /["']((?:\.\.\/)+blocks\/(?:marketing|forms)\/[^"']*?\/iframes\/free\/[^"']+?\.html)["']/g),
      ...uniqueMatches(page, /["'](iframes\/free\/[^"']+?\.html)["']/g),
    ]
    for (const iframePath of iframePaths) {
      const iframeUrl = new URL(iframePath, url).toString()
      let iframeHtml
      try {
        iframeHtml = await fetchText(iframeUrl)
      } catch {
        continue
      }
      const id = slugify(iframePath.split("/").pop().replace(/\.html$/, ""))
      const componentDir = path.join(pageDir, id)
      const metadata = {
        sourceName: "Preline UI",
        sourceUrl: url,
        retrievalUrl: iframeUrl,
        retrievedAt,
        licenseStatus: "Public Preline Free block iframe/source payload.",
        category,
        group,
        upstreamId: id,
        upstreamName: id,
        freeState: "free",
        sourcePath: sourceRelPath("preline", group, category, id, "iframe.html"),
      }
      await writeText(path.join(componentDir, "iframe.html"), iframeHtml)
      await writeJson(path.join(componentDir, "metadata.json"), metadata)
      entries.push(metadata)
    }
  }
  await writeJson(path.join(OUT_DIR, "preline/manifest.json"), {
    sourceName: "Preline UI",
    retrievedAt,
    entries,
    counts: {
      categories: pages.length,
      freeIframes: entries.length,
    },
  })
  return entries.length
}

async function archiveTailblocks() {
  const treeUrl = "https://api.github.com/repos/mertJF/tailblocks/git/trees/master?recursive=1"
  const tree = JSON.parse(await fetchText(treeUrl, { headers: { accept: "application/vnd.github+json" } }))
  const files = tree.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .filter((filePath) => {
      const match = filePath.match(/^src\/blocks\/([^/]+)\//)
      return match && tailblocksCategories.has(match[1]) && /\.(js|jsx|ts|tsx|html)$/.test(filePath)
    })

  const entries = []
  for (const filePath of files) {
    const rawUrl = `https://raw.githubusercontent.com/mertJF/tailblocks/master/${filePath}`
    let source
    try {
      source = await fetchText(rawUrl)
    } catch {
      continue
    }
    const archivePath = path.join(OUT_DIR, "tailblocks/repo-snapshot", filePath)
    await writeText(archivePath, source)
    const category = filePath.split("/")[2]
    entries.push({
      sourceName: "Tailblocks",
      sourceUrl: `https://github.com/mertJF/tailblocks/blob/master/${filePath}`,
      retrievalUrl: rawUrl,
      retrievedAt,
      licenseStatus: "MIT licensed public repository.",
      category,
      upstreamId: filePath,
      upstreamName: filePath,
      freeState: "free-public",
      sourcePath: sourceRelPath("tailblocks/repo-snapshot", filePath),
    })
  }
  await writeJson(path.join(OUT_DIR, "tailblocks/manifest.json"), {
    sourceName: "Tailblocks",
    retrievedAt,
    entries,
    counts: {
      categories: tailblocksCategories.size,
      files: entries.length,
    },
  })
  return entries.length
}

async function archiveMambaUi() {
  const entries = []
  for (const category of mambaCategories) {
    const url = `https://mambaui.com/components/${category}`
    let page
    try {
      page = await fetchText(url)
    } catch {
      continue
    }
    const pageDir = path.join(OUT_DIR, "mambaui/components", category)
    const metadata = {
      sourceName: "Mamba UI",
      sourceUrl: url,
      retrievalUrl: url,
      retrievedAt,
      licenseStatus: "Public Mamba UI component page; operator-approved source reference.",
      category,
      upstreamId: category,
      upstreamName: category,
      freeState: "free-public",
      sourcePath: sourceRelPath("mambaui/components", category, "page.html"),
    }
    await writeText(path.join(pageDir, "page.html"), page)
    await writeJson(path.join(pageDir, "metadata.json"), metadata)
    entries.push(metadata)
  }
  await writeJson(path.join(OUT_DIR, "mambaui/manifest.json"), {
    sourceName: "Mamba UI",
    retrievedAt,
    entries,
    counts: {
      categories: mambaCategories.length,
      pages: entries.length,
    },
  })
  return entries.length
}

async function main() {
  await ensureDir(OUT_DIR)
  const counts = {
    tailwindPlus: await archiveTailwindPlus(),
    hyperUi: await archiveHyperUi(),
    preline: await archivePreline(),
    tailblocks: await archiveTailblocks(),
    mambaUi: await archiveMambaUi(),
  }
  await writeJson(path.join(OUT_DIR, "manifest.json"), {
    retrievedAt,
    sources: counts,
    notes: [
      "Tailwind Plus archives only components with downloadable=true in public page payloads.",
      "External source archives are raw upstream artifacts; SIAB renderer contracts remain structured data only.",
    ],
  })
  console.log(counts)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
