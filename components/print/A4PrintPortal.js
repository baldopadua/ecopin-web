'use client'
import {createPortal} from 'react-dom'
import styles from './A4PrintPortal.module.css'
export default function A4PrintPortal({header,footer,children}){
 if(typeof document==='undefined')return null
 return createPortal(<div data-ecopin-print-root className={styles.root}>
  <style>{`@page { size: A4 portrait; margin: 18mm 16mm;
   @top-left { content: ${JSON.stringify(header)}; font-family: sans-serif; font-size: 8pt; color: #59636e; }
   @bottom-left { content: ${JSON.stringify(footer)}; font-family: sans-serif; font-size: 8pt; color: #59636e; }
   @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: sans-serif; font-size: 8pt; color: #59636e; }
  }
  @media print {
   html, body { height: auto !important; overflow: visible !important; background: white !important; }
   body > :not([data-ecopin-print-root]) { display: none !important; }
  }`}</style>{children}
 </div>,document.body)
}
