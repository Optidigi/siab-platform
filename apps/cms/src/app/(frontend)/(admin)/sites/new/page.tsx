import { redirect } from "next/navigation"

// FE-6 — tenant creation moved into a modal (TenantCreateDialog) triggered
// from /sites. This dedicated route is kept only so existing links and
// bookmarks resolve; it redirects to the list, which enforces the role gate.
export default function NewTenantPage() {
  redirect("/sites")
}
