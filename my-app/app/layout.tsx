import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "School Portal - Management System",
  description: "Comprehensive school management system for principals, teachers, and students",
  keywords: ["school", "management", "education", "portal", "dashboard"],
  authors: [{ name: "School Management Team" }],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider defaultTheme="system" storageKey="school-portal-theme">
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                {children}
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
