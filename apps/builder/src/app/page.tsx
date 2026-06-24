import { ArrowRight, CheckCircle2, PanelsTopLeft } from "lucide-react"

import { Badge } from "@siteinabox/ui/components/badge"
import { Button } from "@siteinabox/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@siteinabox/ui/components/card"
import { Input } from "@siteinabox/ui/components/input"
import { Label } from "@siteinabox/ui/components/label"
import { EmptyState } from "@siteinabox/ui/composites/empty-state"
import { PageHeader } from "@siteinabox/ui/composites/page-header"

export default function BuilderHome() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          beforeTitle={<Badge variant="secondary">Builder shell</Badge>}
          title="Site in a Box Builder"
          subtitle="Project intake workspace"
          action={
            <Button type="button" disabled>
              Continue
              <ArrowRight aria-hidden />
            </Button>
          }
        />

        <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Project placeholder</CardTitle>
              <CardDescription>
                Domain and project details will live here when the Builder
                workflow is implemented.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" placeholder="example.nl" />
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  Shared tokens loaded
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  Shared primitives rendered
                </span>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<PanelsTopLeft className="size-10 text-muted-foreground" aria-hidden />}
            title="No preview yet"
            description="Generated site previews will appear here in a later Builder phase."
            action={
              <Button type="button" variant="outline" disabled>
                Open preview
              </Button>
            }
          />
        </section>
      </div>
    </main>
  )
}
