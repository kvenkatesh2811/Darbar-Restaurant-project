import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Trash2, Plus, Minus, ShoppingBag, Clock, Phone, User, CheckCircle2,
  CreditCard, Wallet, Star, Flame, Sparkles, Bike, Store, MapPin, Home as HomeIcon,
  History, PackageCheck, Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListMenuItems, useListCategories, useListSpecials, useCreateOrder,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DishImage } from "@/components/DishImage";
import { RestaurantQRCode } from "@/components/RestaurantQRCode";

const PICKUP_SLOTS = [
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM",
];

const CART_STORAGE_KEY = "darbar-order-cart";
const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_THRESHOLD = 500;

const PAYMENT_METHODS_PICKUP = [
  { id: "cash", label: "Cash on Pickup", icon: Wallet },
  { id: "upi", label: "UPI", icon: CreditCard },
  { id: "gpay", label: "Google Pay", icon: CreditCard },
  { id: "phonepe", label: "PhonePe", icon: CreditCard },
  { id: "paytm", label: "Paytm", icon: CreditCard },
  { id: "razorpay", label: "Razorpay", icon: CreditCard },
] as const;

const PAYMENT_METHODS_DELIVERY = [
  { id: "cod", label: "Cash on Delivery", icon: Wallet },
  { id: "upi", label: "UPI", icon: CreditCard },
  { id: "gpay", label: "Google Pay", icon: CreditCard },
  { id: "phonepe", label: "PhonePe", icon: CreditCard },
  { id: "paytm", label: "Paytm", icon: CreditCard },
  { id: "razorpay", label: "Razorpay", icon: CreditCard },
] as const;

type OrderType = "pickup" | "delivery";

type FormValues = {
  customerName: string;
  phone: string;
  email: string;
  pickupTime?: string;
  notes?: string;
  houseNumber?: string;
  street?: string;
  area?: string;
  city?: string;
  landmark?: string;
  pincode?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  imageUrl?: string | null;
};

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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
      {rating.toFixed(1)}
    </span>
  );
}

