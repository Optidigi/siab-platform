"use client"
import * as React from "react"
import {
  SITE_GENERATION_BLOCK_CATALOG_BY_SLUG,
  SITE_GENERATION_BLOCK_SLUGS,
  type SiteBlockCatalogVariant,
  type SiteGenerationBlockSlug,
} from "@siteinabox/contracts"
import { InlineCtaButton } from "../inline/InlineCtaButton"
import { InlineIcon } from "../inline/InlineIcon"
import { InlineImage } from "../inline/InlineImage"
import { RtSlot } from "../inline/RtSlot"
import type { CanvasBlockRendererProps } from "@/components/editor/canvas/CanvasBlockRenderer"

const generationBlockSlugs = new Set<string>(SITE_GENERATION_BLOCK_SLUGS)

function resolvedSourceVariant(block: any): SiteBlockCatalogVariant | undefined {
  if (!generationBlockSlugs.has(block?.blockType)) return undefined
  const catalog = SITE_GENERATION_BLOCK_CATALOG_BY_SLUG[block.blockType as SiteGenerationBlockSlug]
  const variant = typeof block.variant === "string" ? block.variant.trim() : ""
  const sectionVariant = typeof block.analytics?.sectionVariant === "string" ? block.analytics.sectionVariant.trim() : ""
  const match = (catalog.variants as readonly SiteBlockCatalogVariant[]).find((entry) =>
    variant ? entry.variant === variant : entry.sectionVariant === sectionVariant
  )
  return match
}

function sourceVariantDataAttribute(block: any) {
  return resolvedSourceVariant(block)?.variant
}

function sourceVariantClassName(block: any) {
  return resolvedSourceVariant(block)?.rendererClassName ?? ""
}

const setField = (block: any, onUpdate: (next: any) => void) => (field: string) => (value: any) =>
  onUpdate({ ...block, [field]: value })

const setArrayItemField = (
  block: any,
  onUpdate: (next: any) => void,
  field: string,
  index: number,
  subField: string,
) => (value: any) => {
  const next = [...(block[field] ?? [])]
  next[index] = { ...(next[index] ?? {}), [subField]: value }
  onUpdate({ ...block, [field]: next })
}

export const MediaHeroCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const minHeight = block.minHeight ?? "standard"
  const align = block.contentAlign ?? "left"
  const width = block.contentWidth ?? "narrow"

  return (
    <section
      id={block.anchor || undefined}
      className={`cms-block cms-block--mediaHero cms-block--mediaHero-${minHeight} cms-block--mediaHero-align-${align} cms-block--mediaHero-width-${width} ${sourceVariantClassName(block)}`.trim()}
      data-source-variant={sourceVariantDataAttribute(block)}
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      data-shape-top={block.shapeDividers?.top || undefined}
      data-shape-bottom={block.shapeDividers?.bottom || undefined}
      onClick={onActivate}
    >
      <InlineImage
        value={block.backgroundImage}
        onChange={set("backgroundImage")}
        className="cms-block__mediaHero-bg"
        chrome="overlay"
        openOnImageClick={false}
        elementPath={{ blockIndex: idx, field: "backgroundImage" }}
      />
      <div className="cms-block__mediaHero-scrim" aria-hidden="true" />
      <div className="cms-block__mediaHero-content">
        <div className="cms-block__eyebrow">
          <RtSlot
            as="span"
            variant="inline"
            manifest={manifest}
            value={block.eyebrow}
            onChange={set("eyebrow")}
            placeholder="Eyebrow"
            elementPath={{ blockIndex: idx, field: "eyebrow" }}
          />
        </div>
        <RtSlot
          as="h1"
          variant="inline"
          manifest={manifest}
          value={block.headline}
          onChange={set("headline")}
          className="cms-block__title"
          placeholder="Headline"
          elementPath={{ blockIndex: idx, field: "headline" }}
        />
        <RtSlot
          as="div"
          variant="block"
          manifest={manifest}
          value={block.subheadline}
          onChange={set("subheadline")}
          className="cms-block__subheadline"
          placeholder="Supporting text"
          elementPath={{ blockIndex: idx, field: "subheadline" }}
        />
        <div className="cms-block__actions">
          <InlineCtaButton
            value={block.cta}
            onChange={set("cta")}
            className="cms-block__primary"
            emptyLabel="Primary action"
            elementPath={{ blockIndex: idx, field: "cta" }}
          />
          <InlineCtaButton
            value={block.secondary}
            onChange={set("secondary")}
            className="cms-block__secondary cms-block__secondary--ghost"
            emptyLabel="Secondary action"
            elementPath={{ blockIndex: idx, field: "secondary" }}
          />
        </div>
      </div>
      {block.foregroundImage ? (
        <figure className="cms-block__mediaHero-foreground">
          <InlineImage
            value={block.foregroundImage}
            onChange={set("foregroundImage")}
            chrome="overlay"
            elementPath={{ blockIndex: idx, field: "foregroundImage" }}
          />
        </figure>
      ) : null}
    </section>
  )
}

