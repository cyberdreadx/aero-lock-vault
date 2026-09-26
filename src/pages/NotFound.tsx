import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <AppHeader />
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="absolute inset-0 bg-grid mask-fade-b pointer-events-none" aria-hidden />
        <div className="relative text-center space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">error</p>
          <h1 className="font-mono text-7xl sm:text-9xl font-medium tracking-tighter">404</h1>
          <p className="text-sm text-muted-foreground">
            nothing locked at <span className="font-mono text-foreground break-all">{location.pathname}</span>
          </p>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" /> back home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
