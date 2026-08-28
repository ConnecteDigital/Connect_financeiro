'use client'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-36 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-slate-100 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
