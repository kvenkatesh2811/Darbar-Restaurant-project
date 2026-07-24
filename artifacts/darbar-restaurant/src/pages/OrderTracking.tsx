import { useEffect, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useUser } from "@clerk/react";
import {
  CheckCircle2, ChefHat, PackageCheck, Bike, Home as HomeIcon, Store,
  Phone, User as UserIcon, Car, Clock, ArrowLeft, ShieldAlert, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { useGetOrder, useListMenuItems } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DishImage } from "@/components/DishImage";
import { Separator } from "@/components/ui/separator";

const PICKUP_STEPS = [
  { key: "pending", label: "Order Received", icon: CheckCircle2 },
  { key: "confirmed", label: "Restaurant Accepted", icon: ChefHat },
  { key: "preparing", label: "Preparing Food", icon: ChefHat },
  { key: "ready", label: "Ready for Pickup", icon: PackageCheck },
  { key: "completed", label: "Completed", icon: Store },
];

const DELIVERY_STEPS = [
  { key: "pending", label: "Order Received", icon: CheckCircle2 },
  { key: "confirmed", label: "Restaurant Accepted", icon: ChefHat },
  { key: "preparing", label: "Preparing Food", icon: ChefHat },
  { key: "ready", label: "Food Ready", icon: PackageCheck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Bike },
  { key: "completed", label: "Delivered", icon: HomeIcon },
];