export default function Order() {
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const createOrder = useCreateOrder();
  const { data: menuItems, isLoading: loadingItems } = useListMenuItems();
  const { data: categories, isLoading: loadingCats } = useListCategories();
  const { data: specials } = useListSpecials();

  const queryClient = useQueryClient();
  const [redeemReward, setRedeemReward] = useState(false);

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty-progress", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/loyalty");
      if (!res.ok) throw new Error("Failed to fetch loyalty");
      return res.json() as Promise<{
        progress: {
          totalCompletedOrders: number;
          visitCount: number;
          currentProgress: number;
          availableRewards: number;
          redeemedRewards: number;
          birthdayDiscountEligibility: boolean;
          lastUpdated: string;
        };
        rewards: any[];
      }>;
    },
    enabled: !!user?.id,
  });

  const hasAvailableReward = useMemo(() => {
    return !!(loyalty?.progress?.availableRewards && loyalty.progress.availableRewards > 0);
  }, [loyalty]);

  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    id: number;
    status: string;
    orderType: OrderType;
    totalAmount: number;
    paymentMethod: string;
    prepTimeMinutes: number;
    estimatedMinutes: number;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [cartOpen, setCartOpen] = useState(false);
  const [bumpId, setBumpId] = useState<string | null>(null);

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
      setActiveCategory("all");
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    setPaymentMethod(orderType === "delivery" ? "cod" : "cash");
  }, [orderType]);

  const schema = useMemo(() => {
    return z.object({
      customerName: z.string().min(2, { message: "Name is required" }),
      phone: z.string().min(10, { message: "Valid phone number is required" }),
      email: z.string().email({ message: "Valid email is required" }),
      notes: z.string().optional(),
      pickupTime: orderType === "pickup"
        ? z.string().min(1, { message: "Pickup time is required" })
        : z.string().optional(),
      houseNumber: orderType === "delivery"
        ? z.string().min(1, { message: "House/Flat No. is required" })
        : z.string().optional(),
      street: orderType === "delivery"
        ? z.string().min(1, { message: "Street is required" })
        : z.string().optional(),
      area: orderType === "delivery"
        ? z.string().min(1, { message: "Area is required" })
        : z.string().optional(),
      city: orderType === "delivery"
        ? z.string().min(1, { message: "City is required" })
        : z.string().optional(),
      pincode: orderType === "delivery"
        ? z.string().min(6, { message: "Valid pincode is required" })
        : z.string().optional(),
      landmark: z.string().optional(),
    });
  }, [orderType]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      pickupTime: "",
      notes: "",
      houseNumber: "",
      street: "",
      area: "",
      city: "",
      landmark: "",
      pincode: "",
    },
  });

  useEffect(() => {
    form.clearErrors();
  }, [orderType, form]);

  const todaysSpecialNames = useMemo(
    () => new Set((specials ?? []).filter(s => s.isActive).map(s => s.dishName.toLowerCase())),
    [specials],
  );

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    if (!activeCategory || activeCategory === "all") return menuItems;
    return menuItems.filter(item => item.categorySlug === activeCategory);
  }, [menuItems, activeCategory]);

  const addToCart = (item: NonNullable<typeof menuItems>[number]) => {
    const itemId = item.id.toString();
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: itemId, name: item.name, price: Number(item.price), quantity: 1, isVeg: item.isVeg, imageUrl: item.imageUrl }];
    });
    setBumpId(itemId);
    setTimeout(() => setBumpId(null), 300);
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

  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const addItemId = params.get("add");
    if (addItemId) {
      const item = menuItems.find(m => m.id.toString() === addItemId);
      if (item) {
        addToCart(item);
        setActiveCategory(item.categorySlug);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [menuItems]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const loyaltyDiscount = useMemo(() => {
    if (!redeemReward || !hasAvailableReward || cart.length === 0) return 0;
    return Math.max(...cart.map((item) => item.price));
  }, [redeemReward, hasAvailableReward, cart]);

  const discountedSubtotalForBirthday = subtotal - loyaltyDiscount;
  const birthdayDiscount = useMemo(() => {
    if (!loyalty?.progress?.birthdayDiscountEligibility) return 0;
    return discountedSubtotalForBirthday * 0.10;
  }, [loyalty, discountedSubtotalForBirthday]);

  const totalDiscount = loyaltyDiscount + birthdayDiscount;
  const taxableSubtotal = Math.max(0, subtotal - totalDiscount);
  const taxes = taxableSubtotal * 0.05;

  const deliveryCharge = orderType === "delivery" && subtotal > 0
    ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE)
    : 0;
  const total = taxableSubtotal + taxes + deliveryCharge;

  const maxPrepTime = cart.reduce((max, item) => {
    const menuItem = menuItems?.find(m => m.id.toString() === item.id);
    return Math.max(max, menuItem?.prepTimeMinutes ?? 20);
  }, 20);
  const estimatedMinutes = orderType === "delivery" ? maxPrepTime + 25 : maxPrepTime + 5;

  const paymentOptions = orderType === "delivery" ? PAYMENT_METHODS_DELIVERY : PAYMENT_METHODS_PICKUP;

  const onSubmit = (values: FormValues) => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Cart is empty", description: "Please add some items first." });
      return;
    }

    const paymentLabel = paymentOptions.find(m => m.id === paymentMethod)?.label || "Cash";

    createOrder.mutate(
      {
        data: {
          customerName: values.customerName,
          phone: values.phone,
          email: values.email,
          pickupTime: orderType === "pickup" ? (values.pickupTime as string) : "ASAP (Delivery)",
          notes: values.notes?.trim() || undefined,
          orderType,
          paymentMethod: paymentLabel,
          deliveryCharge,
          customerId: user?.id,
          redeemReward,
          deliveryAddress: orderType === "delivery" ? {
            houseNumber: values.houseNumber!,
            street: values.street!,
            area: values.area!,
            city: values.city!,
            landmark: values.landmark || undefined,
            pincode: values.pincode!,
          } : undefined,
          items: cart.map(item => ({
            menuItemId: parseInt(item.id),
            menuItemName: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      {
        onSuccess: (order) => {
          toast({ title: "Order placed successfully." });
          queryClient.invalidateQueries({ queryKey: ["loyalty-progress"] });
          setPlacedOrder({
            id: order.id,
            status: order.status,
            orderType,
            totalAmount: order.totalAmount,
            paymentMethod: paymentLabel,
            prepTimeMinutes: maxPrepTime,
            estimatedMinutes: estimatedMinutes,
          });
          setIsSuccess(true);
          setCartOpen(false);
          clearCart();
          window.scrollTo(0, 0);
        },
        onError: () => toast({ variant: "destructive", title: "Order failed", description: "Please try again." }),
      }
    );
  };

  if (isSuccess && placedOrder) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-24 pb-12 bg-background">
        <Card className="w-full max-w-md mx-4 text-center border-border shadow-xl animate-in zoom-in fade-in duration-500">
          <CardContent className="pt-10 pb-8 px-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="font-serif text-3xl font-bold mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for choosing Darbar. Your order has been received{placedOrder.orderType === "delivery" ? " and is being prepared for delivery." : " and will be ready for pickup soon."}
            </p>
            <div className="bg-muted/60 rounded-xl p-4 text-left text-sm space-y-2 mb-8">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-semibold">#{placedOrder.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order Status</span><Badge variant="secondary" className="capitalize">{placedOrder.status === "pending" ? "Order Received" : placedOrder.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="font-medium">{placedOrder.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><Badge variant="outline">Pending</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated Preparation Time</span><span className="font-medium">~{placedOrder.prepTimeMinutes} mins</span></div>
              {placedOrder.orderType === "delivery" ? (
                <div className="flex justify-between"><span className="text-muted-foreground">Estimated Delivery Time</span><span className="font-medium">~{placedOrder.estimatedMinutes} mins</span></div>
              ) : (
                <div className="flex justify-between"><span className="text-muted-foreground">Estimated Ready Time</span><span className="font-medium">~{placedOrder.estimatedMinutes} mins</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-bold text-primary">₹{placedOrder.totalAmount.toFixed(0)}</span></div>
            </div>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => setLocation(`/order/track/${placedOrder.id}`)}>
                <PackageCheck className="h-4 w-4 mr-2" /> Track Order
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => { setIsSuccess(false); setPlacedOrder(null); }}>Order Again</Button>
                <Link href="/order/history"><Button variant="outline" className="w-full"><History className="h-4 w-4 mr-2" />My Orders</Button></Link>
              </div>
              <Link href="/"><Button variant="ghost" className="w-full">Return to Home</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = loadingItems || loadingCats;

  const CartItemsList = () => (
    <div className="flex flex-col max-h-[350px] overflow-y-auto p-4 space-y-3">
      <AnimatePresence initial={false}>
        {cart.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-between items-center gap-3"
          >
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const CheckoutForm = () => (
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</FormLabel>
              <FormControl><Input placeholder="your.email@example.com" type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {orderType === "pickup" ? (
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
        ) : (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <Label className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" />Delivery Address</Label>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="houseNumber" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">House No.</FormLabel><FormControl><Input placeholder="12-3-45" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Street</FormLabel><FormControl><Input placeholder="MG Road" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="area" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Area</FormLabel><FormControl><Input placeholder="Banjara Hills" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">City</FormLabel><FormControl><Input placeholder="Hyderabad" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="landmark" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Landmark (Optional)</FormLabel><FormControl><Input placeholder="Near park" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="pincode" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Pincode</FormLabel><FormControl><Input placeholder="500034" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        )}

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
            {paymentOptions.map(method => (
              <button
                key={method.id}
                type="button"
                disabled={"comingSoon" in method && Boolean((method as any).comingSoon)}
                onClick={() => setPaymentMethod(method.id)}
                className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                {"comingSoon" in method && Boolean((method as any).comingSoon) && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1 py-0">Soon</Badge>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            {paymentMethod === "cash" || paymentMethod === "cod"
              ? `You'll pay at ${orderType === "delivery" ? "delivery" : "pickup"} — Razorpay online payment is coming soon.`
              : "Online payment is ready for integration — you'll be asked to pay at " + (orderType === "delivery" ? "delivery" : "pickup") + " for now."}
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
  );

  const CartSummary = () => (
    cart.length > 0 && (
      <div className="px-4 pb-4 pt-2 border-t border-border space-y-1.5 text-sm">
        {/* Checkbox to redeem free meal reward */}
        {hasAvailableReward && (
          <div className="flex items-center gap-2 p-2 border border-dashed border-green-200 dark:border-green-900 rounded-lg bg-green-50/50 dark:bg-green-950/10 mb-3 animate-in fade-in duration-200">
            <input
              type="checkbox"
              id="redeemReward"
              checked={redeemReward}
              onChange={(e) => setRedeemReward(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="redeemReward" className="text-xs font-semibold text-green-800 dark:text-green-400 cursor-pointer">
              🎁 Redeem Free Meal Reward
            </label>
          </div>
        )}

        {/* Birthday offer notification */}
        {loyalty?.progress?.birthdayDiscountEligibility && (
          <div className="p-2 border border-dashed border-orange-200 dark:border-orange-900 rounded-lg bg-orange-50/50 dark:bg-orange-950/10 mb-3 text-center text-xs font-bold text-orange-800 dark:text-orange-400 animate-pulse">
            🎂 Birthday Offer Active: 10% Off!
          </div>
        )}

        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
        </div>

        {/* Loyalty Discount line item */}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-green-600 font-medium">
            <span>Loyalty Reward Discount</span><span>-₹{loyaltyDiscount.toFixed(0)}</span>
          </div>
        )}

        {/* Birthday Discount line item */}
        {birthdayDiscount > 0 && (
          <div className="flex justify-between text-orange-600 font-medium">
            <span>Birthday Discount (10%)</span><span>-₹{birthdayDiscount.toFixed(0)}</span>
          </div>
        )}

        <div className="flex justify-between text-muted-foreground">
          <span>GST (5%)</span><span>₹{taxes.toFixed(0)}</span>
        </div>
        {orderType === "delivery" && (
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Charge</span>
            <span>{deliveryCharge === 0 ? <span className="text-green-600 font-medium">FREE</span> : `₹${deliveryCharge.toFixed(0)}`}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-base">
          <span>Grand Total</span><span className="text-primary">₹{total.toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          Estimated {orderType === "delivery" ? "delivery" : "ready"} time: ~{estimatedMinutes} mins
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-24 lg:pb-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Order Online</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Swiggy/Zomato-style ordering — fresh food, delivered or ready for pickup.
          </p>
        </div>

        {/* Order type + history link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 max-w-lg mx-auto sm:max-w-none">
          <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
            <button
              onClick={() => setOrderType("delivery")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${orderType === "delivery" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Bike className="h-4 w-4" /> Delivery
            </button>
            <button
              onClick={() => setOrderType("pickup")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${orderType === "pickup" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Store className="h-4 w-4" /> Pickup
            </button>
          </div>
          <Link href="/order/history">
            <Button variant="outline" size="sm" className="gap-2"><History className="h-4 w-4" />My Orders</Button>
          </Link>
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
                <button
                  key="all"
                  onClick={() => setActiveCategory("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    activeCategory === "all" || !activeCategory
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  All Items
                </button>
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
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredItems.map(item => {
                  const cartItem = cart.find(c => c.id === item.id.toString());
                  const isTodaySpecial = todaysSpecialNames.has(item.name.toLowerCase());
                  return (
                    <Card key={item.id} className={`flex flex-col overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all ${!item.isAvailable ? "opacity-60" : ""}`}>
                      <div className="relative">
                        <DishImage src={item.imageUrl} alt={item.name} className="aspect-[16/10]" />
                        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                          {item.isBestseller && (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1 shadow-sm"><Flame className="h-3 w-3" />Bestseller</Badge>
                          )}
                          {isTodaySpecial && (
                            <Badge className="bg-fuchsia-600 hover:bg-fuchsia-600 text-white gap-1 shadow-sm"><Sparkles className="h-3 w-3" />Today's Special</Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <div className="flex items-start gap-2 mb-1">
                            <div className={`shrink-0 w-4 h-4 mt-0.5 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold leading-tight">{item.name}</h4>
                                <StarRating rating={item.rating} />
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {item.categoryName && (
                                  <Badge variant="secondary" className="font-normal text-[10px]">{item.categoryName}</Badge>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />{item.prepTimeMinutes} mins
                                </span>
                              </div>
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
                          <motion.div whileTap={{ scale: 0.94 }} animate={bumpId === item.id.toString() ? { scale: [1, 1.06, 1] } : {}}>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => addToCart(item)}>
                              <Plus className="h-3 w-3 mr-1" /> Add to Cart
                            </Button>
                          </motion.div>
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

          {/* Desktop Cart & Checkout (sticky sidebar) */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <Card className="border-border shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border pb-4">
                  <CardTitle className="font-serif text-2xl flex justify-between items-center gap-2">
                    <span className="flex items-center gap-2">
                      Your Order
                      <Badge variant="secondary" className="font-sans text-sm">{cartCount} items</Badge>
                    </span>
                    {cart.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive font-sans h-auto py-1 px-2" onClick={clearCart}>
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
                  ) : <CartItemsList />}
                  <CartSummary />
                </CardContent>
              </Card>

              {cart.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-serif text-xl">Your Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CheckoutForm />
                  </CardContent>
                </Card>
              )}

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

      {/* Mobile floating cart bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 backdrop-blur border-t border-border">
          <Button className="w-full h-12 justify-between px-5" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" />{cartCount} item{cartCount > 1 ? "s" : ""}</span>
            <span>View Cart · ₹{total.toFixed(0)}</span>
          </Button>
        </div>
      )}

      {/* Mobile slide-in cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col overflow-y-auto">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">Your Order <Badge variant="secondary">{cartCount} items</Badge></span>
              {cart.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={clearCart}>
                  Clear Cart
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          {cart.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
              <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            <>
              <CartItemsList />
              <CartSummary />
              <div className="p-4">
                <CheckoutForm />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
