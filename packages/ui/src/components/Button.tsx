import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
    
    const variants: Record<string, string> = {
      primary: "bg-white text-black hover:bg-gray-100 focus:ring-gray-500",
      secondary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      outline: "border border-white/10 bg-transparent hover:bg-white/5 text-white",
      ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
    }

    const sizes: Record<string, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6",
      lg: "h-14 px-8 text-lg"
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant] || ''} ${sizes[size] || ''} ${className || ''}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
