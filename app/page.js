import PublicLayout from '@/components/layout/PublicLayout'

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section id="home" className="relative z-10 flex items-center justify-center px-10 sm:px-16 py-20 min-h-[calc(100vh-80px)]">
        <div className="max-w-3xl text-justify mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-text-primary leading-[1.1] mb-6 tracking-tight">
            EcoPin<span className="text-accent-green">.AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-muted font-medium leading-relaxed mb-6 max-w-2xl">
            Crowdsourced Geospatial Platform for Transparent Environmental Reporting
            and Rapid Institutional Detection
          </p>
          <div className="w-16 h-1 bg-accent-green rounded-full mb-8"></div>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed mb-12 max-w-xl">
            EcoPin A.I. supports Pasig City&apos;s Solid Waste Management Office (SWMO) in monitoring and addressing environmental concerns across the city. Through this portal, submitted reports are automatically validated, geographically clustered, and prioritized to enable a more efficient and evidence-based institutional response.
          </p>
          <div className="flex gap-4 ml-auto w-fit">
            <a
              href="#about"
              className="group inline-flex items-center gap-3 px-8 py-4 text-base font-semibold text-text-primary bg-surface hover:bg-border rounded-full transition-all border border-border"
            >
              Learn More
              <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
            <a
              href="/auth"
              className="group inline-flex items-center gap-3 px-8 py-4 text-base font-semibold text-white dark:text-black bg-primary hover:bg-primary-dark rounded-full transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Get Started
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Dot Grid Pattern */}
      <div className="absolute bottom-10 left-10 sm:bottom-16 sm:left-16 z-10 opacity-10 pointer-events-none">
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

      {/* About Section */}
      <section id="about" className="relative z-10 px-10 sm:px-16 py-20 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-text-primary leading-[1.1] mb-4 tracking-tight">
            About EcoPin<span className="text-accent-green">.AI</span>
          </h2>
          <p className="text-lg text-text-muted font-medium mb-8 max-w-2xl">
            A smarter, faster way to address environmental concerns in Pasig City.
          </p>
          <div className="w-16 h-1 bg-accent-green rounded-full mb-12"></div>

          {/* Purpose */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-text-primary mb-4">Purpose</h3>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              EcoPin A.I. is a crowdsourced environmental reporting platform designed to support Pasig City&apos;s Solid Waste Management Office (SWMO) in monitoring and addressing environmental concerns across the city.
            </p>
            <p className="text-base text-text-secondary leading-relaxed">
              Citizens can pin environmental issues directly on a map — from illegal dumping to overflowing bins — while the system automatically validates, clusters, and prioritizes reports to enable a more efficient and evidence-based institutional response.
            </p>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-text-primary mb-6">Features</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'AI-Powered Validation',
                  description: 'Reports are automatically verified using artificial intelligence to reduce false reports and ensure data accuracy.',
                },
                {
                  title: 'Geospatial Mapping',
                  description: 'Issues are pinned on an interactive map, giving SWMO a real-time geographic overview of environmental hotspots.',
                },
                {
                  title: 'Smart Clustering',
                  description: 'Related reports are automatically grouped by location and type, helping authorities identify patterns and prioritize action.',
                },
                {
                  title: 'Role-Based Access',
                  description: 'Separate interfaces for citizens and SWMO personnel, ensuring the right people have the right tools and access levels.',
                },
                {
                  title: 'Cleanup Task Management',
                  description: 'SWMO can create, assign, and track cleanup tasks directly from reported issues, closing the loop from report to resolution.',
                },
                {
                  title: 'Analytics Dashboard',
                  description: 'Comprehensive insights into report volumes, resolution rates, and environmental trends to support data-driven decisions.',
                },
              ].map((feature, i) => (
                <div key={i} className="bg-white/60 dark:bg-black/60 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <h4 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h3 className="text-2xl font-bold text-text-primary mb-6">How It Works</h3>
            <div className="space-y-6">
              {[
                { step: '01', title: 'Report', description: 'Citizens pin environmental issues on the map with photos and descriptions.' },
                { step: '02', title: 'Validate', description: 'AI automatically verifies each report for accuracy and relevance.' },
                { step: '03', title: 'Prioritize', description: 'The system clusters and ranks issues based on severity and location.' },
                { step: '04', title: 'Act', description: 'SWMO assigns cleanup tasks and tracks resolution in real time.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <span className="text-3xl font-extrabold text-accent-green/30">{item.step}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-text-primary mb-1">{item.title}</h4>
                    <p className="text-sm text-text-secondary">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="relative z-10 px-10 sm:px-16 py-20 scroll-mt-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-text-primary leading-[1.1] mb-4 tracking-tight">
            Download EcoPin<span className="text-accent-green">.AI</span>
          </h2>
          <p className="text-lg text-text-muted font-medium mb-8 max-w-2xl">
            One app, two roles. Download EcoPin and sign in with your assigned account.
          </p>
          <div className="w-16 h-1 bg-accent-green rounded-full mb-12"></div>

          {/* App Card */}
          <div className="bg-white/70 dark:bg-black/70 backdrop-blur-sm border border-border/50 rounded-2xl p-8 sm:p-10 mb-10">
            <div className="w-16 h-16 bg-accent-green/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-text-primary mb-3">EcoPin.A.I Mobile App</h3>
            <p className="text-text-secondary leading-relaxed mb-8">
              Report, track, and manage environmental concerns in Pasig City. Available for Android devices.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-surface/80 rounded-xl p-5 border border-transparent hover:border-accent-green/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-text-primary">Citizen Role</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Pin environmental issues on the map, upload photos, and track your reports.
                </p>
              </div>
              <div className="bg-surface/80 rounded-xl p-5 border border-transparent hover:border-accent-green/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <span className="text-sm font-semibold text-text-primary">SWMO Role</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Manage reports, assign cleanup tasks, and access analytics for your area.
                </p>
              </div>
            </div>

            <a
              href="#"
              className="group inline-flex items-center gap-3 px-8 py-4 text-base font-semibold text-white dark:text-black bg-primary hover:bg-primary-dark rounded-full transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download for Android
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>

          <p className="text-sm text-text-muted">
            Your role is assigned by your administrator. Download the app and sign in with your credentials to get started.
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}
