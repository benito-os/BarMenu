import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Paper card. Not a box:
 * - "ruled" (default): a section on the paper itself, opened by one faint
 *   hairline that fades at both ends. Header/content have no side padding so
 *   text lines up with the page, like a section of a printed menu.
 * - "framed": a sheet of lighter card stock lying on the page: soft corners,
 *   a warm diffuse shadow, no outline. For the few places that need a real
 *   container (login, the guest's order ticket).
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "ruled" | "framed" }
>(({ className, variant = "ruled", ...props }, ref) => (
  <div
    ref={ref}
    data-card-variant={variant}
    className={cn(
      "shadcn-card group/card text-card-foreground",
      variant === "ruled"
        ? "rule-fade bg-transparent"
        : "rounded-2xl bg-popover shadow-md [&>[data-card-part]]:px-6",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-card-part=""
    className={cn("flex flex-col space-y-1.5 py-5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "font-headline text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-card-part="" className={cn("pb-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-card-part=""
    className={cn("flex items-center pb-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
