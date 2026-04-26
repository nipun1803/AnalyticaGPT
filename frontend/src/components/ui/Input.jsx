/**
 * shadcn-style Input primitive.
 */

import { cn } from "../../lib/utils";
import { forwardRef } from "react";

const Input = forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/25 focus:border-[var(--color-primary)]",
        "transition-all duration-200 disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
