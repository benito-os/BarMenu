import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate " ,
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: " border border-[color:var(--badge-outline)]",
        // Status stamps: tinted paper, dark ink of the same hue, a firmer
        // edge. Distinct at a glance without app-store saturation.
        info: "border-info/40 bg-info-soft text-info-soft-foreground",
        warning: "border-warning/45 bg-warning-soft text-warning-soft-foreground",
        success: "border-success/40 bg-success-soft text-success-soft-foreground",
        danger: "border-destructive/40 bg-destructive-soft text-destructive-soft-foreground",
        live: "border-transparent bg-ember text-ember-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