export const InfoCardListCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const layout = block.layout ?? "grid"
  const iconPosition = block.iconPosition ?? "top"
  const items: any[] = block.items ?? []

  return (
    <section
      id={block.anchor || undefined}
      className={`cms-block cms-block--infoCardList cms-block--infoCardList-${layout} cms-block--infoCardList-icon-${iconPosition} ${sourceVariantClassName(block)}`.trim()}
      data-source-variant={sourceVariantDataAttribute(block)}
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      onClick={onActivate}
    >
      <RtSlot
        as="h2"
        variant="inline"
        manifest={manifest}
        value={block.title}
        onChange={set("title")}
        className="cms-block__title"
        placeholder="Section title"
        elementPath={{ blockIndex: idx, field: "title" }}
      />
      <RtSlot
        as="div"
        variant="block"
        manifest={manifest}
        value={block.intro}
        onChange={set("intro")}
        className="cms-block__intro"
        placeholder="Intro"
        elementPath={{ blockIndex: idx, field: "intro" }}
      />
      <ul className="cms-block__infoCards">
        {items.map((item, i) => (
          <li key={item.id ?? i} className="cms-block__infoCard" data-animation={item.animation && item.animation !== "none" ? item.animation : undefined}>
            <span className="cms-block__infoCard-media">
              {item.image ? (
                <InlineImage
                  value={item.image}
                  onChange={setArrayItemField(block, onUpdate, "items", i, "image")}
                  chrome="overlay"
                  elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "image" }}
                />
              ) : (
                <InlineIcon
                  value={item.icon}
                  onChange={setArrayItemField(block, onUpdate, "items", i, "icon")}
                  elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "icon" }}
                />
              )}
            </span>
            <span className="cms-block__infoCard-body">
              <RtSlot
                as="strong"
                variant="inline"
                manifest={manifest}
                value={item.title}
                onChange={setArrayItemField(block, onUpdate, "items", i, "title")}
                className="cms-block__infoCard-title"
                placeholder="Card title"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "title" }}
              />
              <RtSlot
                as="span"
                variant="block"
                manifest={manifest}
                value={item.description}
                onChange={setArrayItemField(block, onUpdate, "items", i, "description")}
                className="cms-block__infoCard-description"
                placeholder="Card description"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "description" }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const ServiceCarouselCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const layout = block.layout ?? "carousel"
  const carousel = block.carousel ?? {}
  const items: any[] = block.items ?? []

  return (
    <section
      id={block.anchor || undefined}
      className={`cms-block cms-block--serviceCarousel cms-block--serviceCarousel-${layout} ${sourceVariantClassName(block)}`.trim()}
      data-source-variant={sourceVariantDataAttribute(block)}
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      data-autoplay={carousel.autoplay ? "true" : undefined}
      data-loop={carousel.loop ? "true" : undefined}
      data-siab-service-carousel={layout === "carousel" ? "true" : undefined}
      onClick={onActivate}
    >
      <RtSlot
        as="h2"
        variant="inline"
        manifest={manifest}
        value={block.title}
        onChange={set("title")}
        className="cms-block__title"
        placeholder="Section title"
        elementPath={{ blockIndex: idx, field: "title" }}
      />
      <RtSlot
        as="div"
        variant="block"
        manifest={manifest}
        value={block.intro}
        onChange={set("intro")}
        className="cms-block__intro"
        placeholder="Intro"
        elementPath={{ blockIndex: idx, field: "intro" }}
      />
      <div className="cms-block__serviceTrack" data-pagination={carousel.pagination ?? "none"} data-siab-service-track="true">
        {items.map((item, i) => (
          <article key={item.id ?? i} className="cms-block__serviceCard">
            <InlineImage
              value={item.image}
              onChange={setArrayItemField(block, onUpdate, "items", i, "image")}
              className="cms-block__serviceImage"
              chrome="overlay"
              elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "image" }}
            />
            <div className="cms-block__serviceBody">
              <RtSlot
                as="h3"
                variant="inline"
                manifest={manifest}
                value={item.title}
                onChange={setArrayItemField(block, onUpdate, "items", i, "title")}
                className="cms-block__serviceTitle"
                placeholder="Service title"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "title" }}
              />
              <RtSlot
                as="div"
                variant="block"
                manifest={manifest}
                value={item.description}
                onChange={setArrayItemField(block, onUpdate, "items", i, "description")}
                className="cms-block__serviceDescription"
                placeholder="Service description"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "description" }}
              />
              <InlineCtaButton
                value={item.cta}
                onChange={setArrayItemField(block, onUpdate, "items", i, "cta")}
                className="cms-block__serviceCta"
                emptyLabel="Service action"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "cta" }}
              />
            </div>
          </article>
        ))}
      </div>
      {layout === "carousel" && carousel.pagination && carousel.pagination !== "none" ? (
        <div className="cms-block__servicePagination" aria-hidden="true">
          {carousel.pagination === "fraction"
            ? <span>1 / {items.length}</span>
            : items.map((_, i) => <span key={i} className={i === 0 ? "is-active" : undefined} />)}
        </div>
      ) : null}
    </section>
  )
}

