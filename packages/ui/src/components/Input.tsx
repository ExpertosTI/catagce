import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm 
            placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
            focus:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500 focus:border-red-500' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"
