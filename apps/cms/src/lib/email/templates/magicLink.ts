export function magicLinkTemplate(opts: { loginUrl: string }) {
  return {
    subject: "Sign in to SiteInABox",
    html: `
      <p>Click to sign in to SiteInABox:</p>
      <p><a href="${opts.loginUrl}">${opts.loginUrl}</a></p>
      <p style="color:#666;font-size:12px">This link expires soon. If you didn't request this, ignore this email.</p>
    `,
  }
}
