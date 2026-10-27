import { NavigationLoadingProvider } from '@/components/context/NavigationLoadingContext'
import NavigationLoadingScreen from '@/components/ui/NavigationLoadingScreen'
import PublicSiteProvider from '@/components/public/PublicSiteProvider'
import { Outfit } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css'

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "EcoPin A.I.",
  description: "Crowdsourced Environmental Reporting Platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NavigationLoadingProvider>
          <NavigationLoadingScreen />
          <PublicSiteProvider>{children}</PublicSiteProvider>
        </NavigationLoadingProvider>
      </body>
    </html>
  );
}
