import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

interface DishImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Shared image renderer for menu dishes. Shows a soft skeleton while loading,
 * lazy-loads off-screen images, and falls back to a utensils icon on
 * missing/broken URLs so the UI never shows a broken-image glyph.
 */
export function DishImage({ src, alt, className, iconClassName }: DishImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showFallback = !src || errored;

  return (
    <div className={cn("relative w-full aspect-video overflow-hidden bg-muted", className)}>
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <UtensilsCrossed className={cn("h-8 w-8 text-muted-foreground/40", iconClassName)} />
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        </>
      )}
    </div>
  );
}
