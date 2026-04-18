import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "success" | "secondary"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseBorder = "border-b-[4px]";
    const activeTransform = "active:border-b-0 active:translate-y-[4px]";
    
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md",
          baseBorder,
          activeTransform,
          {
            "bg-blue-500 text-white border-blue-700 hover:brightness-110": variant === "default",
            "bg-green-500 text-white border-green-700 hover:brightness-110": variant === "success",
            "bg-orange-500 text-white border-orange-700 hover:brightness-110": variant === "secondary",
            "bg-white text-gray-900 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-950": variant === "outline",
            "bg-transparent text-gray-900 dark:text-gray-100 border-transparent active:translate-y-0 active:border-b-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800": variant === "ghost",
            "bg-red-500 text-white border-red-700 hover:brightness-110": variant === "destructive",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-11 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
