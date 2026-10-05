import React from 'react';
import styles from './TemplateSelector.module.css';

export default function TemplateSelector({ selectedTemplate, onTemplateChange, outlierCount, standardCount }) {
  return (
    <div className={styles.templateSelector}>
      <div 
        className={`${styles.templateOption} ${selectedTemplate === 'standard' ? styles.selected : ''}`}
        onClick={() => onTemplateChange('standard')}
      >
        <h4>Standard Workflow</h4>
        <div className={styles.clusterCount}>
          {standardCount} {standardCount === 1 ? 'cluster' : 'clusters'}
        </div>
      </div>
      
      <div 
        className={`${styles.templateOption} ${styles.sweeper} ${selectedTemplate === 'sweeper' ? styles.selected : ''}`}
        onClick={() => onTemplateChange('sweeper')}
      >
        <h4>Sweeper Workflow</h4>
        <div className={`${styles.clusterCount} ${outlierCount === 0 ? styles.healthy : ''}`}>
          {outlierCount} {outlierCount === 1 ? 'outlier' : 'outliers'}
          {outlierCount === 0 && <span style={{marginLeft: '8px', fontSize: '0.9rem', color: '#28a745'}}>✓ Healthy</span>}
        </div>
      </div>
    </div>
  );
}
