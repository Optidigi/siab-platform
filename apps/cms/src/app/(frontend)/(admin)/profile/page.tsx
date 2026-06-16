import { requireAuth } from "@/lib/authGate"
import { ProfileForm } from "@/components/forms/ProfileForm"
import { PageHeader } from "@/components/page-header"
import { getAdminTranslations } from "@/i18n/admin"

export default async function ProfilePage() {
  const { user } = await requireAuth()
  const t = await getAdminTranslations(user, "profile")

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("profile")} />
      <ProfileForm user={user} />
    </div>
  )
}
