import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/authGate"

export default async function TenantNavigationRedirectPage() {
  const { user, ctx } = await requireAuth()
  if (ctx.mode === "super-admin") redirect("/sites")
  if (user.role !== "owner") redirect("/?error=forbidden")
  redirect(`/sites/${ctx.tenant.slug}/navigation`)
}
