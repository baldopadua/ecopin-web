'use client'

import { useId } from 'react'
import PublicSelect from './PublicSelect'

export default function FilterDropdown({ label, value, onChange, options }) {
  const id = useId()
  return <PublicSelect id={id} label={label} value={value} options={options}
    onChange={onChange} hideLabel className="min-w-0 w-full sm:min-w-[150px]" />
}
