export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Welcome to EcoPin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Total Reports</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">0</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Cleanup Tasks</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">0</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Completed</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">0</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Pending</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-4">Recent Activity</h2>
          <p className="text-text-muted">No recent activity</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full btn-primary">Create New Report</button>
            <button className="w-full btn-secondary">View Map</button>
          </div>
        </div>
      </div>
    </div>
  )
}