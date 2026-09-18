import Navbar from '@/components/layout/Navbar'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-background dark:bg-[#0a0f08] font-sans page-gradient">
      <Navbar />
      <div className="relative w-full overflow-hidden">
        {children}

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-10 w-64 h-64 rounded-full border border-accent-green/10 z-0"></div>
        <div className="absolute top-1/3 right-20 w-96 h-96 rounded-full border border-accent-green/5 z-0"></div>
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-accent-green/5 blur-3xl z-0"></div>
      </div>
    </div>
  )
}
