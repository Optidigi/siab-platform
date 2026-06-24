import type { ReactNode } from "react"

import { cn } from "../lib/utils"

type EmptyStateProps = {
  /**
   * Pre-rendered icon JSX. Pass rendered JSX instead of a component reference
   * so server pages can use this component without crossing RSC function
   * references.
   */
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-4 py-12 text-center max-md:px-2",
        className
      )}
    >
      {icon}
      <div className="space-y-1">
        <p className="text-base font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export { EmptyState, type EmptyStateProps }
