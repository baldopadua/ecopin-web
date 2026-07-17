import PublicLayout from '@/components/layout/PublicLayout'

export default function DownloadsPage() {
  return (
    <PublicLayout>
      {/* Content */}
      <div className="relative z-10 px-10 sm:px-16 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary leading-[1.1] mb-4 tracking-tight">
            Download EcoPin<span className="text-accent-green">.AI</span>
          </h1>
          <p className="text-lg text-text-muted font-medium mb-8 max-w-2xl">
            One app, two roles. Download EcoPin and sign in with your assigned account.
          </p>
          <div className="w-16 h-1 bg-accent-green rounded-full mb-12"></div>

          {/* App Card */}
          <div className="bg-white/70 dark:bg-black/70 backdrop-blur-sm border border-border/50 rounded-2xl p-8 sm:p-10 mb-10">
            {/* Icon */}
            <div className="w-16 h-16 bg-accent-green/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-text-primary mb-3">EcoPin.A.I Mobile App</h2>
            <p className="text-text-secondary leading-relaxed mb-8">
              Report, track, and manage environmental concerns in your community. Available for Android devices.
            </p>

            {/* Roles */}
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
                  <span className="text-sm font-semibold text-text-primary">LGU Role</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Manage reports, assign cleanup tasks, and access analytics for your area.
                </p>
              </div>
            </div>

            {/* Download Button */}
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

          {/* Info */}
          <p className="text-sm text-text-muted">
            Your role is assigned by your administrator. Download the app and sign in with your credentials to get started.
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
