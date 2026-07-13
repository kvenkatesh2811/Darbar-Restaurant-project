import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, Clock, Phone, User, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListMenuItems, useListCategories, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DishImage } from "@/components/DishImage";
import { RestaurantQRCode } from "@/components/RestaurantQRCode";

const orderFormSchema = z.object({
  customerName: z.string().min(2, { message: "Name is required" }),
  phone: z.string().min(10, { message: "Valid phone number is required" }),
  pickupTime: z.string().min(1, { message: "Please select a pickup time" }),
  notes: z.string().optional(),
});

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  imageUrl?: string | null;
};

const PICKUP_SLOTS = [
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM",
];

const CART_STORAGE_KEY = "darbar-order-cart";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash on Pickup" },
  { id: "upi", label: "UPI" },
  { id: "gpay", label: "Google Pay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
] as const;

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Order() {
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: menuItems, isLoading: loadingItems } = useListMenuItems();
  const { data: categories, isLoading: loadingCats } = useListCategories();

  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0].id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }, [cart]);

  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].slug);
    }
  }, [categories, activeCategory]);

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: { customerName: "", phone: "", pickupTime: "", notes: "" },
  });

  const filteredItems = menuItems?.filter(item => item.categorySlug === activeCategory) || [];

  const addToCart = (item: typeof menuItems extends (infer T)[] | undefined ? T : never) => {
    if (!item) return;
    const itemId = item.id.toString();
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: itemId, name: item.name, price: Number(item.price), quantity: 1, isVeg: item.isVeg, imageUrl: item.imageUrl }];
    });
    toast({ title: "Added to cart", description: `${item.name} added.`, duration: 1500 });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = subtotal * 0.05;
  const total = subtotal + taxes;

  const onSubmit = (values: z.infer<typeof orderFormSchema>) => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Cart is empty", description: "Please add some items first." });
      return;
    }
    const paymentLabel = PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || "Cash on Pickup";
    const notesWithPayment = [values.notes?.trim(), `Payment method: ${paymentLabel}`].filter(Boolean).join(" | ");
    createOrder.mutate(
      {
        data: {
          ...values,
          notes: notesWithPayment,
          items: cart.map(item => ({
            menuItemId: parseInt(item.id),
            menuItemName: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Order placed successfully", description: "We'll have it ready for pickup soon." });
          setIsSuccess(true);
          clearCart();
          window.scrollTo(0, 0);
        },
        onError: () => toast({ variant: "destructive", title: "Order failed", description: "Please try again." }),
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-24 pb-12 bg-background">
        <Card className="w-full max-w-md mx-4 text-center border-border shadow-xl animate-in zoom-in fade-in duration-500">
          <CardContent className="pt-10 pb-8 px-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-4">Order Placed!</h2>
            <p className="text-muted-foreground mb-8">
              Thank you for choosing Darbar. Your order has been received and will be ready for pickup at your selected time.
            </p>
            <div className="space-y-4">
              <Button className="w-full" onClick={() => setIsSuccess(false)}>Place Another Order</Button>
              <Link href="/"><Button variant="outline" className="w-full">Return to Home</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingItems || loadingCats;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Order for Pickup</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select your favourite dishes and pick them up hot and fresh from our restaurant.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Menu Selection */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xl font-bold font-serif flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Browse Menu
            </h3>

            {/* Category Tabs */}
            {isLoading ? (
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {categories?.map(cat => (
                  <button
                    key={cat.slug}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      activeCategory === cat.slug
                        ? "bg-primary text-white border-primary"
                        : "bg-background border-border text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items Grid */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredItems.map(item => {
                  const cartItem = cart.find(c => c.id === item.id.toString());
                  return (
                    <Card key={item.id} className={`overflow-hidden hover:border-primary/50 transition-colors ${!item.isAvailable ? "opacity-60" : ""}`}>
                      <DishImage src={item.imageUrl} alt={item.name} className="aspect-[16/10]" />
                      <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                        <div>
                          <div className="flex items-start gap-2 mb-1">
                            <div className={`shrink-0 w-4 h-4 mt-0.5 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold leading-tight">{item.name}</h4>
                              {item.categoryName && (
                                <Badge variant="secondary" className="font-normal text-[10px] mt-1">{item.categoryName}</Badge>
                              )}
                              {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                            </div>
                          </div>
                          <div className="font-bold text-primary ml-6">₹{item.price}</div>
                        </div>

                        {!item.isAvailable ? (
                          <Badge variant="secondary" className="w-fit">Out of Stock</Badge>
                        ) : cartItem ? (
                          <div className="flex items-center justify-between bg-muted rounded-lg p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id.toString(), -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-bold text-sm w-8 text-center">{cartItem.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id.toString(), 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => addToCart(item)}>
                            <Plus className="h-3 w-3 mr-1" /> Add to Order
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredItems.length === 0 && !isLoading && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No items in this category.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart & Checkout */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <Card className="border-border shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border pb-4">
                  <CardTitle className="font-serif text-2xl flex justify-between items-center gap-2">
                    <span className="flex items-center gap-2">
                      Your Order
                      <Badge variant="secondary" className="font-sans text-sm">{cartCount} items</Badge>
                    </span>
                    {cart.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive font-sans h-auto py-1 px-2"
                        onClick={clearCart}
                      >
                        Clear Cart
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cart.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
                      <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                      <p>Your cart is empty.</p>
                      <p className="text-sm mt-1">Add items from the menu to get started.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col max-h-[35vh] overflow-y-auto p-4 space-y-3">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center gap-3">
                          <DishImage
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 aspect-square rounded-md shrink-0"
                            iconClassName="h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={`shrink-0 w-3 h-3 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                              </div>
                              <h5 className="font-medium text-sm truncate">{item.name}</h5>
                            </div>
                            <div className="text-muted-foreground text-xs ml-4">₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center bg-muted rounded-md border border-border">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => updateQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => updateQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className="px-4 pb-4 pt-2 border-t border-border space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (5%)</span><span>₹{taxes.toFixed(0)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span><span className="text-primary">₹{total.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkout Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-xl">Your Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" />Name</FormLabel>
                            <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" />Phone</FormLabel>
                            <FormControl><Input placeholder="+91 98765 43210" type="tel" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickupTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4" />Pickup Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select pickup time" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PICKUP_SLOTS.map(slot => (
                                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Instructions (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="Any dietary requirements or special requests?" className="min-h-[70px] resize-none" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />

                      <div>
                        <Label className="flex items-center gap-2 mb-3"><CreditCard className="h-4 w-4" />Payment Method</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {PAYMENT_METHODS.map(method => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method.id)}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                paymentMethod === method.id
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border text-foreground hover:border-primary/50"
                              }`}
                            >
                              <span
                                className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  paymentMethod === method.id ? "border-primary" : "border-muted-foreground/40"
                                }`}
                              >
                                {paymentMethod === method.id && <span className="w-2 h-2 rounded-full bg-primary" />}
                              </span>
                              {method.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5" />
                          You'll pay at pickup — online payment is coming soon.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        disabled={createOrder.isPending || cart.length === 0}
                      >
                        {createOrder.isPending ? "Placing Order..." : `Place Order${cart.length > 0 ? ` · ₹${total.toFixed(0)}` : ""}`}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-6">
                  <RestaurantQRCode
                    path="/order"
                    size={128}
                    title="Scan & Share"
                    subtitle="Point your camera here to reopen this order page on your phone."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
