import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Printed-menu identity pieces. Everything is CSS / inline SVG and takes its
 * colour from `currentColor`, so a per-menu accent can recolour it by setting
 * `color` (or `style={{ color }}`) on the element.
 */

/** Small art-deco diamond: an outlined lozenge with a solid centre. */
export function DecoDiamond({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 16 10"
      aria-hidden
      className={cn("h-2.5 w-4 shrink-0", className)}
      style={style}
      fill="none"
    >
      <path d="M8 0.8 L15.2 5 L8 9.2 L0.8 5 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M8 3.2 L11 5 L8 6.8 L5 5 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Horizontal ornament: rule, diamond, rule. `double` stacks two hairlines on
 * each side (used under page titles). Defaults to bright brass; it is
 * decoration only and never carries meaning.
 */
export function DecoRule({
  className,
  style,
  double = false,
  short = false,
}: {
  className?: string;
  style?: CSSProperties;
  double?: boolean;
  /** A short centred ornament (~8rem) instead of full width. */
  short?: boolean;
}) {
  const line = double ? (
    <span className="flex flex-1 flex-col gap-[3px]">
      <span className="h-px bg-current" />
      <span className="h-px bg-current opacity-60" />
    </span>
  ) : (
    <span className="h-px flex-1 bg-current" />
  );
  return (
    <div
      aria-hidden
      className={cn("flex items-center gap-2 text-brass-bright", short && "mx-auto w-32", className)}
      style={style}
    >
      {line}
      <DecoDiamond className="text-current" />
      {line}
    </div>
  );
}

/**
 * Section heading: letter-spaced small caps in brass, then a hairline that
 * runs to the edge, then an optional count. Use for every list group
 * (inventory categories, recipe letters, menu sections, settings groups).
 */
export function SectionHeading({
  children,
  count,
  as: Tag = "h2",
  className,
  labelClassName,
  style,
  ruleStyle,
  id,
  testId,
  align = "left",
}: {
  children: ReactNode;
  count?: ReactNode;
  /** "center": rule, ornament, label, ornament, rule (guest menu sections). */
  align?: "left" | "center";
  as?: "h2" | "h3" | "h4" | "div";
  className?: string;
  labelClassName?: string;
  /** Colour override for the label (e.g. a menu's section header colour). */
  style?: CSSProperties;
  /** Colour override for the rule (e.g. a menu's accent colour). */
  ruleStyle?: CSSProperties;
  id?: string;
  testId?: string;
}) {
  if (align === "center") {
    return (
      <Tag id={id} data-testid={testId} className={cn("flex items-center gap-3", className)}>
        <span aria-hidden className="h-px flex-1 bg-brass-bright/70" style={ruleStyle} />
        <DecoDiamond className="text-brass-bright" style={ruleStyle ? { color: ruleStyle.backgroundColor } : undefined} />
        <span className={cn("smallcaps text-center text-brass", labelClassName)} style={style}>
          {children}
        </span>
        <DecoDiamond className="text-brass-bright" style={ruleStyle ? { color: ruleStyle.backgroundColor } : undefined} />
        <span aria-hidden className="h-px flex-1 bg-brass-bright/70" style={ruleStyle} />
      </Tag>
    );
  }
  return (
    <Tag id={id} data-testid={testId} className={cn("flex items-center gap-3", className)}>
      <span className={cn("smallcaps text-brass", labelClassName)} style={style}>
        {children}
      </span>
      <span aria-hidden className="h-px flex-1 bg-brass-bright/70" style={ruleStyle} />
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      )}
    </Tag>
  );
}

/**
 * Page masthead: serif title, a double-rule ornament, optional italic line.
 * Used on the landing list, guest menu header, login, 404 and about.
 */
export function Masthead({
  title,
  subtitle,
  eyebrow,
  className,
  titleClassName,
  titleStyle,
  ruleStyle,
  as: Tag = "h1",
  align = "center",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  ruleStyle?: CSSProperties;
  as?: "h1" | "h2";
  align?: "center" | "left";
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow && <p className="smallcaps mb-3 text-brass">{eyebrow}</p>}
      <Tag
        className={cn(
          "font-headline font-bold leading-[1.05] tracking-tight text-foreground",
          titleClassName,
        )}
        style={titleStyle}
      >
        {title}
      </Tag>
      <DecoRule
        double
        className={cn("mt-4", align === "center" ? "mx-auto max-w-[14rem]" : "max-w-[14rem]")}
        style={ruleStyle}
      />
      {subtitle && (
        <p
          className={cn(
            "mt-4 font-headline text-lg italic leading-snug text-muted-foreground",
            align === "center" && "mx-auto max-w-xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
