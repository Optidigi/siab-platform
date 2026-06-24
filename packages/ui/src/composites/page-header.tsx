import type { ReactNode } from "react"

import { cn } from "../lib/utils"

type PageHeaderProps = {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  /**
   * Optional content rendered above the title, such as context pills,
   * breadcrumbs, or a back link. Routing stays owned by the consuming app.
   */
  beforeTitle?: ReactNode
  className?: string
}

function PageHeader({
  title,
  subtitle,
  action,
  beforeTitle,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {beforeTitle && <div className="mb-1.5">{beforeTitle}</div>}
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 max-sm:w-full [&>*]:max-sm:w-full">{action}</div>
      )}
    </header>
  )
}

export { PageHeader, type PageHeaderProps }
