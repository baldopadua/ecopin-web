'use client'
import {createPortal} from 'react-dom'
import styles from './A4PrintPortal.module.css'
export default function A4PrintPortal({header,footer,children}){
 if(typeof document==='undefined')return null
 return createPortal(<div data-ecopin-print-root className={styles.root}>
  <style>{`@page { size: A4 portrait; margin: 16mm 14mm;
   @top-left { content: ${JSON.stringify(header)}; font-family: Arial, sans-serif; font-size: 8pt; }
   @bottom-left { content: ${JSON.stringify(footer)}; font-family: Arial, sans-serif; font-size: 8pt; }
   @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: Arial, sans-serif; font-size: 8pt; }
  }`}</style>{children}
 </div>,document.body)
}
