/**
 * shadcn-style Button primitive with variants.
 */

import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { buttonVariants } from "./buttonVariants";

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

export { Button };
