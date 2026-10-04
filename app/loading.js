export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#121212] flex items-center justify-center overflow-hidden">
      {/* Logo underneath */}
      <div 
        className="relative z-0 flex flex-col items-center" 
        style={{ 
          animation: 'revealLogo 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards', 
          opacity: 0 
        }}
      >
        <img src="/Full Logo Light.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain dark:hidden" />
        <img src="/Full Logo Dark.png" alt="EcoPin" className="h-10 sm:h-12 w-auto object-contain hidden dark:block" />
        <div className="mt-6 font-black uppercase tracking-[0.3em] text-[10px] text-gray-500 animate-pulse">
          Loading
        </div>
      </div>

      {/* Royal blue wipe overlay */}
      <div 
        className="fixed inset-0 bg-[#0052CC] z-10" 
        style={{ 
          transformOrigin: 'right',
          animation: 'wipeRight 0.9s cubic-bezier(0.8, 0, 0.2, 1) forwards'
        }} 
      />
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes wipeRight {
          0% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
        @keyframes revealLogo {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        `
      }} />
    </div>
  );
}
