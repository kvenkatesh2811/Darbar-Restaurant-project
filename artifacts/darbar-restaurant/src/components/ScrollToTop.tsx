import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-6 left-6 z-50 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 animate-in zoom-in fade-in"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      data-testid="button-scroll-top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
