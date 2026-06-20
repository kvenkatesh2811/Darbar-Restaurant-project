import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, Clock, Phone, User, CheckCircle2, Badge } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListMenuItems, useCreateOrder } from "@workspace/api-client-react";
import { HARDCODED_MENU } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const orderFormSchema = z.object({
  customerName: z.string().min(2, { message: "Name is required" }),
  phone: z.string().min(10, { message: "Valid phone number is required" }),
  pickupTime: z.string().min(1, { message: "Please select a pickup time" }),
  notes: z.string().optional(),
});

type CartItem = {
  id: string; // generating simple id for hardcoded items without real IDs
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
};

export default function Order() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const { data: apiMenuItems } = useListMenuItems();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Merge items
  const allItems = [...HARDCODED_MENU].map((item, index) => ({
    ...item,
    id: `hc-${index}`
  }));
  
  if (apiMenuItems) {
    apiMenuItems.forEach(apiItem => {
      if (!allItems.some(item => item.name.toLowerCase() === apiItem.name.toLowerCase())) {
        allItems.push({ ...apiItem, id: apiItem.id.toString() } as any);
      }
    });
  }

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      pickupTime: "",
      notes: "",
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, isVeg: item.isVeg }];
    });
    toast({
      title: "Added to cart",
      description: `${item.name} added.`,
      duration: 2000,
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxes = subtotal * 0.05; // 5% GST
  const total = subtotal + taxes;

  const onSubmit = (values: z.infer<typeof orderFormSchema>) => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Cart is empty",
        description: "Please add some items to your order first.",
      });
      return;
    }

    const orderPayload = {
      ...values,
      items: cart.map(item => ({
        menuItemId: parseInt(item.id.replace('hc-', '0')) || 0, // Fallback for hardcoded
        menuItemName: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    createOrder.mutate(
      { data: orderPayload },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setCart([]);
          window.scrollTo(0, 0);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Order failed",
            description: "There was a problem placing your order. Please try again.",
          });
        }
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
              <Button className="w-full" onClick={() => setIsSuccess(false)}>
                Place Another Order
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Order for Pickup</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select your favorite dishes and pick them up hot and fresh from our restaurant.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Menu Selection */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xl font-bold font-serif flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Add Items
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {allItems.map((item) => (
                <Card key={item.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                    <div>
                      <div className="flex items-start gap-2 mb-1">
                        <div className={`shrink-0 w-4 h-4 mt-1 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                          <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                        </div>
                        <h4 className="font-semibold leading-tight">{item.name}</h4>
                      </div>
                      <div className="font-bold text-primary ml-6">₹{item.price}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-auto"
                      onClick={() => addToCart(item)}
                      data-testid={`button-add-to-cart-${item.id}`}
                    >
                      Add to Order
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <Card className="border-border shadow-md">
                <CardHeader className="bg-muted/50 border-b border-border pb-4">
                  <CardTitle className="font-serif text-2xl flex justify-between items-center">
                    Your Order
                    <Badge variant="secondary" className="font-sans text-sm">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cart.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                      <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                      <p>Your cart is empty.</p>
                      <p className="text-sm mt-1">Add items from the menu to get started.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col max-h-[40vh] overflow-y-auto p-6 space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`shrink-0 w-3 h-3 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                              </div>
                              <h5 className="font-medium text-sm truncate">{item.name}</h5>
                            </div>
                            <div className="text-muted-foreground text-sm ml-5">₹{item.price}</div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 bg-muted rounded-md p-1 border border-border">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-sm"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-sm"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="font-bold text-sm text-right w-12 shrink-0">
                            ₹{item.price * item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <div className="p-6 bg-muted/20 border-t border-border space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes (5%)</span>
                        <span className="font-medium">₹{taxes.toFixed(2)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-primary">₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {cart.length > 0 && (
                <Card className="mt-6 border-border shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-serif text-xl">Pickup Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="Enter your name" className="pl-9" {...field} data-testid="input-order-name" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="Enter 10-digit number" type="tel" className="pl-9" {...field} data-testid="input-order-phone" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pickupTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pickup Time</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-order-time">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <SelectValue placeholder="Select time slot" />
                                    </div>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                                  <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                                  <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                                  <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                                  <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                                  <SelectItem value="9:00 PM">9:00 PM</SelectItem>
                                  <SelectItem value="10:00 PM">10:00 PM</SelectItem>
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
                              <FormControl>
                                <Textarea 
                                  placeholder="Less spicy, extra onions, etc." 
                                  className="resize-none h-20" 
                                  {...field} 
                                  data-testid="textarea-order-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="pt-4 border-t border-border mt-6">
                          <p className="text-sm font-medium mb-3">Pay at Restaurant via:</p>
                          <div className="flex flex-wrap gap-2 mb-6">
                            <Badge variant="outline" className="bg-background">Cash</Badge>
                            <Badge variant="outline" className="bg-background">UPI</Badge>
                            <Badge variant="outline" className="bg-background">GPay</Badge>
                            <Badge variant="outline" className="bg-background">PhonePe</Badge>
                          </div>
                          
                          <Button 
                            type="submit" 
                            size="lg" 
                            className="w-full text-lg h-12" 
                            disabled={createOrder.isPending}
                            data-testid="button-submit-order"
                          >
                            {createOrder.isPending ? "Processing..." : `Place Order • ₹${total.toFixed(2)}`}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
