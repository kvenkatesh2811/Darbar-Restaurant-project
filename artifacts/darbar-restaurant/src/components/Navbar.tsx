import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, UserButton } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

export function Navbar() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { isSignedIn } = useUser();

  const { data: adminStatus } = useQuery({
    queryKey: ["admin-status", isSignedIn],
    queryFn: async () => {
      if (!isSignedIn) return { isAdmin: false };
      const res = await fetch("/api/admin/check-status");
      if (!res.ok) return { isAdmin: false };
      return res.json() as Promise<{ isAdmin: boolean }>;
    },
    enabled: !!isSignedIn,
  });

  const isAdmin = adminStatus?.isAdmin ?? false;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/order", label: "Order Online" },
    ...(isSignedIn ? [{ href: "/order/history", label: "My Orders" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin Panel" }] : []),
  ];

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      location === href
        ? "text-primary"
        : isScrolled || location !== "/"
        ? "text-foreground"
        : "text-white/90 hover:text-white drop-shadow-sm"
    }`;

  const mobileLinkClass = (href: string) =>
    `text-base font-medium py-2 px-4 rounded-md transition-colors ${
      location === href ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || location !== "/"
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/darbar-logo.png"
            alt="Darbar Multi-Cuisine Restaurant"
            className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-xl shadow-md border border-amber-500/30 transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className={`font-serif text-xl md:text-2xl font-bold tracking-tight leading-none ${isScrolled || location !== "/" ? "text-primary" : "text-white drop-shadow-md"}`}>
              Darbar
            </span>
            <span className={`text-[10px] tracking-widest uppercase font-semibold mt-0.5 ${isScrolled || location !== "/" ? "text-amber-600 dark:text-amber-400" : "text-amber-300 drop-shadow-sm"}`}>
              Multi-Cuisine
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <UserButton userProfileMode="modal" />
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className={isScrolled || location !== "/" ? "" : "text-white hover:bg-white/20 hover:text-white"}>
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="rounded-full">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={isScrolled || location !== "/" ? "" : "text-white hover:bg-white/20 hover:text-white"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden flex items-center gap-2">
          {isSignedIn && <UserButton userProfileMode="modal" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={isScrolled || location !== "/" ? "" : "text-white hover:bg-white/20 hover:text-white"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={isScrolled || location !== "/" ? "" : "text-white hover:bg-white/20 hover:text-white"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={mobileLinkClass(link.href)}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
