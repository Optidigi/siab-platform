import { renderToString } from "react-dom/server"
import { Bar, BarChart } from "recharts"
import { describe, expect, it } from "vitest"
import { ClientOnlyChartContainer } from "@/components/analytics/ClientOnlyChartContainer"

describe("ClientOnlyChartContainer", () => {
  it("does not SSR Recharts inline style attributes", () => {
    const html = renderToString(
      <ClientOnlyChartContainer
        config={{ value: { label: "Value", color: "var(--chart-1)" } }}
        className="h-[260px] min-w-0 w-full"
      >
        <BarChart data={[{ name: "A", value: 1 }]}>
          <Bar dataKey="value" />
        </BarChart>
      </ClientOnlyChartContainer>
    )

    expect(html).toContain("data-chart-placeholder")
    expect(html).not.toContain("recharts-responsive-container")
    expect(html).not.toContain("style=")
  })
})
