import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dal360 — Environmental Intelligence Platform",
  description:
    "LAWDA Digital Twin for Dal Lake, Srinagar. AI-powered pollution monitoring, predictive lake health scoring, and real-time field dispatch.",
  keywords: [
    "Dal Lake", "LAWDA", "digital twin", "environmental monitoring",
    "Kashmir", "lake health", "pollution detection", "AI", "water quality"
  ],
  authors: [{ name: "LAWDA Environmental Intelligence Division" }],
  openGraph: {
    title: "Dal360",
    description: "Environmental Intelligence Platform for Dal Lake, Srinagar",
    type: "website",
  },
  robots: "noindex, nofollow", // Internal ops tool
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('dal-theme') || 'slate';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'nordic' || theme === 'sepia') {
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
            }
            if (localStorage.getItem('dal-sidebar-collapsed') === 'true') {
              document.documentElement.classList.add('sidebar-collapsed');
            }
          })()
        `}} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
