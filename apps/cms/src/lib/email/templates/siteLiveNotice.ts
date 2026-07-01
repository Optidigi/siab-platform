const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export function siteLiveNoticeTemplate(opts: { siteUrl: string; adminUrl: string }) {
  const siteUrl = escapeHtml(opts.siteUrl)
  const adminUrl = escapeHtml(opts.adminUrl)

  return {
    subject: "Your Site in a Box site is live",
    html: `
      <p>Your Site in a Box site is live.</p>
      <p><strong>Live site:</strong> <a href="${siteUrl}">${siteUrl}</a></p>
      <p><strong>Tenant admin:</strong> <a href="${adminUrl}">${adminUrl}</a></p>
    `,
    text: [
      "Your Site in a Box site is live.",
      `Live site: ${opts.siteUrl}`,
      `Tenant admin: ${opts.adminUrl}`,
    ].join("\n"),
  }
}
