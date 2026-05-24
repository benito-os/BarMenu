import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SplashScreen, useSplashScreen } from "@/components/SplashScreen";
import type { Menu } from "@shared/validation";
import heroImage from "@assets/generated_images/Bar_hero_cocktails_overhead_0be3299c.png";
import { Calendar, Sparkles } from "lucide-react";

export default function Landing() {
  const { data: menus, isLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
  });
  const { showSplash, dismissSplash } = useSplashScreen();

  const activeMenu = menus?.find(m => m.isActive);

  return (
    <div className="min-h-screen bg-background">
      <SplashScreen 
        show={showSplash} 
        onComplete={dismissSplash}
        duration={2500}
      />
      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Craft cocktails at Bar Flores"
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
          fetchPriority="high"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        
        {/* Hero content */}
        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
            Bar Flores
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl">
            Whimsical drinks with friends
          </p>
          {activeMenu && (
            <Link href={`/menu/${activeMenu.slug}`}>
              <Button 
                size="lg" 
                className="text-base px-8"
                data-testid="button-view-tonights-menu"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                View Tonight's Menu
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Menu Grid Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold text-foreground mb-2 uppercase tracking-wide">
            Our Menus
          </h2>
          <p className="text-muted-foreground">
            Explore our curated collection of seasonal and event-specific cocktail experiences
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menus?.map((menu) => (
              <Link key={menu.id} href={`/menu/${menu.slug}`}>
                <Card 
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all h-full"
                  data-testid={`card-menu-${menu.slug}`}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-serif text-2xl text-foreground">
                        {menu.name}
                      </CardTitle>
                      {menu.isActive && (
                        <Badge 
                          variant="default" 
                          className="shrink-0"
                          data-testid="badge-active-tonight"
                        >
                          Active Tonight
                        </Badge>
                      )}
                    </div>
                    {menu.description && (
                      <CardDescription className="text-base leading-relaxed">
                        {menu.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto"
                      data-testid={`button-view-menu-${menu.slug}`}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Menu
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && menus?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No menus available at the moment. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
