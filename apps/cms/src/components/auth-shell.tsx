import * as React from "react"

import { cn } from "@siteinabox/ui/lib/utils"
import { Card, CardContent } from "@siteinabox/ui/components/card"

type Props = React.ComponentProps<"div"> & {
  /**
   * Right-side media. Pass a logo, hero image, branding panel, or any JSX.
   * Hidden on phone (< md) — left column is the only thing visible there.
   * If omitted, the right column renders as an empty muted panel on desktop.
   */
  media?: React.ReactNode
}

/**
 * Two-column auth shell: form on the left, media (logo / image / branding)
 * on the right. Based on shadcn's two-column login block, but content-agnostic:
 * pass your own auth form as `children` and your own logo or image as
 * `media`. Stacks to a single column on phone widths.
 *
 * Usage:
 *   <AuthShell media={<img src="/branding/admin.svg" alt="" className="..." />}>
 *     <LoginForm />
 *   </AuthShell>
 */
export function AuthShell({ media, children, className, ...props }: Props) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="px-6 py-8 md:px-8 md:py-12">{children}</div>
          <div className="relative hidden bg-muted md:block">{media}</div>
        </CardContent>
      </Card>
    </div>
  )
}
