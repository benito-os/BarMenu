import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SplashScreen, useSplashScreen } from "@/components/SplashScreen";
import { useSettings } from "@/hooks/useSettings";
import type { Menu } from "@shared/validation";
import heroImage from "@assets/generated_images/Bar_hero_cocktails_overhead_0be3299c.webp";
import { ArrowRight, RefreshCw } from "lucide-react";
import { DecoRule, Masthead } from "@/components/brand/Deco";

export default function Landing() {
  const { data: menus, isLoading, isError, refetch } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });
  const { settings, barName } = useSettings();
  const { showSplash, dismissSplash } = useSplashScreen();

  const activeMenu = menus?.find(m => m.isActive);
  // Brand settings come from /dashboard/settings. Logo + welcome message
  // replace the default brand mark + tagline; fonts come from the global
  // CSS variables set by useApplyBrandSettings in App.tsx.
  const brandLogo = settings.brandingLogoUrl;
  const tagline = settings.welcomeMessage || "Whimsical drinks with friends";

  return (
    <div className="min-h-screen bg-background">
      <SplashScreen 
        show={showSplash} 
        onComplete={dismissSplash}
      />
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img
          src={heroImage}
          alt={`Craft cocktails at ${barName}`}
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
          width={1408}
          height={768}
          fetchPriority="high"
        />
        {/* Warm ink overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/55 to-ink/80" />
        
        {/* Hero content */}
        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={barName}
              className="h-24 md:h-32 lg:h-40 w-auto mb-4 drop-shadow-lg"
              data-testid="landing-brand-logo"
            />
          ) : (
            <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-bold text-paper tracking-tight">
              {barName}
            </h1>
          )}
          {/* Gold on ink: the logo's own colours. Decoration only. */}
          <DecoRule double className="mx-auto mt-5 mb-5 w-full max-w-[15rem] text-gold" />
          <p className="font-headline italic text-xl md:text-2xl text-paper/90 mb-9 max-w-2xl">
            {tagline}
          </p>
          {activeMenu && (
            <Link href={`/menu/${activeMenu.slug}`}>
              <Button
                size="lg"
                className="min-h-12 px-8 text-base font-semibold bg-paper text-ink border-paper shadow-[inset_0_0_0_2px_hsl(var(--paper)),inset_0_0_0_3px_hsl(var(--brass)/0.7)] hover:bg-paper"
                data-testid="button-view-tonights-menu"
              >
                View Tonight&rsquo;s Menu
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Menu Grid Section */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 md:py-20">
        <Masthead
          as="h2"
          eyebrow="The list"
          title="Our Menus"
          titleClassName="text-4xl md:text-5xl"
          subtitle="Seasonal and event menus, each one its own little card."
          className="mb-10"
        />

        {isError ? (
          <div className="text-center py-16 space-y-4" role="alert" data-testid="menus-load-error">
            <p className="text-lg font-medium text-foreground">Couldn't load the menus</p>
            <p className="text-muted-foreground">Check your connection and try again.</p>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => refetch()}
              data-testid="button-retry-menus"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="menu-rows border-y border-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-6 space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : (
          // A table of contents, not a grid of cards: each menu is a ruled
          // entry. The menu's own accent marks its diamond and tonight badge;
          // its title colour (if set) colours its name.
          <ul className="menu-rows border-y border-border">
            {menus?.map((menu) => (
              <li key={menu.id}>
                <Link
                  href={`/menu/${menu.slug}`}
                  className="group block py-6 md:py-7 hover-elevate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  data-testid={`card-menu-${menu.slug}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-3 h-2 w-2 shrink-0 rotate-45 bg-brass-bright"
                      style={menu.accentColor ? { backgroundColor: menu.accentColor } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3
                          className="font-headline text-[1.75rem] md:text-3xl font-semibold leading-tight text-foreground"
                          style={{ color: menu.menuTitleColor || undefined }}
                        >
                          {menu.name}
                        </h3>
                        {menu.isActive && (
                          // Tinted with the menu's accent when it has one
                          // (assumes the admin picked an accent that holds
                          // cream text); otherwise the ember "live" mark.
                          <Badge
                            variant="live"
                            className="shrink-0 uppercase tracking-[0.12em] text-[0.625rem] translate-y-[-3px]"
                            style={
                              menu.accentColor
                                ? { backgroundColor: menu.accentColor, color: "hsl(var(--paper))" }
                                : undefined
                            }
                            data-testid="badge-active-tonight"
                          >
                            Tonight
                          </Badge>
                        )}
                      </div>
                      {menu.description && (
                        <p className="font-body mt-2 text-base leading-relaxed text-foreground/75">
                          {menu.description}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        tabIndex={-1}
                        className="mt-3 -ml-3 min-h-11 px-3 text-sm font-semibold text-brass group-hover:text-foreground"
                        data-testid={`button-view-menu-${menu.slug}`}
                      >
                        View menu
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && menus?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No menus available at the moment. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Public footer with a discoverable About link. Curious guests and
          forkers landing on the site can find the project's source from
          here without having to know the /about URL. */}
      <footer className="rule-double mt-4">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground font-body">
          <span>© {new Date().getFullYear()} {barName}</span>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center underline decoration-brass/40 underline-offset-4 hover:text-foreground transition-colors"
            data-testid="link-about"
          >
            About this project
          </Link>
        </div>
      </footer>
    </div>
  );
}
