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
        default: "bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/25",
        secondary: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]",
        success: "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)] border border-[color:var(--color-success)]/22",
        warning: "bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)] border border-[color:var(--color-warning)]/22",
        destructive: "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)] border border-[color:var(--color-danger)]/22",
        info: "bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)] border border-[color:var(--color-accent)]/22",
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
