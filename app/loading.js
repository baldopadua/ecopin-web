export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
      <img src="/Solo Logo Light.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse dark:hidden" />
      <img src="/Solo Logo Dark.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse hidden dark:block" />
    </div>
  );
}