export const BeforeAfterGalleryCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const pairs: any[] = block.pairs ?? []

  return (
    <section
      id={block.anchor || undefined}
      className={`cms-block cms-block--beforeAfterGallery ${sourceVariantClassName(block)}`.trim()}
      data-source-variant={sourceVariantDataAttribute(block)}
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      onClick={onActivate}
    >
      <RtSlot
        as="h2"
        variant="inline"
        manifest={manifest}
        value={block.title}
        onChange={set("title")}
        className="cms-block__title"
        placeholder="Section title"
        elementPath={{ blockIndex: idx, field: "title" }}
      />
      <RtSlot
        as="div"
        variant="block"
        manifest={manifest}
        value={block.intro}
        onChange={set("intro")}
        className="cms-block__intro"
        placeholder="Intro"
        elementPath={{ blockIndex: idx, field: "intro" }}
      />
      <div className="cms-block__comparisonGrid">
        {pairs.map((pair, i) => {
          const ratio = Math.max(5, Math.min(95, Math.round((pair.initialRatio ?? 0.5) * 100)))
          const orientation = pair.orientation ?? "horizontal"
          return (
            <figure
              key={pair.id ?? i}
              className={`cms-block__comparison cms-block__comparison-${orientation}`}
              data-siab-before-after-pair="true"
              data-initial-ratio={ratio}
              data-orientation={orientation}
            >
              <div className="cms-block__comparisonFrame">
                <InlineImage
                  value={pair.before}
                  onChange={setArrayItemField(block, onUpdate, "pairs", i, "before")}
                  className="cms-block__comparisonImage"
                  chrome="overlay"
                  elementPath={{ blockIndex: idx, field: "pairs", itemIndex: i, subField: "before" }}
                />
                <div className="cms-block__comparisonAfter" aria-hidden="true">
                  <InlineImage
                    value={pair.after}
                    onChange={setArrayItemField(block, onUpdate, "pairs", i, "after")}
                    chrome="overlay"
                    elementPath={{ blockIndex: idx, field: "pairs", itemIndex: i, subField: "after" }}
                  />
                </div>
                <span className="cms-block__comparisonLabel cms-block__comparisonLabel-before">{pair.beforeLabel ?? "Before"}</span>
                <span className="cms-block__comparisonLabel cms-block__comparisonLabel-after">{pair.afterLabel ?? "After"}</span>
                <span className="cms-block__comparisonHandle" aria-hidden="true" />
              </div>
              <RtSlot
                as="figcaption"
                variant="block"
                manifest={manifest}
                value={pair.caption}
                onChange={setArrayItemField(block, onUpdate, "pairs", i, "caption")}
                className="cms-block__comparisonCaption"
                placeholder="Caption"
                elementPath={{ blockIndex: idx, field: "pairs", itemIndex: i, subField: "caption" }}
              />
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export const ContactDetailsCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const layout = block.layout ?? "cards"
  const items: any[] = block.items ?? []
  const legal = block.legal ?? {}

  return (
    <section
      id={block.anchor || undefined}
      className={`cms-block cms-block--contactDetails cms-block--contactDetails-${layout} ${sourceVariantClassName(block)}`.trim()}
      data-source-variant={sourceVariantDataAttribute(block)}
      data-block-index={block.__index ?? undefined}
      data-active={isActive || undefined}
      onClick={onActivate}
    >
      <RtSlot
        as="h2"
        variant="inline"
        manifest={manifest}
        value={block.title}
        onChange={set("title")}
        className="cms-block__title"
        placeholder="Section title"
        elementPath={{ blockIndex: idx, field: "title" }}
      />
      <RtSlot
        as="div"
        variant="block"
        manifest={manifest}
        value={block.intro}
        onChange={set("intro")}
        className="cms-block__intro"
        placeholder="Intro"
        elementPath={{ blockIndex: idx, field: "intro" }}
      />
      <dl className="cms-block__contactDetailsList">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="cms-block__contactDetailsItem" data-kind={item.kind || undefined}>
            <span className="cms-block__contactDetailsIcon">
              {item.image ? (
                <InlineImage
                  value={item.image}
                  onChange={setArrayItemField(block, onUpdate, "items", i, "image")}
                  chrome="overlay"
                  elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "image" }}
                />
              ) : (
                <InlineIcon
                  value={item.icon ?? item.kind}
                  onChange={setArrayItemField(block, onUpdate, "items", i, "icon")}
                  elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "icon" }}
                />
              )}
            </span>
            <dt>{item.label}</dt>
            <dd>
              <RtSlot
                as="span"
                variant="block"
                manifest={manifest}
                value={item.value}
                onChange={setArrayItemField(block, onUpdate, "items", i, "value")}
                className="cms-block__contactDetailsValue"
                placeholder="Contact value"
                elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "value" }}
              />
            </dd>
          </div>
        ))}
        {legal.kvkNumber ? <LegalDetail label="KVK" value={legal.kvkNumber} /> : null}
        {legal.btwId ? <LegalDetail label="BTW" value={legal.btwId} /> : null}
        {legal.iban ? <LegalDetail label="IBAN" value={legal.iban} /> : null}
        {legal.bic ? <LegalDetail label="BIC" value={legal.bic} /> : null}
      </dl>
    </section>
  )
}

function LegalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="cms-block__contactDetailsItem" data-kind="legal">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

const valueText = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value == null) return "—"
  return String(value)
}

export const PricingCanvas: React.FC<CanvasBlockRendererProps> = ({
  block,
  isActive,
  manifest,
  onActivate,
  onUpdate,
}) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const plans: any[] = block.plans ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--pricing ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Pricing title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <div className="cms-block__pricingPlans">
        {plans.map((plan, i) => (
          <article key={plan.id ?? i} className="cms-block__pricingPlan" data-highlighted={plan.highlighted ? "true" : undefined}>
            {plan.badge ? <span className="cms-block__badge">{plan.badge}</span> : null}
            <RtSlot as="h3" variant="inline" manifest={manifest} value={plan.title} onChange={setArrayItemField(block, onUpdate, "plans", i, "title")} className="cms-block__pricingTitle" placeholder="Plan title" elementPath={{ blockIndex: idx, field: "plans", itemIndex: i, subField: "title" }} />
            <RtSlot as="div" variant="block" manifest={manifest} value={plan.description} onChange={setArrayItemField(block, onUpdate, "plans", i, "description")} className="cms-block__pricingDescription" placeholder="Plan description" elementPath={{ blockIndex: idx, field: "plans", itemIndex: i, subField: "description" }} />
            <p className="cms-block__pricingPrice">{plan.price ?? "Price"} {plan.period ? <span>{plan.period}</span> : null}</p>
            <ul className="cms-block__pricingFeatures">
              {(plan.features ?? []).map((feature: any, featureIndex: number) => (
                <li key={feature.id ?? featureIndex} data-included={feature.included === false ? "false" : "true"}>
                  <RtSlot as="span" variant="inline" manifest={manifest} value={feature.label} onChange={(value) => {
                    const nextPlans = [...plans]
                    const nextFeatures = [...(nextPlans[i]?.features ?? [])]
                    nextFeatures[featureIndex] = { ...(nextFeatures[featureIndex] ?? {}), label: value }
                    nextPlans[i] = { ...(nextPlans[i] ?? {}), features: nextFeatures }
                    onUpdate({ ...block, plans: nextPlans })
                  }} placeholder="Feature" elementPath={{ blockIndex: idx, field: "plans", itemIndex: i, subField: "features" }} />
                </li>
              ))}
            </ul>
            <InlineCtaButton value={plan.cta} onChange={setArrayItemField(block, onUpdate, "plans", i, "cta")} className="cms-block__pricingCta" emptyLabel="Plan action" elementPath={{ blockIndex: idx, field: "plans", itemIndex: i, subField: "cta" }} />
          </article>
        ))}
      </div>
    </section>
  )
}

