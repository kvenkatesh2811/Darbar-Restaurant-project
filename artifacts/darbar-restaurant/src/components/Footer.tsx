import { Link } from "wouter";
import { RESTAURANT_DETAILS } from "@/lib/constants";
import { Facebook, Instagram, Twitter, MapPin, Phone, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-serif text-3xl font-bold text-primary mb-4">{RESTAURANT_DETAILS.name}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {RESTAURANT_DETAILS.tagline}. We bring you the authentic taste of South India with premium hospitality and a warm family atmosphere.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/menu" className="text-muted-foreground hover:text-primary transition-colors">Full Menu</Link>
              </li>
              <li>
                <Link href="/order" className="text-muted-foreground hover:text-primary transition-colors">Order Online</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Contact Info</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{RESTAURANT_DETAILS.address}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span>{RESTAURANT_DETAILS.phone}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p>Lunch: {RESTAURANT_DETAILS.hours.lunch}</p>
                  <p>Dinner: {RESTAURANT_DETAILS.hours.dinner}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between">
          <p>&copy; {new Date().getFullYear()} {RESTAURANT_DETAILS.name}. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