export default function OrderTracking() {
  const [, params] = useRoute("/order/track/:id");
  const orderId = params?.id ? parseInt(params.id, 10) : NaN;
  const { user, isLoaded: isUserLoaded } = useUser();
  const { data: menuItems } = useListMenuItems();

  const { data: order, isLoading, isError } = useGetOrder(
    orderId,
    {
      query: {
        enabled: !Number.isNaN(orderId),
        refetchInterval: 3000, // Background polling every 3 seconds for real-time status updates
      } as any
    }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Loading skeleton state
  if (isLoading || !isUserLoaded) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center pt-24 pb-12 text-center px-4">
        <div>
          <h2 className="font-serif text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find that order. Check the link and try again.</p>
          <Link href="/order"><Button>Back to Order Page</Button></Link>
        </div>
      </div>
    );
  }

  // Security check: Only allow customer to view their own orders
  if (order.customerId && (!user || order.customerId !== user.id)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center pt-24 pb-12 text-center px-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardContent className="pt-10 pb-8 px-6 space-y-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-red-600 dark:text-red-400">Unauthorized Access</h2>
              <p className="text-muted-foreground text-sm">
                You do not have permission to track this order. Please make sure you are signed in with the correct account.
              </p>
            </div>
            <div className="space-y-3">
              <Link href="/sign-in">
                <Button className="w-full">Sign In with Another Account</Button>
              </Link>
              <Link href="/order">
                <Button variant="ghost" className="w-full">Return to Order Page</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const steps = order.orderType === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = Math.max(0, steps.findIndex(s => s.key === order.status));
  const progressPercent = isCancelled ? 0 : (currentIndex / (steps.length - 1)) * 100;

  // Calculation of Prep and Delivery Times
  const maxPrepTime = order.items.reduce((max, item) => {
    const menuItem = menuItems?.find((m) => m.id === item.menuItemId);
    return Math.max(max, menuItem?.prepTimeMinutes ?? 20);
  }, 20);
  const estimatedDeliveryTime = order.orderType === "delivery" ? maxPrepTime + 25 : maxPrepTime + 5;

  // Payment Status calculation
  const paymentStatus = order.status === "completed" ? "Paid" : order.status === "cancelled" ? "Cancelled" : "Pending";
  const paymentBadgeColor = paymentStatus === "Paid" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400" : paymentStatus === "Cancelled" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400";

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl">
        <Link href="/order/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to My Orders
        </Link>

        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold">Order #{order.id}</h1>
            <p className="text-muted-foreground text-sm">Placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <Badge variant={order.orderType === "delivery" ? "default" : "secondary"} className="gap-1.5 text-sm py-1.5 px-3 capitalize">
            {order.orderType === "delivery" ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
            {order.orderType}
          </Badge>
        </div>

        {isCancelled ? (
          <Card className="border-destructive/40 mb-6 bg-red-50/50 dark:bg-red-950/10">
            <CardContent className="py-8 text-center space-y-2">
              <p className="font-semibold text-destructive text-lg">This order was cancelled.</p>
              <p className="text-xs text-muted-foreground">If you have any questions, please contact our support team.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 overflow-hidden border-border shadow">
            <CardContent className="pt-8 pb-6">
              <div className="relative mb-8 px-2">
                <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" />
                <motion.div
                  className="absolute top-4 left-0 h-1 bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <div className="relative flex justify-between">
                  {steps.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentIndex;
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-2 text-center" style={{ width: `${100 / steps.length}%` }}>
                        <motion.div
                          animate={done ? { scale: [0.8, 1.15, 1] } : {}}
                          transition={{ duration: 0.4 }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-background ${done ? "border-primary text-primary" : "border-muted text-muted-foreground"}`}
                        >
                          <Icon className="h-4 w-4" />
                        </motion.div>
                        <span className={`text-[10px] leading-tight md:text-[11px] ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Timing metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left">
                <div className="space-y-1 p-2 rounded bg-muted/30">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Estimated Prep Time</span>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>~{maxPrepTime} mins</span>
                  </div>
                </div>

                <div className="space-y-1 p-2 rounded bg-muted/30">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {order.orderType === "delivery" ? "Estimated Delivery Time" : "Estimated Ready Time"}
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>~{estimatedDeliveryTime} mins</span>
                  </div>
                </div>
              </div>

              {/* Pickup slots info */}
              {order.orderType === "pickup" && (
                <div className="mt-4 p-3 rounded-lg border border-border bg-primary/5 text-center text-xs text-stone-700 dark:text-stone-300">
                  Please pick up your order at restaurant at <span className="font-semibold text-primary">{order.pickupTime}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery Partner Info */}
        {order.orderType === "delivery" && order.deliveryPartner && (order.status === "out_for_delivery" || order.status === "completed") && (
          <Card className="mb-6 border-border shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Bike className="h-5 w-5 text-primary" />Delivery Partner</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5 text-sm">
                <div className="font-semibold">{order.deliveryPartner.name}</div>
                <div className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{order.deliveryPartner.phone}</div>
                <div className="text-muted-foreground flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />{order.deliveryPartner.vehicleNumber}</div>
              </div>
              <Badge variant="secondary">Assigned</Badge>
            </CardContent>
          </Card>
        )}

        {/* Order Summary details */}
        <Card className="border-border shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Items list with images */}
            <div className="space-y-3">
              {order.items.map((item, i) => {
                const menuItem = menuItems?.find(m => m.id === item.menuItemId);
                return (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <DishImage
                        src={menuItem?.imageUrl}
                        alt={item.menuItemName}
                        className="w-12 h-12 rounded shrink-0 aspect-square"
                        iconClassName="h-4 w-4"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block truncate">{item.menuItemName}</span>
                        <span className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm shrink-0">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Total summary info */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-primary">₹{order.totalAmount.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground pt-1.5">
                <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Payment Method</span>
                <span>{order.paymentMethod}</span>
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Payment Status</span>
                <Badge className={`${paymentBadgeColor} border-none font-normal text-xs`} variant="outline">
                  {paymentStatus}
                </Badge>
              </div>
            </div>

            {/* Delivery address details */}
            {order.orderType === "delivery" && order.deliveryAddress && (
              <>
                <Separator />
                <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Delivery Address</span>
                  <p className="font-medium">
                    {order.deliveryAddress.houseNumber}, {order.deliveryAddress.street}
                  </p>
                  <p>{order.deliveryAddress.area}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}</p>
                  {order.deliveryAddress.landmark && (
                    <p className="text-muted-foreground italic text-[11px]">Landmark: {order.deliveryAddress.landmark}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
