'use client'
import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import Button from '@/components/ui/Button'
import { fetchSweeperConfig, updateSlaThreshold, updateShiftDuration, updateWorkTime } from '@/lib/api/sweeper'

// Helper for normalizing report types
const normalizeString = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function SweeperSettingsPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // State for SLA Threshold
  const [slaThreshold, setSlaThreshold] = useState('')
  const [originalSla, setOriginalSla] = useState(null)
  const [showSlaConfirm, setShowSlaConfirm] = useState(false)
  const [pendingSla, setPendingSla] = useState(null)
  const [isSavingSla, setIsSavingSla] = useState(false)

  // State for Shift Duration
  const [shiftDuration, setShiftDuration] = useState('')
  const [isSavingShift, setIsSavingShift] = useState(false)

  // State for Work Times
  const [workTimes, setWorkTimes] = useState({})
  const [savingWorkTimes, setSavingWorkTimes] = useState({}) // track which row is saving
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await fetchSweeperConfig()
      setConfig(data)
      setSlaThreshold(data.slaThreshold)
      setOriginalSla(data.slaThreshold)
      setShiftDuration(data.defaultShiftDuration)
      setWorkTimes(data.workTimes || {})
    } catch (err) {
      console.error('Failed to load sweeper config:', err)
      setError('Failed to load sweeper configuration.')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const handleSaveSla = async (force = false) => {
    const val = Number(slaThreshold)
    if (isNaN(val) || val < 1 || val > 168) {
      showToast('SLA Threshold must be between 1 and 168 hours', 'error')
      return
    }

    // Check for > 25% change
    if (!force && originalSla !== null) {
      const diff = Math.abs(val - originalSla)
      const percentChange = diff / originalSla
      if (percentChange > 0.25) {
        setPendingSla(val)
        setShowSlaConfirm(true)
        return
      }
    }

    try {
      setIsSavingSla(true)
      const targetVal = force ? pendingSla : val
      await updateSlaThreshold(targetVal)
      setOriginalSla(targetVal)
      setSlaThreshold(targetVal)
      showToast('SLA Threshold updated successfully')
      setShowSlaConfirm(false)
    } catch (err) {
      showToast('Failed to update SLA Threshold', 'error')
    } finally {
      setIsSavingSla(false)
    }
  }

  const handleSaveShift = async () => {
    const val = Number(shiftDuration)
    if (isNaN(val) || val < 4 || val > 12 || val % 0.5 !== 0) {
      showToast('Shift duration must be between 4 and 12 hours, in 0.5 hour increments', 'error')
      return
    }

    try {
      setIsSavingShift(true)
      await updateShiftDuration(val)
      showToast('Shift Duration updated successfully')
    } catch (err) {
      showToast('Failed to update Shift Duration', 'error')
    } finally {
      setIsSavingShift(false)
    }
  }

  const handleWorkTimeChange = (type, value) => {
    setWorkTimes(prev => ({ ...prev, [type]: value }))
  }

  const handleSaveWorkTime = async (type) => {
    const val = Number(workTimes[type])
    if (isNaN(val) || val < 5 || val > 120) {
      showToast('Work time must be between 5 and 120 minutes', 'error')
      return
    }

    try {
      setSavingWorkTimes(prev => ({ ...prev, [type]: true }))
      await updateWorkTime(type, val)
      showToast(`Work time for ${normalizeString(type)} updated successfully`)
    } catch (err) {
      showToast(`Failed to update work time for ${normalizeString(type)}`, 'error')
    } finally {
      setSavingWorkTimes(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = event.target.result
      const lines = csv.split('\n')
      
      let successCount = 0
      let errorCount = 0
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const [type, minutesStr] = line.split(',')
        if (type && minutesStr) {
          const val = Number(minutesStr.trim())
          const cleanType = type.trim()
          if (!isNaN(val) && val >= 5 && val <= 120 && config.workTimes[cleanType] !== undefined) {
            try {
              await updateWorkTime(cleanType, val)
              setWorkTimes(prev => ({ ...prev, [cleanType]: val }))
              successCount++
            } catch (err) {
              errorCount++
            }
          } else {
            errorCount++
          }
        }
      }
      
      if (successCount > 0) {
        showToast(`Successfully imported ${successCount} work time estimates. ${errorCount > 0 ? `(${errorCount} skipped/failed)` : ''}`)
      } else {
        showToast('No valid work time estimates found in CSV', 'error')
      }
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <AdminGuard>
      <div className="p-8 max-w-5xl mx-auto">
        <PageHeader
          title="Sweeper Workflow Settings"
          subtitle="Configure core parameters for the sweeper optimization engine"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings', href: '/dashboard/admin/settings' },
            { label: 'Sweeper Workflow' }
          ]}
        />

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-bold z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {toast.message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center text-gray-500">Loading configuration...</div>
        ) : (
          <div className="space-y-8">
            
            {/* SLA Threshold Section */}
            <div className="bg-surface-elevated border border-border rounded shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">SLA Threshold</h2>
              <p className="text-sm text-gray-600 mb-4">
                Defines the maximum allowed time (in hours) before a pending report is automatically flagged as an outlier requiring sweeper dispatch.
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Hours (1-168)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={slaThreshold}
                    onChange={(e) => setSlaThreshold(e.target.value)}
                    className="w-full border border-border rounded p-2 text-lg font-mono"
                  />
                </div>
                <div className="mt-5">
                  <Button 
                    variant="primary" 
                    onClick={() => handleSaveSla(false)}
                    disabled={isSavingSla}
                  >
                    {isSavingSla ? 'Saving...' : 'Save Threshold'}
                  </Button>
                </div>
              </div>

              {/* SLA Confirmation Dialog */}
              {showSlaConfirm && (
                <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded">
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                    <div>
                      <h4 className="font-bold text-yellow-800">Significant Change Detected</h4>
                      <p className="text-sm text-yellow-700 mt-1 mb-3">
                        You are attempting to change the SLA Threshold by more than 25% (from {originalSla}h to {pendingSla}h). This will significantly impact the number of outlier clusters generated. Are you sure you want to proceed?
                      </p>
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={() => handleSaveSla(true)}>Confirm Change</Button>
                        <Button variant="secondary" onClick={() => setShowSlaConfirm(false)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shift Duration Section */}
            <div className="bg-surface-elevated border border-border rounded shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Default Shift Duration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Used by the TSP solver to constrain route generation. This ensures sweeper crews are not assigned more work than can be completed in a single shift.
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Hours (4-12, step 0.5)</label>
                  <input
                    type="number"
                    min="4"
                    max="12"
                    step="0.5"
                    value={shiftDuration}
                    onChange={(e) => setShiftDuration(e.target.value)}
                    className="w-full border border-border rounded p-2 text-lg font-mono"
                  />
                </div>
                <div className="mt-5">
                  <Button 
                    variant="primary" 
                    onClick={handleSaveShift}
                    disabled={isSavingShift}
                  >
                    {isSavingShift ? 'Saving...' : 'Save Duration'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Work Time Estimates Section */}
            <div className="bg-surface-elevated border border-border rounded shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">Work Time Estimates</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Estimated time required (in minutes) to resolve specific issue types.
                  </p>
                </div>
                <div>
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button 
                    variant="secondary" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Bulk Import from CSV
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-3 text-sm font-bold text-gray-700">Issue Type</th>
                      <th className="p-3 text-sm font-bold text-gray-700">Estimated Minutes (5-120)</th>
                      <th className="p-3 text-sm font-bold text-gray-700 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(workTimes).map(([type, minutes]) => (
                      <tr key={type} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">
                          {normalizeString(type)}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={minutes}
                            onChange={(e) => handleWorkTimeChange(type, e.target.value)}
                            className="border border-gray-300 rounded p-2 w-32 font-mono"
                          />
                        </td>
                        <td className="p-3">
                          <Button 
                            variant="primary" 
                            className="w-full"
                            onClick={() => handleSaveWorkTime(type)}
                            disabled={savingWorkTimes[type] || Number(minutes) === config?.workTimes?.[type]}
                          >
                            {savingWorkTimes[type] ? 'Saving...' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </AdminGuard>
  )
}
