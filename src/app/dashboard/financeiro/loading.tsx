'use client'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-44 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 w-full bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
