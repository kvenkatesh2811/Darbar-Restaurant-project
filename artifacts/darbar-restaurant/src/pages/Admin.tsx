import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  BarChart3, Users, MessageSquare, ShoppingCart, 
  LogOut, ChefHat, Star, Clock, Plus, Edit2, Trash2,
  MessageCircle, AlertTriangle, TrendingUp, Sparkles, ToggleLeft, ToggleRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetStatsSummary,
  useListOrders,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  useListReviews,
  useListLeads,
  useListMenuItems,
  useListCategories,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  getListMenuItemsQueryKey,
  useListFeedback,
  OrderStatusUpdateStatus,
  useGetDailyRevenue,
  useGetPopularItems,
  useListAllReviews,
  useUpdateReviewApproval,
  getListAllReviewsQueryKey,
  useListAllSpecials,
  useCreateSpecial,
  useUpdateSpecial,
  useDeleteSpecial,
  getListAllSpecialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem, Special } from "@workspace/api-client-react";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be at least ₹1"),
  categorySlug: z.string().min(1, "Category is required"),
  isVeg: z.boolean(),
  isAvailable: z.boolean(),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

function MenuItemDialog({
  open,
  onClose,
  editItem,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  editItem: MenuItem | null;
  categories: { slug: string; name: string }[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "", description: "", price: 0, categorySlug: "",
      isVeg: false, isAvailable: true,
    },
  });

  useEffect(() => {
    if (editItem) {
      form.reset({
        name: editItem.name,
        description: editItem.description || "",
        price: Number(editItem.price),
        categorySlug: editItem.categorySlug,
        isVeg: editItem.isVeg,
        isAvailable: editItem.isAvailable,
      });
    } else {
      form.reset({ name: "", description: "", price: 0, categorySlug: "", isVeg: false, isAvailable: true });
    }
  }, [editItem, open]);

  const onSubmit = (values: MenuItemFormValues) => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
      onClose();
    };

    if (editItem) {
      updateMenuItem.mutate(
        { id: editItem.id, data: values },
        {
          onSuccess: () => { toast({ title: "Item updated" }); invalidate(); },
          onError: () => toast({ variant: "destructive", title: "Failed to update item" }),
        }
      );
    } else {
      createMenuItem.mutate(
        { data: values },
        {
          onSuccess: () => { toast({ title: "Item added to menu" }); invalidate(); },
          onError: () => toast({ variant: "destructive", title: "Failed to add item" }),
        }
      );
    }
  };

  const isPending = createMenuItem.isPending || updateMenuItem.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{editItem ? "Edit Menu Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>{editItem ? "Update the details of this menu item." : "Add a new dish to the menu."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Chicken Dum Biryani" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="260" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categorySlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Brief description of the dish..." className="resize-none" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="isVeg"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label className={field.value ? "text-green-600" : "text-red-600"}>
                      {field.value ? "Vegetarian" : "Non-Vegetarian"}
                    </Label>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label>{field.value ? "Available" : "Out of Stock"}</Label>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editItem ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const specialSchema = z.object({
  dishName: z.string().min(1, "Dish name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be ≥ 0"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.boolean(),
});

type SpecialFormValues = z.infer<typeof specialSchema>;

function SpecialDialog({
  open,
  onClose,
  editSpecial,
}: {
  open: boolean;
  onClose: () => void;
  editSpecial: Special | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSpecial = useCreateSpecial();
  const updateSpecial = useUpdateSpecial();

  const form = useForm<SpecialFormValues>({
    resolver: zodResolver(specialSchema),
    defaultValues: { dishName: "", description: "", price: 0, imageUrl: "", isActive: true },
  });

  useEffect(() => {
    if (editSpecial) {
      form.reset({
        dishName: editSpecial.dishName,
        description: editSpecial.description || "",
        price: Number(editSpecial.price),
        imageUrl: editSpecial.imageUrl || "",
        isActive: editSpecial.isActive,
      });
    } else {
      form.reset({ dishName: "", description: "", price: 0, imageUrl: "", isActive: true });
    }
  }, [editSpecial, open]);

  const onSubmit = (values: SpecialFormValues) => {
    const payload = { ...values, imageUrl: values.imageUrl || undefined };
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListAllSpecialsQueryKey() });
      onClose();
    };

    if (editSpecial) {
      updateSpecial.mutate(
        { id: editSpecial.id, data: payload },
        {
          onSuccess: () => { toast({ title: "Special updated" }); invalidate(); },
          onError: () => toast({ variant: "destructive", title: "Failed to update special" }),
        }
      );
    } else {
      createSpecial.mutate(
        { data: payload },
        {
          onSuccess: () => { toast({ title: "Special created" }); invalidate(); },
          onError: () => toast({ variant: "destructive", title: "Failed to create special" }),
        }
      );
    }
  };

  const isPending = createSpecial.isPending || updateSpecial.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{editSpecial ? "Edit Special" : "Add Today's Special"}</DialogTitle>
          <DialogDescription>{editSpecial ? "Update this featured dish." : "Highlight a dish as today's special on the homepage."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dishName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dish Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Chef's Special Biryani" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="280" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <Label className={field.value ? "text-green-600" : "text-muted-foreground"}>
                          {field.value ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Brief description..." className="resize-none" {...field} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editSpecial ? "Save Changes" : "Add Special"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const STORAGE_KEY = "darbar_admin_auth";

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        onSuccess();
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold text-primary mb-2">Darbar</h1>
          <p className="text-muted-foreground text-sm">Admin Panel — Staff Only</p>
        </div>
        <Card className="shadow-xl border-border">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Enter your admin password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(() =>
    sessionStorage.getItem(STORAGE_KEY) === "1"
  );

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return <AdminPanel onLogout={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthenticated(false); }} />;
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetStatsSummary();
  const { data: orders } = useListOrders();
  const { data: reviews } = useListReviews();
  const { data: leads } = useListLeads();
  const { data: menuItems } = useListMenuItems();
  const { data: categories } = useListCategories();
  const { data: feedbackList } = useListFeedback();
  const { data: dailyRevenue } = useGetDailyRevenue();
  const { data: popularItems } = useGetPopularItems();
  const { data: allReviews } = useListAllReviews();
  const updateReviewApproval = useUpdateReviewApproval();
  const { data: allSpecials } = useListAllSpecials();
  const deleteSpecial = useDeleteSpecial();

  const updateOrderStatus = useUpdateOrderStatus();
  const deleteMenuItem = useDeleteMenuItem();

  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const [specialDialogOpen, setSpecialDialogOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [deleteSpecialId, setDeleteSpecialId] = useState<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleStatusUpdate = (orderId: number, newStatus: OrderStatusUpdateStatus) => {
    updateOrderStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => { toast({ title: "Status updated" }); queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); },
        onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
      }
    );
  };

  const handleDeleteItem = () => {
    if (deleteItemId === null) return;
    deleteMenuItem.mutate(
      { id: deleteItemId },
      {
        onSuccess: () => {
          toast({ title: "Item deleted" });
          queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
          setDeleteItemId(null);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete item" }),
      }
    );
  };

  const openAddDialog = () => { setEditingItem(null); setMenuDialogOpen(true); };
  const openEditDialog = (item: MenuItem) => { setEditingItem(item); setMenuDialogOpen(true); };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      ready: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return <Badge className={`${variants[status] || "bg-gray-100"} border-none hover:opacity-90`} variant="outline">{status.toUpperCase()}</Badge>;
  };

  const handleDeleteSpecial = () => {
    if (deleteSpecialId === null) return;
    deleteSpecial.mutate(
      { id: deleteSpecialId },
      {
        onSuccess: () => {
          toast({ title: "Special deleted" });
          queryClient.invalidateQueries({ queryKey: getListAllSpecialsQueryKey() });
          setDeleteSpecialId(null);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete special" }),
      }
    );
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, badge: null },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: stats?.pendingOrders || null },
    { id: "menu", label: "Menu Management", icon: ChefHat, badge: null },
    { id: "specials", label: "Today's Specials", icon: Sparkles, badge: null },
    { id: "leads", label: "Leads & Customers", icon: Users, badge: null },
    { id: "reviews", label: "Reviews", icon: MessageSquare, badge: null },
    { id: "feedback", label: "Feedback", icon: MessageCircle, badge: null },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pt-20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border p-6 flex-col min-h-[calc(100vh-80px)] sticky top-20">
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold text-primary">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Darbar Restaurant</p>
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map(item => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
              {item.badge ? <Badge className="ml-auto bg-primary text-white text-xs">{item.badge}</Badge> : null}
            </Button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-border space-y-2">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground">
              ← Return to Site
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-border bg-card px-4 py-3 overflow-x-auto">
        <div className="flex space-x-2">
          {navItems.map(item => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(item.id)}
              className="capitalize whitespace-nowrap text-xs"
            >
              {item.label.split(" ")[0]}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Dashboard Overview</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.todayOrders || 0} today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{stats?.pendingOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{stats?.averageRating?.toFixed(1) || "—"}</div>
                  <p className="text-xs text-muted-foreground mt-1">From {stats?.totalReviews || 0} reviews</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats?.totalLeads || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Email subscribers</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue trend */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Revenue — Last 7 Days</CardTitle>
                    <CardDescription className="text-xs mt-1">Daily pickup order revenue (₹)</CardDescription>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dailyRevenue || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v + "T00:00:00");
                          return d.toLocaleDateString("en-IN", { weekday: "short" });
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
                      <Tooltip
                        formatter={(value: number) => [`₹${value.toFixed(0)}`, "Revenue"]}
                        labelFormatter={(label: string) => {
                          const d = new Date(label + "T00:00:00");
                          return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#F97316"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                        dot={{ r: 3, fill: "#F97316" }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Popular items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Popular Items</CardTitle>
                    <CardDescription className="text-xs mt-1">Most ordered dishes (by quantity)</CardDescription>
                  </div>
                  <ChefHat className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  {(!popularItems || popularItems.length === 0) ? (
                    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                      No orders yet — data will appear here once customers start ordering.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={popularItems.slice(0, 7)}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v}
                        />
                        <Tooltip formatter={(value: number) => [value, "Orders"]} />
                        <Bar dataKey="orderCount" fill="#FACC15" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest 5 pickup orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.slice(0, 5).map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.pickupTime}</TableCell>
                        <TableCell>₹{order.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                    {!orders?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No orders yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Order Management</h1>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 w-16">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="pl-6 font-medium">#{order.id}</TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell className="text-sm">{order.phone}</TableCell>
                        <TableCell>{order.pickupTime}</TableCell>
                        <TableCell className="text-sm">
                          <span title={order.items.map(i => `${i.quantity}× ${i.menuItemName}`).join(", ")}>
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">₹{order.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            {order.status === "pending" && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(order.id, "confirmed")}>Confirm</Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusUpdate(order.id, "preparing")}>Preparing</Button>
                            )}
                            {order.status === "preparing" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(order.id, "ready")}>Ready</Button>
                            )}
                            {order.status === "ready" && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "completed")}>Complete</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!orders?.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No orders yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MENU MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold font-serif">Menu Management</h1>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 w-16">ID</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-6 text-muted-foreground text-sm">{item.id}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm">{item.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.isVeg ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>
                            {item.isVeg ? "VEG" : "NON-VEG"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">₹{item.price}</TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Available</Badge>
                          ) : (
                            <Badge variant="secondary">Out of Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItemId(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!menuItems?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No menu items found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SPECIALS */}
        {activeTab === "specials" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold font-serif">Today's Specials</h1>
                <p className="text-sm text-muted-foreground mt-1">These appear in the Featured Specials section on the homepage.</p>
              </div>
              <Button onClick={() => { setEditingSpecial(null); setSpecialDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Special
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allSpecials?.map(special => (
                <Card key={special.id} className={`flex flex-col overflow-hidden border-2 transition-colors ${special.isActive ? "border-primary/20" : "border-border opacity-60"}`}>
                  {special.imageUrl && (
                    <div className="h-36 overflow-hidden bg-muted">
                      <img src={special.imageUrl} alt={special.dishName} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{special.dishName}</CardTitle>
                      {special.isActive
                        ? <Badge className="bg-green-600 hover:bg-green-600 shrink-0">Active</Badge>
                        : <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                      }
                    </div>
                    <p className="text-xl font-bold text-primary font-serif">₹{Number(special.price).toFixed(0)}</p>
                  </CardHeader>
                  {special.description && (
                    <CardContent className="flex-1 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">{special.description}</p>
                    </CardContent>
                  )}
                  <div className="px-6 pb-5 flex gap-2 mt-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setEditingSpecial(special); setSpecialDialogOpen(true); }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteSpecialId(special.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
              {!allSpecials?.length && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-card border border-border border-dashed rounded-xl gap-3">
                  <Sparkles className="h-10 w-10 opacity-30" />
                  <p className="font-medium">No specials yet</p>
                  <p className="text-sm">Add a dish to feature it on the homepage.</p>
                  <Button variant="outline" size="sm" onClick={() => { setEditingSpecial(null); setSpecialDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Your First Special
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEADS */}
        {activeTab === "leads" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Customer Leads</h1>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead className="pr-6 text-right">Date Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads?.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium pl-6">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell>{lead.dateOfBirth ? new Date(lead.dateOfBirth).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="pr-6 text-right text-muted-foreground text-sm">{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {!leads?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No leads yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* REVIEWS */}
        {activeTab === "reviews" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold font-serif">Reviews</h1>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {allReviews?.filter(r => r.isApproved).length ?? 0} approved
                </Badge>
                <Badge variant="outline" className="text-amber-600 border-amber-200">
                  {allReviews?.filter(r => !r.isApproved).length ?? 0} pending
                </Badge>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allReviews?.map(review => (
                <Card
                  key={review.id}
                  className={`relative flex flex-col transition-opacity ${!review.isApproved ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                >
                  <div className="absolute top-4 right-4">
                    <Badge
                      variant={review.isApproved ? "default" : "secondary"}
                      className={review.isApproved ? "bg-green-600 hover:bg-green-600" : "bg-amber-100 text-amber-800 border-amber-200"}
                    >
                      {review.isApproved ? "Live" : "Pending"}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2 pr-24">
                    <CardTitle className="text-base">{review.customerName}</CardTitle>
                    <div className="flex text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm italic text-muted-foreground">"{review.comment}"</p>
                    <p className="text-xs text-muted-foreground mt-3">{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </CardContent>
                  <div className="px-6 pb-5 flex gap-2">
                    {!review.isApproved ? (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={updateReviewApproval.isPending}
                        onClick={() =>
                          updateReviewApproval.mutate(
                            { id: review.id, data: { isApproved: true } },
                            {
                              onSuccess: () => { toast({ title: "Review approved — now visible on homepage" }); queryClient.invalidateQueries({ queryKey: getListAllReviewsQueryKey() }); },
                              onError: () => toast({ variant: "destructive", title: "Failed to approve review" }),
                            }
                          )
                        }
                      >
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        disabled={updateReviewApproval.isPending}
                        onClick={() =>
                          updateReviewApproval.mutate(
                            { id: review.id, data: { isApproved: false } },
                            {
                              onSuccess: () => { toast({ title: "Review hidden from homepage" }); queryClient.invalidateQueries({ queryKey: getListAllReviewsQueryKey() }); },
                              onError: () => toast({ variant: "destructive", title: "Failed to reject review" }),
                            }
                          )
                        }
                      >
                        Hide
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {!allReviews?.length && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                  No reviews submitted yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* FEEDBACK */}
        {activeTab === "feedback" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Customer Feedback</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedbackList?.map(fb => (
                <Card key={fb.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{fb.name}</CardTitle>
                      <div className="flex text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < fb.rating ? "fill-current" : "opacity-20"}`} />
                        ))}
                      </div>
                    </div>
                    {fb.phone && <p className="text-xs text-muted-foreground">{fb.phone}</p>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">"{fb.comment}"</p>
                    <p className="text-xs text-muted-foreground mt-4">{new Date(fb.createdAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
              {!feedbackList?.length && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                  No feedback submitted yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Menu Item Add/Edit Dialog */}
      <MenuItemDialog
        open={menuDialogOpen}
        onClose={() => setMenuDialogOpen(false)}
        editItem={editingItem}
        categories={categories || []}
      />

      {/* Delete Menu Item Confirmation */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={(v) => !v && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Menu Item
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item from the menu. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteItem}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Special Add/Edit Dialog */}
      <SpecialDialog
        open={specialDialogOpen}
        onClose={() => setSpecialDialogOpen(false)}
        editSpecial={editingSpecial}
      />

      {/* Delete Special Confirmation */}
      <AlertDialog open={deleteSpecialId !== null} onOpenChange={(v) => !v && setDeleteSpecialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Special
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this special from the homepage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteSpecial}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
