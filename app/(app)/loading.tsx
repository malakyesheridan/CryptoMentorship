export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  )
}

