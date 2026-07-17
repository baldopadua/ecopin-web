import PublicLayout from '@/components/layout/PublicLayout'

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Content */}
      <div className="relative z-10 flex items-center justify-center px-10 sm:px-16 py-20 min-h-[calc(100vh-80px)]">
        <div className="max-w-3xl text-justify mx-auto">
          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-text-primary leading-[1.1] mb-6 tracking-tight">
            EcoPin<span className="text-accent-green">.AI</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-text-muted font-medium leading-relaxed mb-6 max-w-2xl">
            Crowdsourced Geospatial Platform for Transparent Environmental Reporting
            and Rapid Institutional Detection
          </p>

          {/* Divider */}
          <div className="w-16 h-1 bg-accent-green rounded-full mb-8"></div>

          {/* Description */}
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed mb-12 max-w-xl">
            EcoPin A.I. supports the Solid Waste Management Office in monitoring and addressing environmental concerns across the city. Through this portal, submitted reports are automatically validated, geographically clustered, and prioritized to enable a more efficient and evidence-based institutional response.
          </p>

          {/* CTA Button */}
          <a
            href="/auth"
            className="group inline-flex items-center gap-3 px-10 py-4 text-base font-semibold text-white dark:text-black bg-primary hover:bg-primary-dark rounded-full transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 ml-auto"
          >
            Get Started
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>

      {/* Dot Grid Pattern */}
      <div className="absolute bottom-10 left-10 sm:bottom-16 sm:left-16 z-10 opacity-10">
        <svg width="160" height="110" viewBox="0 0 160 110" fill="none">
          {Array.from({ length: 11 }).map((_, row) =>
            Array.from({ length: 16 }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * 10 + 5}
                cy={row * 10 + 5}
                r="1.5"
                fill="var(--text-primary)"
              />
            ))
          )}
        </svg>
      </div>
    </PublicLayout>
  );
}
