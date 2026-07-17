import PublicLayout from '@/components/layout/PublicLayout'

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Content */}
      <div className="relative z-10 px-10 sm:px-16 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary leading-[1.1] mb-4 tracking-tight">
            About EcoPin<span className="text-accent-green">.AI</span>
          </h1>
          <p className="text-lg text-text-muted font-medium mb-8 max-w-2xl">
            A smarter, faster way to address environmental concerns in your community.
          </p>
          <div className="w-16 h-1 bg-accent-green rounded-full mb-12"></div>

          {/* Purpose */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Purpose</h2>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              EcoPin A.I. is a crowdsourced environmental reporting platform designed to support Local Government Units (LGUs) and their Solid Waste Management Offices in monitoring and addressing environmental concerns across the city.
            </p>
            <p className="text-base text-text-secondary leading-relaxed">
              Citizens can pin environmental issues directly on a map — from illegal dumping to overflowing bins — while the system automatically validates, clusters, and prioritizes reports to enable a more efficient and evidence-based institutional response.
            </p>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Features</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'AI-Powered Validation',
                  description: 'Reports are automatically verified using artificial intelligence to reduce false reports and ensure data accuracy.',
                },
                {
                  title: 'Geospatial Mapping',
                  description: 'Issues are pinned on an interactive map, giving LGUs a real-time geographic overview of environmental hotspots.',
                },
                {
                  title: 'Smart Clustering',
                  description: 'Related reports are automatically grouped by location and type, helping authorities identify patterns and prioritize action.',
                },
                {
                  title: 'Role-Based Access',
                  description: 'Separate interfaces for citizens and LGU personnel, ensuring the right people have the right tools and access levels.',
                },
                {
                  title: 'Cleanup Task Management',
                  description: 'LGUs can create, assign, and track cleanup tasks directly from reported issues, closing the loop from report to resolution.',
                },
                {
                  title: 'Analytics Dashboard',
                  description: 'Comprehensive insights into report volumes, resolution rates, and environmental trends to support data-driven decisions.',
                },
              ].map((feature, i) => (
                <div key={i} className="bg-white/60 dark:bg-black/60 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">How It Works</h2>
            <div className="space-y-6">
              {[
                { step: '01', title: 'Report', description: 'Citizens pin environmental issues on the map with photos and descriptions.' },
                { step: '02', title: 'Validate', description: 'AI automatically verifies each report for accuracy and relevance.' },
                { step: '03', title: 'Prioritize', description: 'The system clusters and ranks issues based on severity and location.' },
                { step: '04', title: 'Act', description: 'LGUs assign cleanup tasks and track resolution in real time.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start">
                  <span className="text-3xl font-extrabold text-accent-green/30">{item.step}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">{item.title}</h3>
                    <p className="text-sm text-text-secondary">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
