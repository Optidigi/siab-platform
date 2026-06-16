import { Suspense } from "react"
import { LoginForm } from "@/components/forms/LoginForm"
import { Login04 } from "@/components/login-04"
import { getEnabledSocialAuthProviders } from "@/lib/socialAuth/providers"

/**
 * Adopts the local shadcn `login-04` block: two-column card with the form on
 * the left and a branded media panel on the right.
 * The Login04 shell stacks to a single column on phone widths.
 *
 * Departures from a generic login-04:
 *   - Social providers are shown only when configured — siab-payload remains
 *     invite-only and Payload-owned for authorization.
 *   - No "Don't have an account? Sign up" footer — invite-only.
 *   - Right panel uses the real SVG logo with dark/light CSS switching.
 */
export default async function LoginPage() {
  const socialProviders = getEnabledSocialAuthProviders()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Login04
          media={
            <div className="absolute inset-0 flex items-center justify-center bg-primary p-8">
              <img src="/logos/logo-dark.svg"  alt="SiteInABox" className="h-32 w-auto max-w-full dark:hidden" />
              <img src="/logos/logo-light.svg" alt="SiteInABox" className="hidden dark:block h-32 w-auto max-w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <Suspense>
              <LoginForm socialProviders={socialProviders} />
            </Suspense>
          </div>
        </Login04>
      </div>
    </main>
  )
}