export const StatsCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const items: any[] = block.items ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--stats ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Stats title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <dl className="cms-block__statsGrid">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="cms-block__stat">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            <RtSlot as="div" variant="block" manifest={manifest} value={item.description} onChange={setArrayItemField(block, onUpdate, "items", i, "description")} className="cms-block__statDescription" placeholder="Description" elementPath={{ blockIndex: idx, field: "items", itemIndex: i, subField: "description" }} />
          </div>
        ))}
      </dl>
    </section>
  )
}

export const LogoCloudCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const logos: any[] = block.logos ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--logoCloud ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Logo cloud title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <ul className="cms-block__logoCloudList">
        {logos.map((logo, i) => (
          <li key={logo.id ?? i} className="cms-block__logoCloudItem">
            <InlineImage value={logo.image} onChange={setArrayItemField(block, onUpdate, "logos", i, "image")} chrome="overlay" elementPath={{ blockIndex: idx, field: "logos", itemIndex: i, subField: "image" }} />
            <span>{logo.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const GalleryCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const images: any[] = block.images ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--gallery ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Gallery title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <div className="cms-block__galleryGrid">
        {images.map((item, i) => (
          <figure key={item.id ?? i} className="cms-block__galleryItem">
            <InlineImage value={item.image} onChange={setArrayItemField(block, onUpdate, "images", i, "image")} chrome="overlay" elementPath={{ blockIndex: idx, field: "images", itemIndex: i, subField: "image" }} />
            <RtSlot as="figcaption" variant="block" manifest={manifest} value={item.caption} onChange={setArrayItemField(block, onUpdate, "images", i, "caption")} className="cms-block__galleryCaption" placeholder="Caption" elementPath={{ blockIndex: idx, field: "images", itemIndex: i, subField: "caption" }} />
          </figure>
        ))}
      </div>
      <InlineCtaButton value={block.cta} onChange={set("cta")} className="cms-block__galleryCta" emptyLabel="Gallery action" elementPath={{ blockIndex: idx, field: "cta" }} />
    </section>
  )
}

export const TeamCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const members: any[] = block.members ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--team ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Team title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <div className="cms-block__teamGrid">
        {members.map((member, i) => (
          <article key={member.id ?? i} className="cms-block__teamMember">
            <InlineImage value={member.image} onChange={setArrayItemField(block, onUpdate, "members", i, "image")} chrome="overlay" elementPath={{ blockIndex: idx, field: "members", itemIndex: i, subField: "image" }} />
            <h3>{member.name}</h3>
            {member.role ? <p className="cms-block__teamRole">{member.role}</p> : null}
            <RtSlot as="div" variant="block" manifest={manifest} value={member.bio} onChange={setArrayItemField(block, onUpdate, "members", i, "bio")} className="cms-block__teamBio" placeholder="Bio" elementPath={{ blockIndex: idx, field: "members", itemIndex: i, subField: "bio" }} />
          </article>
        ))}
      </div>
    </section>
  )
}

