/**
 * shadcn-style Badge component.
 */

import { cn } from "../../lib/utils";
import { cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-orange-600/20 text-orange-300 border border-orange-600/30",
        secondary: "bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700",
        success: "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25",
        warning: "bg-amber-600/15 text-amber-400 border border-amber-600/25",
        destructive: "bg-red-600/15 text-red-400 border border-red-600/25",
        info: "bg-sky-600/15 text-sky-400 border border-sky-600/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
