export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Analytics</h1>
        <p className="text-text-secondary">View analytics and insights</p>
      </div>

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
