"use client"
import * as React from "react"
import { Save, AlertCircle, Check } from "lucide-react"
import { MobileFloatingPill, type MobileFloatingPillVariant } from "@/components/common/mobile-floating-pill"
import type { SaveStatus } from "@/components/save-ui/save-status-bar"
import { useTranslations } from "next-intl"

export interface MobileSavePillProps {
  status: SaveStatus
  dirtyCount?: number
  errorCount?: number
  onSave: () => void
}

const STATUS_TO_VARIANT: Record<SaveStatus, MobileFloatingPillVariant> = {
  idle: "default",
  saved: "success",
  dirty: "warning",
  saving: "loading",
  error: "destructive",
}

const ICON: Record<SaveStatus, React.ReactNode> = {
  idle: <Save className="h-5 w-5" aria-hidden />,
  saved: <Check className="h-5 w-5" aria-hidden />,
  dirty: <Save className="h-5 w-5" aria-hidden />,
  saving: <Save className="h-5 w-5" aria-hidden />, // overridden by loading variant spinner
  error: <AlertCircle className="h-5 w-5" aria-hidden />,
}

/**
 * Top-right floating save pill. Thin status-aware wrapper over MobileFloatingPill.
 */
export const MobileSavePill: React.FC<MobileSavePillProps> = ({ status, dirtyCount, errorCount = 0, onSave }) => {
  const t = useTranslations("common")
  const [displayStatus, setDisplayStatus] = React.useState<SaveStatus>(status)

  React.useEffect(() => {
    if (status !== "saved") {
      setDisplayStatus(status)
      return
    }
    setDisplayStatus("saved")
    const timer = window.setTimeout(() => {
      setDisplayStatus((current) => current === "saved" ? "idle" : current)
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [status])

  const isError = displayStatus === "error"
  const hasValidationErrors = isError && errorCount > 0
  const badgeCount = hasValidationErrors ? errorCount : isError ? 0 : displayStatus === "dirty" ? (dirtyCount ?? 0) : 0
  const disabled = displayStatus === "idle" || displayStatus === "saved" || displayStatus === "saving"
  const ariaLabel =
    displayStatus === "saving" ? t("saving") :
    displayStatus === "error" && hasValidationErrors ? t("saveBlocked", { count: errorCount }) :
    displayStatus === "error" ? t("saveFailed") :
    displayStatus === "dirty" ? t("save") :
    t("saved")

  return (
    <MobileFloatingPill
      position="top-right"
      icon={ICON[displayStatus]}
      onClick={onSave}
      ariaLabel={ariaLabel}
      variant={STATUS_TO_VARIANT[displayStatus]}
      disabled={disabled}
      badgeCount={badgeCount}
      badgeTone={isError ? "destructive" : "warning"}
      dataAttrs={{
        "data-mobile-save-pill": "",
        "data-save-status": displayStatus,
      }}
    />
  )
}
