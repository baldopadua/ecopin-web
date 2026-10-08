import React from 'react';
import styles from './TemplateSelector.module.css';

export default function TemplateSelector({ selectedTemplate, onTemplateChange, outlierCount, standardCount }) {
  return (
    <div className={styles.templateSelector}>
      <button type="button" aria-pressed={selectedTemplate === 'standard'}
        className={`${styles.templateOption} ${selectedTemplate === 'standard' ? styles.selected : ''}`}
        onClick={() => onTemplateChange('standard')}
      >
        <h4>Standard Workflow</h4>
        <div className={styles.clusterCount}>
          {standardCount} {standardCount === 1 ? 'cluster' : 'clusters'}
        </div>
      </button>
      
      <button type="button" aria-pressed={selectedTemplate === 'sweeper'}
        className={`${styles.templateOption} ${styles.sweeper} ${selectedTemplate === 'sweeper' ? styles.selected : ''}`}
        onClick={() => onTemplateChange('sweeper')}
      >
        <h4>Sweeper Workflow</h4>
        <div className={`${styles.clusterCount} ${outlierCount === 0 ? styles.healthy : ''}`}>
          {outlierCount} {outlierCount === 1 ? 'eligible report' : 'eligible reports'}
          {outlierCount === 0 && <span style={{marginLeft: '8px', fontSize: '0.9rem', color: '#28a745'}}>None eligible</span>}
        </div>
      </button>
      <button type="button" aria-pressed={selectedTemplate === 'mixed'}
        className={`${styles.templateOption} ${selectedTemplate === 'mixed' ? styles.selected : ''}`}
        onClick={() => onTemplateChange('mixed')}
      >
        <h4>Mixed Workflow</h4>
        <div className={styles.clusterCount}>{standardCount} clusters · {outlierCount} eligible reports</div>
      </button>
    </div>
  );
}
