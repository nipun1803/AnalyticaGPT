import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-primary)] text-[var(--color-background)] hover:brightness-110 shadow-sm shadow-black/20 dark:shadow-black/40",
        secondary:
          "bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:border-[color:var(--color-primary)]/40",
        outline:
          "border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
        ghost:
          "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
        destructive:
          "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)] border border-[color:var(--color-danger)]/22 hover:bg-[color:var(--color-danger)]/18",
        success:
          "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)] border border-[color:var(--color-success)]/22 hover:bg-[color:var(--color-success)]/18",
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
