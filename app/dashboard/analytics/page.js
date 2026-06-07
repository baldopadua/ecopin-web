import PageHeader from '@/components/layout/PageHeader'

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <PageHeader 
        title="Analytics"
        subtitle="View analytics and insights"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-4">Statistics</h2>
          <p className="text-text-muted">No analytics data available</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-4">Trends</h2>
          <p className="text-text-muted">No trend data available</p>
        </div>
      </div>
    </div>
  )
}
