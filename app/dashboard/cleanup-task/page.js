export default function CleanupTaskPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Cleanup Task</h1>
        <p className="text-text-secondary">Manage cleanup tasks and assignments</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Cleanup Tasks</h2>
        <p className="text-text-muted">No cleanup tasks available</p>
      </div>
    </div>
  )
}
