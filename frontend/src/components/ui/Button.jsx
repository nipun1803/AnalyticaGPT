/**
 * shadcn-style Button primitive with variants.
 */

import { cn } from "../../lib/utils";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30",
        secondary: "bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600",
        outline: "border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100",
        ghost: "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100",
        destructive: "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30",
        success: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = forwardRef(({ className, variant, size, loading, children, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
