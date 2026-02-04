import * as React from "react"
import { cn } from "@/core/format"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "neutral"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    // Default: White text on dark gray (reversed from typical)
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    
    // Secondary: Light gray on dark
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    
    // Destructive: No longer red. Dark gray with white border or just distinct gray.
    // User requested "grayscale + minimal highlight".
    // "Loss" -> Gray background, White text.
    destructive: "border border-white/20 bg-zinc-900 text-zinc-300", 
    
    // Success: No longer green. White background, Black text (High contrast for "Profit/Win").
    success: "border-transparent bg-white text-black hover:bg-white/90",
    
    outline: "text-foreground border border-white/20",
    
    // Neutral: for "WAIT" or standard tags
    neutral: "bg-zinc-800 text-zinc-400 border border-transparent"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
