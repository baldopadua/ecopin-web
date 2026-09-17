import React from 'react';

export default function Home() {
  return (
    <main 
      className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-[#ccff00] selection:text-black"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Background Matrix/Grid pattern from Image 2 */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#ccff00 2px, transparent 2px), radial-gradient(#ccff00 2px, transparent 2px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px',
        }}
      ></div>
      
      {/* Additional plus and cross patterns for the matrix look */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(204, 255, 0, .3) 25%, rgba(204, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(204, 255, 0, .3) 75%, rgba(204, 255, 0, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(204, 255, 0, .3) 25%, rgba(204, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(204, 255, 0, .3) 75%, rgba(204, 255, 0, .3) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Solid green blocks intersecting - brutalist geometry from Image 2 */}
      <div className="absolute top-0 right-0 w-64 md:w-96 h-64 bg-[#ccff00] z-0 hidden md:block mix-blend-difference"></div>
      <div className="absolute bottom-20 left-0 w-48 h-64 bg-[#ccff00] z-0 hidden md:block"></div>
      <div className="absolute top-1/2 left-[10%] w-32 h-32 bg-[#ccff00] z-0 hidden md:block mix-blend-exclusion"></div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-6 md:px-12 border-b-4 border-[#ccff00]">
        <div className="text-3xl font-black tracking-tighter">
          ECOPIN<span className="text-[#ccff00]">.SYS</span>
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <a href="#about" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-white hover:text-black px-2 py-1 transition-all">About</a>
          <a href="#features" className="text-sm font-bold uppercase tracking-widest hover:text-[#ccff00] hover:bg-white hover:text-black px-2 py-1 transition-all">Features</a>
          <a href="/auth" className="px-6 py-2 bg-[#ccff00] text-black text-sm font-black uppercase tracking-widest hover:bg-white transition-colors">Login</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
        {/* Large abstract glowing arc from Image 1 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[700px] md:h-[700px] rounded-full border-[40px] md:border-[80px] border-[#ccff00] blur-xl opacity-40 mix-blend-screen pointer-events-none"></div>

        <div className="relative z-20 max-w-5xl mx-auto flex flex-col items-center">
          {/* Brutalist highlight box like "I Make" in Image 1 */}
          <div className="inline-block bg-[#ccff00] text-black px-8 py-2 mb-8 transform -rotate-2 border-4 border-black">
            <span className="text-xl md:text-2xl font-black uppercase tracking-tight">Civic Tech Platform</span>
          </div>
          
          <h1 className="text-6xl md:text-[8rem] font-black uppercase tracking-tighter leading-[0.85] mb-10 text-white drop-shadow-2xl">
            Clean the <br />
            <span className="text-[#ccff00]">Streets</span>, <br />
            Reclaim the <br />
            <span className="text-transparent relative" style={{ WebkitTextStroke: '2px #ccff00' }}>
              City.
              <span className="absolute inset-0 text-[#ccff00] mix-blend-overlay opacity-50 blur-sm">City.</span>
            </span>
          </h1>

          <p className="text-lg md:text-2xl font-medium max-w-3xl mx-auto mb-12 leading-tight bg-black/60 p-4 border-l-4 border-[#ccff00] text-left inline-block">
            Ecopin turns every Pasigueño into a changemaker. <br/> 
            Report trash, track cleanups, and watch your barangay transform — one pin at a time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-2xl">
            <a href="#download" className="group relative w-full sm:w-auto px-10 py-5 bg-[#ccff00] text-black font-black uppercase text-xl md:text-2xl overflow-hidden border-2 border-[#ccff00]">
              <span className="relative z-10 block group-hover:scale-110 transition-transform duration-200">Download App</span>
            </a>
            <a href="/map" className="group w-full sm:w-auto px-10 py-5 bg-black text-[#ccff00] border-4 border-[#ccff00] font-black uppercase text-xl md:text-2xl hover:bg-[#ccff00] hover:text-black transition-colors duration-200 shadow-[8px_8px_0px_0px_rgba(204,255,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(204,255,0,1)] hover:translate-x-[8px] hover:translate-y-[8px]">
              Live Reports
            </a>
          </div>
        </div>

        {/* Small floating brutalist text elements like Image 1 */}
        <div className="absolute top-32 left-10 text-xs font-mono uppercase text-[#ccff00] hidden xl:block border border-[#ccff00] p-2 bg-black">
          [08] resources <br /> loaded.
        </div>
        <div className="absolute bottom-40 right-10 text-xs font-mono uppercase text-white hidden xl:block text-right border-r-4 border-[#ccff00] pr-2">
          @pasig_city <br /> system.init()
        </div>
      </section>

      {/* Marquee Divider */}
      <div className="w-full bg-[#ccff00] text-black font-black text-2xl py-3 overflow-hidden whitespace-nowrap border-y-4 border-black relative z-20">
        <div className="inline-block animate-[marquee_20s_linear_infinite]">
          REPORT IT. TRACK IT. WATCH IT DISAPPEAR. // REPORT IT. TRACK IT. WATCH IT DISAPPEAR. // REPORT IT. TRACK IT. WATCH IT DISAPPEAR. // 
        </div>
      </div>

      {/* How it Works / About Section */}
      <section id="about" className="relative z-10 py-32 px-6 bg-black border-t-8 border-[#ccff00]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12 leading-[0.9]">
              How it <br /> <span className="text-black bg-[#ccff00] px-4 inline-block mt-2 transform rotate-1">Works</span>
            </h2>
            <div className="space-y-10 font-mono text-lg md:text-xl text-gray-300">
              <div className="border-l-8 border-[#ccff00] pl-6 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                <span className="text-[#ccff00] font-black text-2xl block mb-2 tracking-widest">01. REPORT</span>
                Citizens pin environmental issues on the map with photos and descriptions.
              </div>
              <div className="border-l-8 border-white pl-6 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                <span className="text-white font-black text-2xl block mb-2 tracking-widest">02. VALIDATE</span>
                AI automatically verifies each report for accuracy and relevance.
              </div>
              <div className="border-l-8 border-[#ccff00] pl-6 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                <span className="text-[#ccff00] font-black text-2xl block mb-2 tracking-widest">03. PRIORITIZE</span>
                The system clusters and ranks issues based on severity and location.
              </div>
              <div className="border-l-8 border-white pl-6 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                <span className="text-white font-black text-2xl block mb-2 tracking-widest">04. ACT</span>
                SWMO assigns cleanup tasks and tracks resolution in real time.
              </div>
            </div>
          </div>
          
          <div className="relative h-[700px] border-8 border-[#ccff00] bg-[#111] flex items-center justify-center overflow-hidden group">
            {/* Background pattern for the box */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ccff00 0, #ccff00 2px, transparent 2px, transparent 10px)' }}></div>
            
            {/* Phone Mockup Placeholder */}
            <div className="w-72 h-[550px] border-4 border-white rounded-[2.5rem] relative overflow-hidden bg-black z-10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <div className="absolute top-0 inset-x-0 h-8 bg-white rounded-b-2xl w-40 mx-auto"></div>
              <div className="flex items-center justify-center h-full flex-col p-6 text-center border-[10px] border-black">
                <div className="text-6xl mb-6 animate-pulse">📍</div>
                <div className="font-mono text-lg text-[#ccff00] font-bold">ECOPIN UI <br/> ACTIVE</div>
                <div className="mt-8 space-y-4 w-full">
                  <div className="h-12 bg-white/20 w-full"></div>
                  <div className="h-24 bg-[#ccff00]/40 w-full border-l-4 border-[#ccff00]"></div>
                  <div className="h-12 bg-white/20 w-full"></div>
                </div>
              </div>
            </div>
            
            {/* Floating UI Chips */}
            <div className="absolute top-24 -left-8 bg-[#ccff00] text-black font-black text-xl py-3 px-6 border-4 border-black rotate-[-12deg] z-20 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              ✅ RESOLVED
            </div>
            <div className="absolute bottom-40 -right-8 bg-white text-black font-black text-xl py-3 px-6 border-4 border-black rotate-[8deg] z-20 shadow-[4px_4px_0px_0px_rgba(204,255,0,1)]">
              🔴 URGENT
            </div>
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section id="download" className="relative z-10 py-40 px-6 bg-[#ccff00] text-black text-center border-t-8 border-black">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
        <h2 className="text-7xl md:text-[10rem] font-black uppercase tracking-tighter mb-8 leading-[0.8] relative z-10">
          Get <br/> Started.
        </h2>
        <p className="text-2xl md:text-4xl font-bold max-w-4xl mx-auto mb-16 relative z-10 border-b-8 border-black pb-8">
          One app, two roles. Download EcoPin and sign in with your assigned account.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10">
          <button className="px-12 py-6 bg-black text-[#ccff00] font-black uppercase text-3xl hover:bg-white hover:text-black transition-all border-8 border-black hover:border-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[12px] hover:translate-y-[12px]">
            Download App
          </button>
        </div>
      </section>

      <footer className="py-12 px-6 bg-black border-t-8 border-[#ccff00] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-[#ccff00] font-black text-3xl">ECOPIN<span className="text-white">.SYS</span></div>
        <div className="text-gray-400 font-mono text-sm uppercase tracking-widest text-center md:text-right">
          © 2026 ECOPIN <br/>
          PASIG CITY. ALL SYSTEMS GO.
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </main>
  );
}
