import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { RESTAURANT_DETAILS } from "@/lib/constants";

export function FloatingWhatsApp() {
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

  if (!isVisible) return null;

  return (
    <a
      href={`https://wa.me/${RESTAURANT_DETAILS.whatsappNumber}?text=${encodeURIComponent(RESTAURANT_DETAILS.whatsappMessage)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 p-4 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center animate-in zoom-in fade-in"
      aria-label="Order on WhatsApp"
      data-testid="button-whatsapp-floating"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
