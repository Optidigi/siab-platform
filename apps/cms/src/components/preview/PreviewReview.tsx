"use client"

import * as React from "react"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, Loader2, Rocket } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@siteinabox/ui/components/alert"
import { Button } from "@siteinabox/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@siteinabox/ui/components/card"
import { Label } from "@siteinabox/ui/components/label"
import { Textarea } from "@siteinabox/ui/components/textarea"

export type PreviewReviewActionState = {
  ok: boolean
  message: string
}

type PreviewReviewAction = (
  previousState: PreviewReviewActionState,
  formData: FormData,
) => Promise<PreviewReviewActionState>

const initialState: PreviewReviewActionState = {
  ok: false,
  message: "",
}

export function PreviewReview({
  tenantName,
  previewHref,
  checkoutHref,
  submitReviewAction,
}: {
  tenantName: string
  previewHref: string
  checkoutHref: string
  submitReviewAction: PreviewReviewAction
}) {
  const t = useTranslations("preview")
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState)

  return (
    <main className="min-h-dvh bg-background p-3 text-foreground md:p-4">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-3xl place-items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("reviewTitle")}</CardTitle>
            <CardDescription>{t("reviewDescription", { site: tenantName })}</CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="preview-review-notes">{t("reviewNotesLabel")}</Label>
                <Textarea
                  id="preview-review-notes"
                  name="notes"
                  rows={8}
                  placeholder={t("reviewNotesPlaceholder")}
                  required
                />
              </div>
              {state.message && (
                <Alert variant={state.ok ? "default" : "destructive"}>
                  <AlertTitle>{state.ok ? t("reviewSavedTitle") : t("accessUnavailable")}</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-between">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={previewHref}>{t("checkoutBackToPreview")}</a>
              </Button>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button type="submit" variant="default" disabled={pending} className="w-full sm:w-auto">
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                  {t("reviewSend")}
                </Button>
                <Button asChild variant="success" className="w-full sm:w-auto">
                  <a href={checkoutHref}>
                    <Rocket className="size-4" />
                    {t("launchWebsite")}
                  </a>
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
