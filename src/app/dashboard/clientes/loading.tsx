'use client'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-36 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="h-40 w-full bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
