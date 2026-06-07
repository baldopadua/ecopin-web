import PageHeader from '@/components/layout/PageHeader'

export default function CleanupTaskPage() {
  return (
    <div className="p-8">
      <PageHeader 
        title="Cleanup Task"
        subtitle="Manage cleanup tasks and assignments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Task' }
        ]}
      />

      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Cleanup Tasks</h2>
        <p className="text-text-muted">No cleanup tasks available</p>
      </div>
    </div>
  )
}
