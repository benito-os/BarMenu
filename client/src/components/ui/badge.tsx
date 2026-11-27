import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate " ,
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary: "bg-wash text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        // No outlines: a quiet cream wash with muted ink.
        outline: "bg-wash text-foreground/80",
        // Status: soft tinted pills, dark ink of the same hue. Distinct at a
        // glance without stamps or hard edges.
        info: "bg-info-soft text-info-soft-foreground",
        warning: "bg-warning-soft text-warning-soft-foreground",
        success: "bg-success-soft text-success-soft-foreground",
        danger: "bg-destructive-soft text-destructive-soft-foreground",
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
