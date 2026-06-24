import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Site in a Box Builder",
  description: "Builder shell for the Site in a Box platform.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
