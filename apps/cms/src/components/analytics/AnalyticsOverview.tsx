import { BarChart3, Eye, FileCheck2, Target } from "lucide-react"
import { StatCards } from "@/components/dashboard/StatCards"
import type { SiteAnalyticsOverview } from "@/lib/analytics/queries"

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`

export function AnalyticsOverview({ overview, labels }: {
  overview: SiteAnalyticsOverview
  labels: {
    visitors: string
    pageviews: string
    conversions: string
    conversionRate: string
    ctaClicks: string
    acceptedForms: string
  }
}) {
  return (
    <StatCards stats={[
      { label: labels.visitors, value: overview.visitors, icon: Eye },
      { label: labels.pageviews, value: overview.pageviews, icon: BarChart3 },
      { label: labels.conversions, value: overview.conversions, icon: Target },
      { label: labels.conversionRate, value: pct(overview.conversionRate), icon: FileCheck2 },
    ]} />
  )
}
