import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background font-sans min-h-screen">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center px-6 py-12 sm:items-start">
        <div className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left w-full">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
              EcoPin A.I.
            </h1>
            <p className="text-lg text-text-secondary max-w-xl">
              Crowdsourced Environmental Reporting Platform
            </p>
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row w-full sm:w-auto">
            <a
              className="btn-primary text-center"
              href="/auth"
            >
              Get Started
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
