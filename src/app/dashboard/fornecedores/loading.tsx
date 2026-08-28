'use client'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-36 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-14 w-full bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
