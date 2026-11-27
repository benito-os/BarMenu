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
 * Horizontal ornament: hairline, diamond, hairline. The lines taper to
 * nothing at their outer ends, so the ornament never reads as a ruled box
 * edge. Page-level punctuation only (page titles, the splash); section
 * headings do not get it. Defaults to bright brass; decoration only, never
 * carries meaning.
 */
export function DecoRule({
  className,
  style,
  short = false,
}: {
  className?: string;
  style?: CSSProperties;
  /** A short centred ornament (~8rem) instead of full width. */
  short?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("flex items-center gap-2 text-brass-bright", short && "mx-auto w-32", className)}
      style={style}
    >
      <span className="h-px flex-1 bg-gradient-to-l from-current to-transparent" />
      <DecoDiamond className="text-current" />
      <span className="h-px flex-1 bg-gradient-to-r from-current to-transparent" />
    </div>
  );
}

/** A hairline that fades out toward `to` ("r" fades rightward). */
function FadeLine({ to, style }: { to: "l" | "r"; style?: CSSProperties }) {
  // A colour override arrives as backgroundColor; turn it into the start of
  // the fade so a menu accent still tints the line.
  const c = style?.backgroundColor as string | undefined;
  return (
    <span
      aria-hidden
      className={cn(
        "h-px flex-1",
        !c && (to === "r" ? "bg-gradient-to-r" : "bg-gradient-to-l"),
        !c && "from-brass-bright/60 to-transparent",
      )}
      style={c ? { backgroundImage: `linear-gradient(to ${to === "r" ? "right" : "left"}, ${c}, transparent)`, opacity: 0.6 } : undefined}
    />
  );
}

/**
 * Section heading: letter-spaced small caps in brass, then a hairline that
 * fades out before the edge, then an optional count. Use for list groups
 * (inventory categories, drink sections, menu sections).
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
  /** "center": fading rule, label, fading rule (guest menu sections). */
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
      <Tag id={id} data-testid={testId} className={cn("flex items-center gap-4", className)}>
        <FadeLine to="l" style={ruleStyle} />
        <span className={cn("smallcaps text-center text-brass", labelClassName)} style={style}>
          {children}
        </span>
        <FadeLine to="r" style={ruleStyle} />
      </Tag>
    );
  }
  return (
    <Tag id={id} data-testid={testId} className={cn("flex items-center gap-3", className)}>
      <span className={cn("smallcaps text-brass", labelClassName)} style={style}>
        {children}
      </span>
      <FadeLine to="r" style={ruleStyle} />
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      )}
    </Tag>
  );
}

/**
 * Page masthead: serif title, the tapered ornament, optional italic line.
 */
export function Masthead({
  title,
  subtitle,
  className,
  titleClassName,
  titleStyle,
  ruleStyle,
  as: Tag = "h1",
  align = "center",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  ruleStyle?: CSSProperties;
  as?: "h1" | "h2";
  align?: "center" | "left";
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
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
