import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "../lib/site-meta";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ciutatis — open source GovOps platform for public institutions",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Ciutatis is the open source, AI-powered GovOps platform for public institutions — with a public layer for citizens to explore government data and work with their government.",
  applicationName: SITE_NAME,
  manifest: "/site.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Ciutatis — open source GovOps platform",
    description:
      "Run public institutions with governed AI execution, budgets and approvals — plus a public scrutiny + portal layer for citizens.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fcfbf7",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: "Open source, AI-powered GovOps platform for public institutions and public scrutiny.",
      sameAs: ["https://github.com/tebayoso/ciutatis"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: ["en", "es"],
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Open source GovOps platform: institutional operations, governed AI execution, public scrutiny and portal.",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
