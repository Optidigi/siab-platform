"use client"
import * as React from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { TOGGLE_LINK_COMMAND } from "@lexical/link"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslations } from "next-intl"

const isSafeHref = (raw: string): boolean => {
  if (!raw) return false
  if (raw.startsWith("/")) return true
  try {
    const u = new URL(raw)
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol)
  } catch { return false }
}

export const LinkPopover: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const t = useTranslations("editor")
  const tCommon = useTranslations("common")
  const [editor] = useLexicalComposerContext()
  const [href, setHref] = React.useState("")
  const [newTab, setNewTab] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const apply = () => {
    if (!isSafeHref(href)) { setError(t("invalidCtaUrl")); return }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: href, target: newTab ? "_blank" : null, rel: newTab ? "noopener noreferrer" : null })
    setHref(""); setNewTab(false); setError(null); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("linkTo")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder={t("linkHrefPlaceholder")} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={newTab} onCheckedChange={(v) => setNewTab(!!v)} /> {t("openInNewTab")}
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{tCommon("cancel")}</Button>
          <Button type="button" onClick={apply}>{t("apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
