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
        "flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500",
        "focus:outline-none focus:ring-2 focus:ring-violet-600/40 focus:border-orange-600",
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
