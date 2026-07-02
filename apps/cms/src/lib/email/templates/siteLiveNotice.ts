const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export function siteLiveNoticeTemplate(opts: { siteUrl: string; adminUrl: string; magicLoginUrl?: string | null }) {
  const siteUrl = escapeHtml(opts.siteUrl)
  const adminUrl = escapeHtml(opts.adminUrl)
  const magicLoginUrl = opts.magicLoginUrl ? escapeHtml(opts.magicLoginUrl) : null

  return {
    subject: "Your Site in a Box site is live",
    html: `
      <p>Your Site in a Box site is live.</p>
      <p><strong>Live site:</strong> <a href="${siteUrl}">${siteUrl}</a></p>
      <p><strong>CMS admin:</strong> <a href="${adminUrl}">${adminUrl}</a></p>
      ${magicLoginUrl
        ? `<p><strong>Magic login:</strong> <a href="${magicLoginUrl}">${magicLoginUrl}</a></p>`
        : "<p>Your magic login link has been sent to this email address. Use it to open the CMS admin without a password.</p>"}
    `,
    text: [
      "Your Site in a Box site is live.",
      `Live site: ${opts.siteUrl}`,
      `CMS admin: ${opts.adminUrl}`,
      opts.magicLoginUrl
        ? `Magic login: ${opts.magicLoginUrl}`
        : "Your magic login link has been sent to this email address. Use it to open the CMS admin without a password.",
    ].join("\n"),
  }
}
