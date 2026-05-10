import * as React from "react"

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`rounded-3xl border border-white/10 bg-white/5 p-6 ${className}`}>
    {children}
  </div>
)

export const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h3 className={`text-lg font-bold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
)

export const CardDescription = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <p className={`text-sm text-gray-400 ${className}`}>
    {children}
  </p>
)