export const BlogCardsCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const posts: any[] = block.posts ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--blogCards ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Posts title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <div className="cms-block__blogGrid">
        {posts.map((post, i) => (
          <article key={post.id ?? i} className="cms-block__blogCard">
            <InlineImage value={post.image} onChange={setArrayItemField(block, onUpdate, "posts", i, "image")} chrome="overlay" elementPath={{ blockIndex: idx, field: "posts", itemIndex: i, subField: "image" }} />
            <RtSlot as="h3" variant="inline" manifest={manifest} value={post.title} onChange={setArrayItemField(block, onUpdate, "posts", i, "title")} className="cms-block__blogTitle" placeholder="Post title" elementPath={{ blockIndex: idx, field: "posts", itemIndex: i, subField: "title" }} />
            <RtSlot as="div" variant="block" manifest={manifest} value={post.excerpt} onChange={setArrayItemField(block, onUpdate, "posts", i, "excerpt")} className="cms-block__blogExcerpt" placeholder="Excerpt" elementPath={{ blockIndex: idx, field: "posts", itemIndex: i, subField: "excerpt" }} />
            <InlineCtaButton value={post.cta ?? { label: "Read more", href: post.href }} onChange={setArrayItemField(block, onUpdate, "posts", i, "cta")} className="cms-block__blogCta" emptyLabel="Post action" elementPath={{ blockIndex: idx, field: "posts", itemIndex: i, subField: "cta" }} />
          </article>
        ))}
      </div>
    </section>
  )
}

export const ProcessStepsCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const steps: any[] = block.steps ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--processSteps ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Process title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <ol className="cms-block__steps">
        {steps.map((step, i) => (
          <li key={step.id ?? i} className="cms-block__step">
            {step.image ? <InlineImage value={step.image} onChange={setArrayItemField(block, onUpdate, "steps", i, "image")} chrome="overlay" elementPath={{ blockIndex: idx, field: "steps", itemIndex: i, subField: "image" }} /> : <InlineIcon value={step.icon} onChange={setArrayItemField(block, onUpdate, "steps", i, "icon")} elementPath={{ blockIndex: idx, field: "steps", itemIndex: i, subField: "icon" }} />}
            <RtSlot as="h3" variant="inline" manifest={manifest} value={step.title} onChange={setArrayItemField(block, onUpdate, "steps", i, "title")} className="cms-block__stepTitle" placeholder="Step title" elementPath={{ blockIndex: idx, field: "steps", itemIndex: i, subField: "title" }} />
            <RtSlot as="div" variant="block" manifest={manifest} value={step.description} onChange={setArrayItemField(block, onUpdate, "steps", i, "description")} className="cms-block__stepDescription" placeholder="Step description" elementPath={{ blockIndex: idx, field: "steps", itemIndex: i, subField: "description" }} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export const ComparisonCanvas: React.FC<CanvasBlockRendererProps> = ({ block, isActive, manifest, onActivate, onUpdate }) => {
  const set = setField(block, onUpdate)
  const idx = block.__index as number
  const columns: any[] = block.columns ?? []
  const rows: any[] = block.rows ?? []

  return (
    <section id={block.anchor || undefined} className={`cms-block cms-block--comparisonMatrix ${sourceVariantClassName(block)}`.trim()} data-source-variant={sourceVariantDataAttribute(block)} data-block-index={block.__index ?? undefined} data-active={isActive || undefined} onClick={onActivate}>
      <RtSlot as="h2" variant="inline" manifest={manifest} value={block.title} onChange={set("title")} className="cms-block__title" placeholder="Comparison title" elementPath={{ blockIndex: idx, field: "title" }} />
      <RtSlot as="div" variant="block" manifest={manifest} value={block.intro} onChange={set("intro")} className="cms-block__intro" placeholder="Intro" elementPath={{ blockIndex: idx, field: "intro" }} />
      <div className="cms-block__comparisonTable" role="table">
        <div className="cms-block__comparisonHeader" role="row">
          <span role="columnheader">Feature</span>
          {columns.map((column, i) => (
            <span key={column.id ?? i} role="columnheader">
              <RtSlot as="strong" variant="inline" manifest={manifest} value={column.title} onChange={setArrayItemField(block, onUpdate, "columns", i, "title")} placeholder="Column title" elementPath={{ blockIndex: idx, field: "columns", itemIndex: i, subField: "title" }} />
            </span>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={row.id ?? i} className="cms-block__comparisonRow" role="row">
            <span role="rowheader">{row.label}</span>
            {(row.values ?? []).map((value: unknown, valueIndex: number) => <span key={valueIndex} role="cell">{valueText(value)}</span>)}
          </div>
        ))}
      </div>
    </section>
  )
}
