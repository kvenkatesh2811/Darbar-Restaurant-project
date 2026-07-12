import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Star, MapPin, Clock, Phone, ChevronRight, Send, X, ChevronLeft, ChevronRight as ChevronRightIcon, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RESTAURANT_DETAILS } from "@/lib/constants";
import { useListMenuItems, useListSpecials, useListReviews, useSubmitFeedback } from "@workspace/api-client-react";
import { ReviewModal } from "@/components/ReviewModal";
import { LeadPopup } from "@/components/LeadPopup";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useToast } from "@/hooks/use-toast";
import { DishImage } from "@/components/DishImage";
import { RestaurantQRCode } from "@/components/RestaurantQRCode";

export default function Home() {
  const { data: menuItems } = useListMenuItems();
  const { data: specials } = useListSpecials();
  const { data: reviews } = useListReviews();
  const { toast } = useToast();
  const submitFeedback = useSubmitFeedback();

  const [feedbackForm, setFeedbackForm] = useState({ name: "", phone: "", comment: "", rating: 5 });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const GALLERY_PHOTOS = [
    { src: "/images/gallery-interior-dining.jpg", alt: "Dining Hall", label: "Elegant Dining Area" },
    { src: "/images/gallery-lobby.jpg", alt: "Grand Lobby", label: "Grand Lobby" },
    { src: "/images/gallery-entrance.jpg", alt: "Darbar Neon Sign", label: "Our Entrance" },
    { src: "/images/gallery-curry-closeup.jpg", alt: "Chicken Masala", label: "Signature Chicken Masala" },
    { src: "/images/gallery-chicken65.jpg", alt: "Chicken 65 Starter", label: "Crispy Chicken 65" },
    { src: "/images/gallery-biryani-bowl.jpg", alt: "Darbar Biryani", label: "Aromatic Biryani" },
    { src: "/images/gallery-curry-karahi.jpg", alt: "Chicken Curry Karahi", label: "Chicken Karahi" },
    { src: "/images/gallery-chicken-fry.jpg", alt: "Chicken Fry", label: "Spicy Chicken Fry" },
  ];

  const openLightbox = useCallback((i: number) => setLightboxIndex(i), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length : null), []);
  const nextPhoto = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % GALLERY_PHOTOS.length : null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const featuredItems = menuItems?.slice(0, 6) || [];
  const featuredSpecial = specials?.find(s => s.isActive) || specials?.[0];

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.name.trim() || !feedbackForm.comment.trim()) {
      toast({ variant: "destructive", title: "Please fill in your name and message." });
      return;
    }
    submitFeedback.mutate(
      { data: { name: feedbackForm.name, phone: feedbackForm.phone || undefined, comment: feedbackForm.comment, rating: feedbackForm.rating } },
      {
        onSuccess: () => { setFeedbackSubmitted(true); toast({ title: "Thank you for your feedback!" }); },
        onError: () => toast({ variant: "destructive", title: "Something went wrong. Please try again." }),
      }
    );
  };

  return (
    <div className="flex flex-col w-full">
      <LeadPopup />
      <FloatingWhatsApp />
      <ScrollToTop />

      {/* HERO SECTION */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-biryani.png')" }}
        />
        
        <div className="container relative z-20 mx-auto px-4 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <Badge variant="outline" className="text-white border-white/30 bg-black/30 backdrop-blur-sm px-4 py-1.5 text-sm uppercase tracking-widest font-medium mb-6">
              Welcome to Kurnool's Finest
            </Badge>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white drop-shadow-lg mb-6 leading-tight"
          >
            {RESTAURANT_DETAILS.name}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white/90 max-w-2xl font-light mb-10 drop-shadow-md"
          >
            {RESTAURANT_DETAILS.tagline}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/menu">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-xl">
                View Menu
              </Button>
            </Link>
            <a 
              href={`https://wa.me/${RESTAURANT_DETAILS.whatsappNumber}?text=${encodeURIComponent(RESTAURANT_DETAILS.whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-white/10 text-white border-white/50 hover:bg-white/20 hover:text-white backdrop-blur-sm shadow-xl">
                Order on WhatsApp
              </Button>
            </a>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/70"
        >
          <span className="text-sm font-medium tracking-widest uppercase mb-2">Scroll</span>
          <div className="w-[1px] h-12 bg-white/30 overflow-hidden">
            <motion.div 
              className="w-full h-1/2 bg-white"
              animate={{ y: [0, 48] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </div>
        </motion.div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="mb-6 flex justify-center text-primary">
            <Star className="w-6 h-6 fill-current" />
            <Star className="w-6 h-6 fill-current" />
            <Star className="w-6 h-6 fill-current" />
            <Star className="w-6 h-6 fill-current" />
            <Star className="w-6 h-6 fill-current" />
          </div>
          <blockquote className="font-serif text-3xl md:text-5xl leading-tight font-medium text-foreground mb-8">
            "Kurnool's popular destination for families to gather, celebrate, and enjoy the rich, authentic flavours of Rayalaseema."
          </blockquote>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
        </div>
      </section>

      {/* MENU PREVIEW SECTION */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-primary font-medium tracking-widest uppercase mb-2">Taste the Tradition</h2>
              <h3 className="font-serif text-4xl md:text-5xl font-bold">Popular Dishes</h3>
            </div>
            <Link href="/menu">
              <Button variant="outline" className="group">
                View Full Menu
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                <DishImage src={item.imageUrl} alt={item.name} />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                      </div>
                      <Badge variant="secondary" className="font-normal">{item.categoryName}</Badge>
                    </div>
                    <span className="font-serif text-xl font-bold text-primary">₹{item.price}</span>
                  </div>
                  <h4 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{item.name}</h4>
                  {item.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY'S SPECIAL */}
      {featuredSpecial && (
        <section className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
                <img 
                  src={featuredSpecial.imageUrl || "/images/gallery-biryani.png"} 
                  alt={featuredSpecial.dishName}
                  className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary text-white hover:bg-primary px-4 py-1.5 text-sm uppercase tracking-widest">
                    Today's Special
                  </Badge>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">{featuredSpecial.dishName}</h2>
                <div className="text-3xl font-serif text-primary font-bold mb-6">₹{featuredSpecial.price}</div>
                {featuredSpecial.description && (
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {featuredSpecial.description}
                  </p>
                )}
                <Link href="/order">
                  <Button size="lg" className="rounded-full px-8 h-12 text-base">
                    Order Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PHOTO GALLERY */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-primary font-medium tracking-widest uppercase mb-2">Atmosphere & Food</h2>
            <h3 className="font-serif text-4xl md:text-5xl font-bold">Gallery</h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Step inside Darbar — from our grand lobby to the dishes that keep guests coming back.</p>
          </div>

          {/* Masonry-style grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Row 1: wide interior + 2 stacked */}
            <div
              className="md:col-span-2 rounded-2xl overflow-hidden aspect-[16/10] group cursor-pointer relative"
              onClick={() => openLightbox(0)}
            >
              <img src={GALLERY_PHOTOS[0].src} loading="lazy" alt={GALLERY_PHOTOS[0].alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8 drop-shadow-lg" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-medium text-sm">{GALLERY_PHOTOS[0].label}</p>
              </div>
            </div>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer relative"
                onClick={() => openLightbox(i)}
              >
                <img src={GALLERY_PHOTOS[i].src} loading="lazy" alt={GALLERY_PHOTOS[i].alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-6 h-6 drop-shadow-lg" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white font-medium text-xs">{GALLERY_PHOTOS[i].label}</p>
                </div>
              </div>
            ))}

            {/* Row 2: 4 even columns */}
            {[3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer relative"
                onClick={() => openLightbox(i)}
              >
                <img src={GALLERY_PHOTOS[i].src} loading="lazy" alt={GALLERY_PHOTOS[i].alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-6 h-6 drop-shadow-lg" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white font-medium text-xs">{GALLERY_PHOTOS[i].label}</p>
                </div>
              </div>
            ))}

            {/* Last photo — 3/4 wide */}
            <div
              className="md:col-span-2 col-span-2 rounded-2xl overflow-hidden aspect-[16/9] group cursor-pointer relative"
              onClick={() => openLightbox(7)}
            >
              <img src={GALLERY_PHOTOS[7].src} loading="lazy" alt={GALLERY_PHOTOS[7].alt} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8 drop-shadow-lg" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-medium text-sm">{GALLERY_PHOTOS[7].label}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10 bg-white/10 hover:bg-white/20 rounded-full p-2"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10 bg-white/10 hover:bg-white/20 rounded-full p-2"
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10 bg-white/10 hover:bg-white/20 rounded-full p-2"
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-4 px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={GALLERY_PHOTOS[lightboxIndex].src}
              alt={GALLERY_PHOTOS[lightboxIndex].alt}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            <p className="text-white/90 font-medium text-lg">{GALLERY_PHOTOS[lightboxIndex].label}</p>
            <div className="flex gap-1.5">
              {GALLERY_PHOTOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightboxIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS SECTION */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-16 gap-8 text-center md:text-left">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">Customer Reviews</h2>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="text-5xl font-bold font-serif text-primary">{RESTAURANT_DETAILS.rating}</div>
                <div>
                  <div className="flex text-yellow-400 mb-1">
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current" />
                    <Star className="w-5 h-5 fill-current opacity-70" />
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Google Reviews</div>
                </div>
              </div>
            </div>
            <ReviewModal />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews?.slice(0, 3).map((review) => (
              <Card key={review.id} className="bg-card">
                <CardContent className="p-6">
                  <div className="flex text-yellow-400 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "opacity-30"}`} />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic leading-relaxed text-sm md:text-base">"{review.comment}"</p>
                  <div className="font-semibold">{review.customerName}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEEDBACK SECTION */}
      <section className="py-24 bg-background border-y border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-primary font-medium tracking-widest uppercase mb-2">We'd Love to Hear From You</h2>
              <h3 className="font-serif text-4xl md:text-5xl font-bold mb-6">Send Us Feedback</h3>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Your opinion helps us serve you better. Share your experience, suggestions, or anything you'd like us to know.
              </p>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span>{RESTAURANT_DETAILS.phone}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span>{RESTAURANT_DETAILS.address}</span>
                </div>
              </div>
            </div>

            <div>
              {feedbackSubmitted ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-serif text-2xl font-bold mb-2">Feedback Sent!</h4>
                  <p className="text-muted-foreground mb-6">Thank you for taking the time to share your experience with us.</p>
                  <Button variant="outline" onClick={() => { setFeedbackSubmitted(false); setFeedbackForm({ name: "", phone: "", comment: "", rating: 5 }); }}>
                    Send Another
                  </Button>
                </div>
              ) : (
                <Card className="border-border shadow-md">
                  <CardContent className="p-6">
                    <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Your Name *</label>
                          <Input
                            placeholder="Full name"
                            value={feedbackForm.name}
                            onChange={e => setFeedbackForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Phone (Optional)</label>
                          <Input
                            placeholder="+91 98765 43210"
                            value={feedbackForm.phone}
                            onChange={e => setFeedbackForm(f => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackForm(f => ({ ...f, rating: star }))}
                              className={`p-1 transition-colors ${star <= feedbackForm.rating ? "text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-200"}`}
                            >
                              <Star className="h-6 w-6 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Your Message *</label>
                        <Textarea
                          placeholder="Tell us about your experience, suggestions, or any special requests…"
                          className="min-h-[100px] resize-none"
                          value={feedbackForm.comment}
                          onChange={e => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitFeedback.isPending}>
                        <Send className="mr-2 h-4 w-4" />
                        {submitFeedback.isPending ? "Sending..." : "Send Feedback"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HOURS & LOCATION & CONTACT */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Opening Hours */}
            <div className="space-y-8">
              <div>
                <h3 className="font-serif text-3xl font-bold mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  Opening Hours
                </h3>
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-xl border border-border">
                    <div className="text-primary font-medium tracking-widest uppercase mb-1 text-sm">Lunch</div>
                    <div className="font-serif text-xl font-bold">{RESTAURANT_DETAILS.hours.lunch}</div>
                  </div>
                  <div className="bg-muted p-6 rounded-xl border border-border">
                    <div className="text-primary font-medium tracking-widest uppercase mb-1 text-sm">Dinner</div>
                    <div className="font-serif text-xl font-bold">{RESTAURANT_DETAILS.hours.dinner}</div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center italic mt-4">Open all 7 days of the week</p>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-3xl font-bold mb-6 flex items-center gap-3">
                  <Phone className="w-6 h-6 text-primary" />
                  Contact Us
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <span className="text-muted-foreground leading-relaxed">{RESTAURANT_DETAILS.address}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-lg">{RESTAURANT_DETAILS.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-6 rounded-xl border border-border flex flex-col sm:flex-row items-center gap-4">
                <RestaurantQRCode path="/" size={88} showActions={false} />
                <div className="text-center sm:text-left">
                  <h4 className="font-serif font-bold text-lg mb-1">Save Our Restaurant</h4>
                  <p className="text-sm text-muted-foreground">Scan to keep Darbar's menu and location handy on your phone.</p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-border shadow-md h-[400px] lg:h-auto min-h-[400px]">
              <iframe 
                src={RESTAURANT_DETAILS.mapUrl}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Darbar Restaurant Location"
              ></iframe>
            </div>

          </div>
        </div>
      </section>

      {/* SCAN TO EXPLORE MENU */}
      <section className="py-24 bg-card border-t border-border">
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <h2 className="text-primary font-medium tracking-widest uppercase mb-2">Take It With You</h2>
          <h3 className="font-serif text-4xl md:text-5xl font-bold mb-4">Scan to Explore Our Menu</h3>
          <p className="text-muted-foreground max-w-xl mb-10">
            Open our full menu, order online, or share it with friends — just point your camera at the code below.
          </p>
          <RestaurantQRCode path="/menu" size={180} />
        </div>
      </section>
    </div>
  );
}
