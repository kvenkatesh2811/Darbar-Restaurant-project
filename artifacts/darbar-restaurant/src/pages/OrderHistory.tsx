import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useListOrders,
  useUpdateOrderStatus,
  useListMenuItems,
} from "@workspace/api-client-react";
import type { Order, OrderItem, DeliveryAddress } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  User, Mail, Phone, CalendarDays, MapPin, Search, Filter,
  RotateCcw, XCircle, ArrowLeft, Loader2, Eye, ShieldAlert,
  Save, Edit2, ShoppingBag, Clock, CheckCircle2, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DishImage } from "@/components/DishImage";

export default function OrderHistory() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menuItems } = useListMenuItems();
  const { data: orders, isLoading: isLoadingOrders } = useListOrders(
    { customerId: user?.id || "" },
    { query: { enabled: !!user?.id } as any }
  );

  const { data: loyalty, refetch: refetchLoyalty } = useQuery({
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

  const [isEditingDob, setIsEditingDob] = useState(false);
  const [dob, setDob] = useState("");

  const startEditingDob = () => {
    setDob((user?.unsafeMetadata?.dateOfBirth as string) || "");
    setIsEditingDob(true);
  };

  const handleSaveDob = async () => {
    if (!user) return;
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          dateOfBirth: dob || undefined,
        },
      });
      toast({
        title: "Birthday Saved",
        description: "Your Date of Birth has been updated successfully.",
      });
      setIsEditingDob(false);
      refetchLoyalty();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Saving Birthday",
        description: "Could not save your Date of Birth. Please try again.",
      });
    }
  };

  const updateOrderStatus = useUpdateOrderStatus();

  // Search & Filter State
  const [searchId, setSearchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Address Edit State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");

  // Get Fallback Address from previous orders
  const fallbackAddress = useMemo(() => {
    if (!orders) return null;
    const deliveryOrder = orders.find(
      (o) => o.orderType === "delivery" && o.deliveryAddress
    );
    return (deliveryOrder?.deliveryAddress as DeliveryAddress) || null;
  }, [orders]);

  // Current Active Address
  const activeAddress = useMemo(() => {
    const clerkAddr = user?.unsafeMetadata?.deliveryAddress as DeliveryAddress | null;
    return clerkAddr || fallbackAddress;
  }, [user, fallbackAddress]);

  // Init Address Form
  const startEditingAddress = () => {
    setHouseNumber(activeAddress?.houseNumber || "");
    setStreet(activeAddress?.street || "");
    setArea(activeAddress?.area || "");
    setCity(activeAddress?.city || "");
    setLandmark(activeAddress?.landmark || "");
    setPincode(activeAddress?.pincode || "");
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    if (!houseNumber || !street || !area || !city || !pincode) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required address fields.",
      });
      return;
    }

    try {
      await user.update({
        unsafeMetadata: {
          deliveryAddress: {
            houseNumber,
            street,
            area,
            city,
            landmark: landmark || undefined,
            pincode,
          },
        },
      });
      toast({
        title: "Address Saved",
        description: "Your saved delivery address has been updated successfully.",
      });
      setIsEditingAddress(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Saving Address",
        description: "Could not save your address. Please try again.",
      });
    }
  };

  // Cancel order execution
  const handleCancelOrder = (orderId: number) => {
    updateOrderStatus.mutate(
      {
        id: orderId,
        data: { status: "cancelled" },
      },
      {
        onSuccess: () => {
          toast({
            title: "Order Cancelled",
            description: `Order #${orderId} has been successfully cancelled.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          // Update selected order in state if it's currently open
          if (selectedOrder?.id === orderId) {
            setSelectedOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null));
          }
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Cancellation Failed",
            description: "Failed to cancel your order. Please try again.",
          });
        },
      }
    );
  };

  // Reorder logic
  const handleReorder = (order: Order) => {
    try {
      const rawCart = localStorage.getItem("darbar-order-cart");
      let currentCart: any[] = [];
      if (rawCart) {
        currentCart = JSON.parse(rawCart);
        if (!Array.isArray(currentCart)) {
          currentCart = [];
        }
      }

      order.items.forEach((orderItem) => {
        const existingIdx = currentCart.findIndex(
          (c) => c.id === orderItem.menuItemId.toString()
        );
        if (existingIdx > -1) {
          currentCart[existingIdx].quantity += orderItem.quantity;
        } else {
          const menuItem = menuItems?.find((m) => m.id === orderItem.menuItemId);
          currentCart.push({
            id: orderItem.menuItemId.toString(),
            name: orderItem.menuItemName,
            price: orderItem.price,
            quantity: orderItem.quantity,
            isVeg: menuItem ? menuItem.isVeg : true,
            imageUrl: menuItem ? menuItem.imageUrl : null,
          });
        }
      });

      localStorage.setItem("darbar-order-cart", JSON.stringify(currentCart));
      toast({
        title: "Added to Cart",
        description: "Items have been added to your cart. Redirecting to checkout...",
      });
      setLocation("/order");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Reorder Failed",
        description: "Failed to add items to your cart.",
      });
    }
  };

  // Status mapping
  const getStatusLabel = (status: string) => {
    const mapping: Record<string, string> = {
      pending: "Received",
      confirmed: "Accepted",
      preparing: "Preparing",
      ready: "Ready",
      out_for_delivery: "Out for Delivery",
      completed: "Delivered",
      cancelled: "Cancelled",
    };
    return mapping[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60",
      preparing: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60",
      ready: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/60",
      out_for_delivery: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60",
      completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60",
      cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60",
    };
    return (
      <Badge className={`${variants[status] || "bg-gray-100"} border capitalize hover:opacity-90`} variant="outline">
        {getStatusLabel(status)}
      </Badge>
    );
  };

  // Calculation of Prep and Delivery Time
  const getEstimatedTimes = (order: Order) => {
    const maxPrepTime = order.items.reduce((max, item) => {
      const menuItem = menuItems?.find((m) => m.id === item.menuItemId);
      return Math.max(max, menuItem?.prepTimeMinutes ?? 20);
    }, 20);
    const estimatedMinutes = order.orderType === "delivery" ? maxPrepTime + 25 : maxPrepTime + 5;
    return { maxPrepTime, estimatedMinutes };
  };

  // Filtering orders logic
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      // 1. Search by Order ID
      if (searchId && !order.id.toString().includes(searchId)) {
        return false;
      }
      // 2. Filter by status
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      // 3. Filter by date
      if (dateFilter !== "all") {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (dateFilter === "today" && orderDate.toDateString() !== now.toDateString()) {
          return false;
        }
        if (dateFilter === "7days" && diffDays > 7) {
          return false;
        }
        if (dateFilter === "30days" && diffDays > 30) {
          return false;
        }
      }
      // 4. Filter by payment method
      if (paymentFilter !== "all") {
        const method = order.paymentMethod.toLowerCase();
        if (paymentFilter === "cash" && !method.includes("cash") && !method.includes("cod")) {
          return false;
        }
        if (paymentFilter === "upi" && !method.includes("upi") && !method.includes("gpay") && !method.includes("phonepe") && !method.includes("paytm")) {
          return false;
        }
        if (paymentFilter === "online" && !method.includes("razorpay") && !method.includes("online")) {
          return false;
        }
      }
      return true;
    });
  }, [orders, searchId, statusFilter, dateFilter, paymentFilter]);

  // Loading state checks
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  // Not logged in UI
  if (!isSignedIn) {
    return (
      <div className="min-h-[85vh] bg-background pt-28 pb-12 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-border shadow-xl">
          <CardContent className="pt-10 pb-8 px-6 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-bold">Sign In Required</h2>
              <p className="text-muted-foreground">
                Please sign in to view your profile, manage saved delivery addresses, and track your order history.
              </p>
            </div>
            <Link href="/sign-in">
              <Button size="lg" className="w-full">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header navigation */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/order">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Ordering
            </Button>
          </Link>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Customer Profile Column */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-border shadow-md overflow-hidden bg-card">
              <div className="bg-primary/5 h-24 relative border-b border-border">
                {/* Profile photo overlapping */}
                <div className="absolute -bottom-8 left-6">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || "User Avatar"}
                      className="w-16 h-16 rounded-full border-4 border-card object-cover shadow"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-4 border-card bg-primary/10 flex items-center justify-center shadow">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="pt-12 px-6 pb-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold font-serif">{user.fullName || "Valued Customer"}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Recently"}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.primaryEmailAddress?.emailAddress || "No email registered"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{user.primaryPhoneNumber?.phoneNumber || "No phone registered"}</span>
                  </div>
                </div>

                <Separator />

                {/* Date of Birth Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" /> Date of Birth
                    </h3>
                    {!isEditingDob && (
                      <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-primary" onClick={startEditingDob}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>

                  {isEditingDob ? (
                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/40 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground block">Select Date</label>
                        <Input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setIsEditingDob(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveDob}>
                          <Save className="h-3 w-3" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : user.unsafeMetadata?.dateOfBirth ? (
                    <div className="rounded-lg border border-border p-3 bg-muted/30 text-xs text-stone-700 dark:text-stone-300">
                      {new Date(user.unsafeMetadata.dateOfBirth as string).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                      No Date of Birth saved. Add it to receive a 10% birthday discount!
                    </div>
                  )}
                </div>

                <Separator />

                {/* Saved Delivery Address Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Saved Address
                    </h3>
                    {!isEditingAddress && (
                      <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-primary" onClick={startEditingAddress}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                  </div>

                  {isEditingAddress ? (
                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/40 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">House No.*</label>
                          <Input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="12-3" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">Street*</label>
                          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Main Rd" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">Area*</label>
                          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Banjara Hills" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">City*</label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">Landmark</label>
                          <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Mall" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-muted-foreground">Pincode*</label>
                          <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="500034" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setIsEditingAddress(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveAddress}>
                          <Save className="h-3 w-3" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : activeAddress ? (
                    <div className="rounded-lg border border-border p-3.5 bg-muted/30 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                      <p className="font-medium">
                        {activeAddress.houseNumber}, {activeAddress.street}
                      </p>
                      <p>{activeAddress.area}</p>
                      <p>{activeAddress.city} - {activeAddress.pincode}</p>
                      {activeAddress.landmark && (
                        <p className="text-[11px] text-muted-foreground italic mt-1">Landmark: {activeAddress.landmark}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                      No saved delivery address found. Edit to save one!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Progress Card */}
            <Card className="border-border shadow-md overflow-hidden bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold font-serif flex items-center gap-2">
                  🏆 Loyalty Rewards
                </CardTitle>
                <CardDescription className="text-xs">
                  Earn rewards with every order you complete!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loyalty ? (
                  <>
                    {/* Progress Bar & Counter */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                        <span>Meals Completed</span>
                        <span>{loyalty.progress.currentProgress} / 10 meals</span>
                      </div>
                      
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${(loyalty.progress.currentProgress / 10) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress feedback message */}
                    {loyalty.progress.availableRewards > 0 ? (
                      <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900 rounded-lg text-center">
                        <p className="text-xs font-bold text-green-700 dark:text-green-400">
                          Congratulations! You earned a Free Meal Reward. 🎉
                        </p>
                        <p className="text-[10px] text-green-600/80 dark:text-green-500/80 mt-1">
                          You can redeem this free meal during your next checkout!
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center italic">
                        Complete {10 - loyalty.progress.currentProgress} more meals to earn your next Free Meal Reward.
                      </p>
                    )}

                    <Separator />

                    {/* Reward counts metrics list */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2 bg-muted/40 rounded-lg">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Available Free Meals</span>
                        <span className="text-lg font-bold text-primary mt-1 block">{loyalty.progress.availableRewards}</span>
                      </div>
                      
                      <div className="p-2 bg-muted/40 rounded-lg">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Redeemed Rewards</span>
                        <span className="text-lg font-bold text-stone-700 dark:text-stone-300 mt-1 block">{loyalty.progress.redeemedRewards}</span>
                      </div>
                    </div>

                    {/* Birthday offer banner if eligible */}
                    {loyalty.progress.birthdayDiscountEligibility && (
                      <div className="p-3 bg-orange-50 border border-orange-200 dark:bg-orange-950/25 dark:border-orange-900 rounded-lg text-center animate-pulse">
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-400 block">
                          🎂 Birthday Offer: Enjoy 10% Off!
                        </span>
                        <span className="text-[10px] text-orange-600 dark:text-orange-500 block mt-0.5">
                          A 10% discount has been applied to checkout for your special day!
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Loading loyalty statistics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order History Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold font-serif">Order History</h1>
                <p className="text-sm text-muted-foreground">View status, check details, or easily reorder previous meals.</p>
              </div>
            </div>

            {/* Filter Dashboard Card */}
            <Card className="border-border shadow-sm bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Order ID..."
                      className="pl-9 text-sm"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Received</SelectItem>
                      <SelectItem value="confirmed">Accepted</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="completed">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date Filter */}
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Payment Filter */}
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="All Payments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="cash">Cash/COD</SelectItem>
                      <SelectItem value="upi">UPI / GPAY / Paytm</SelectItem>
                      <SelectItem value="online">Online Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* List of Orders */}
            {isLoadingOrders ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center"><div className="h-6 w-32 bg-muted animate-pulse rounded" /><div className="h-6 w-20 bg-muted animate-pulse rounded" /></div>
                    <Separator />
                    <div className="h-16 w-full bg-muted animate-pulse rounded" />
                  </Card>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card className="border-border shadow-sm py-16 text-center text-muted-foreground bg-card">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-25 text-primary" />
                <h3 className="font-serif text-xl font-semibold mb-1 text-foreground">No Orders Found</h3>
                <p className="text-sm max-w-sm mx-auto">We couldn't find any orders matching your current search/filter combination.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredOrders.map((order) => {
                  const isCancellable = order.status === "pending" || order.status === "confirmed";
                  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  // Payment Status calculation
                  const paymentStatus = order.status === "completed" ? "Paid" : order.status === "cancelled" ? "Cancelled" : "Pending";
                  const paymentBadgeColor = paymentStatus === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400" : paymentStatus === "Cancelled" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400";

                  return (
                    <Card key={order.id} className="border-border shadow-sm overflow-hidden hover:border-primary/30 hover:shadow transition-all bg-card">
                      {/* Top banner of order card */}
                      <div className="bg-muted/40 px-5 py-4 border-b border-border flex flex-wrap justify-between items-center gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">Order #{order.id}</span>
                          <p className="text-[11px] text-muted-foreground">{orderDate}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Content details summary */}
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Items Summary</span>
                            <div className="text-sm font-medium text-stone-700 dark:text-stone-300 line-clamp-1">
                              {order.items.map((item) => `${item.menuItemName} x ${item.quantity}`).join(", ")}
                            </div>
                            <span className="text-xs text-muted-foreground block capitalize">
                              Type: {order.orderType} · Method: {order.paymentMethod}
                            </span>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Total Amount</span>
                            <span className="font-extrabold text-lg text-primary">₹{order.totalAmount.toFixed(0)}</span>
                            <div className="mt-1 flex items-center gap-1.5 justify-start sm:justify-end">
                              <span className="text-[11px] text-muted-foreground">Payment:</span>
                              <Badge className={`${paymentBadgeColor} border-none font-normal text-[10px] py-0 px-1.5`} variant="outline">
                                {paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Actions footer on order card */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {/* View details action */}
                          <Button variant="ghost" size="sm" className="text-stone-600 dark:text-stone-400 hover:text-primary gap-1 px-0" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" /> View Details
                          </Button>

                          {/* Reorder & Cancel buttons */}
                          <div className="flex items-center gap-2">
                            {isCancellable && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-950 dark:hover:bg-red-950/40">
                                    Cancel Order
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will cancel your Pre-Order #{order.id} immediately. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Order</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleCancelOrder(order.id)}>
                                      Confirm Cancellation
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button size="sm" className="h-9 gap-1" onClick={() => handleReorder(order)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Reorder
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Dialog/Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-md w-[95vw] rounded-xl overflow-hidden p-0 gap-0">
            <DialogHeader className="p-5 bg-muted/40 border-b border-border">
              <div className="flex justify-between items-center pr-6">
                <div>
                  <DialogTitle className="font-serif text-xl">Order Details</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">ID: #{selectedOrder.id} · {new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>
            </DialogHeader>

            {/* Food items list inside modal */}
            <div className="p-5 max-h-[40vh] overflow-y-auto space-y-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Order Items</span>
              <div className="space-y-3">
                {selectedOrder.items.map((item, idx) => {
                  const menuItem = menuItems?.find((m) => m.id === item.menuItemId);
                  return (
                    <div key={idx} className="flex justify-between items-center gap-3">
                      <DishImage
                        src={menuItem?.imageUrl}
                        alt={item.menuItemName}
                        className="w-10 h-10 rounded shrink-0 aspect-square"
                        iconClassName="h-3 w-3"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{item.menuItemName}</h4>
                        <span className="text-xs text-muted-foreground">₹{item.price} x {item.quantity}</span>
                      </div>
                      <div className="font-semibold text-sm text-right">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Payment Summary breakdown */}
            <div className="p-5 space-y-2.5 text-sm bg-muted/20">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{(selectedOrder.totalAmount - selectedOrder.deliveryCharge - ((selectedOrder.totalAmount - selectedOrder.deliveryCharge) / 1.05 * 0.05)).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5%)</span>
                <span>₹{(((selectedOrder.totalAmount - selectedOrder.deliveryCharge) / 1.05) * 0.05).toFixed(0)}</span>
              </div>
              {selectedOrder.orderType === "delivery" && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge</span>
                  <span>{selectedOrder.deliveryCharge === 0 ? "FREE" : `₹${selectedOrder.deliveryCharge.toFixed(0)}`}</span>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-primary">₹{selectedOrder.totalAmount.toFixed(0)}</span>
              </div>
            </div>

            <Separator />

            {/* Logistics details (address, time) */}
            <div className="p-5 space-y-4 text-xs text-stone-700 dark:text-stone-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Estimated Time</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>~{getEstimatedTimes(selectedOrder).estimatedMinutes} mins</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Payment Method</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    <span className="capitalize">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.orderType === "delivery" && selectedOrder.deliveryAddress && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Delivery Address</span>
                  <div className="flex items-start gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p>{selectedOrder.deliveryAddress.houseNumber}, {selectedOrder.deliveryAddress.street}</p>
                      <p>{selectedOrder.deliveryAddress.area}, {selectedOrder.deliveryAddress.city}</p>
                      <p>Pincode: {selectedOrder.deliveryAddress.pincode}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.orderType === "pickup" && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Pickup Time</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{selectedOrder.pickupTime}</span>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Special Instructions</span>
                  <p className="bg-muted p-2 rounded text-stone-600 dark:text-stone-400 italic">"{selectedOrder.notes}"</p>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Details modal */}
            <div className="p-5 border-t border-border flex justify-end gap-2 bg-muted/40">
              {/* If order is cancellable, show it */}
              {(selectedOrder.status === "pending" || selectedOrder.status === "confirmed") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-950 dark:hover:bg-red-950/40">
                      Cancel Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your Pre-Order #{selectedOrder.id} immediately. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleCancelOrder(selectedOrder.id)}>
                        Confirm Cancellation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={() => handleReorder(selectedOrder)} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Reorder This Meal
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
