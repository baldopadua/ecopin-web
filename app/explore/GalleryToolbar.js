import { LayoutGrid, PanelsTopLeft, Search, X } from 'lucide-react'
import PublicSelect from '@/components/ui/PublicSelect'
import ViewModeSwitch from './ViewModeSwitch'
import styles from './Explore.module.css'

export default function GalleryToolbar({ status, onStatus, category, onCategory, priority, onPriority, search, onSearch, sort, onSort, layout, onLayout, onMode, categories }) {
  return <section className={styles.galleryToolbar} aria-label="Gallery controls">
    <div className={styles.toolbarRow}>
      <div className={styles.galleryFilters}>
        <div className={styles.statusTabs} role="group" aria-label="Report status">{[['all','All reports'],['unresolved','Unresolved'],['in_progress','In progress'],['resolved','Resolved']].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => onStatus(value)}>{label}</button>)}</div>
        <PublicSelect id="gallery-category" label="Gallery category" hideLabel value={category} onChange={onCategory} options={[{ value: 'all', label: 'All categories' }, ...categories.map(value => ({ value, label: value.replaceAll('_', ' ').replace(/^./, character => character.toUpperCase()) }))]} className={styles.filterSelect} />
        <PublicSelect id="gallery-priority" label="Gallery priority" hideLabel value={priority} onChange={onPriority} options={[{ value: 'all', label: 'All priorities' }, { value: 'high', label: 'High priority' }, { value: 'medium', label: 'Medium priority' }, { value: 'low', label: 'Low priority' }]} className={styles.filterSelect} />
      </div>
      <ViewModeSwitch mode="gallery" onChange={onMode} />
    </div>
    <div className={styles.toolbarRow}>
      <div className={styles.searchField}><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search gallery reports" placeholder="Search reports or concerns…" value={search} onChange={event => onSearch(event.target.value)} autoComplete="off" />{search && <button type="button" aria-label="Clear gallery search" onClick={() => onSearch('')}><X size={18} /></button>}</div>
      <div className={styles.galleryPresentation}>
        <PublicSelect id="gallery-sort" label="Sort gallery reports" hideLabel value={sort} onChange={onSort} options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'severity', label: 'By priority' }, { value: 'title', label: 'Title A–Z' }]} className={styles.sortSelect} />
        <div className={styles.layoutSwitch} role="group" aria-label="Gallery layout"><button type="button" aria-pressed={layout === 'grid'} onClick={() => onLayout('grid')}><LayoutGrid size={18} /> Grid</button><button type="button" aria-pressed={layout === 'showcase'} onClick={() => onLayout('showcase')}><PanelsTopLeft size={18} /> Showcase</button></div>
      </div>
    </div>
  </section>
}
