import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useClerk, useUser, useAuth } from "@clerk/react";
import { 
  BarChart3, Users, MessageSquare, ShoppingCart, 
  LogOut, ChefHat, Star, Clock, Plus, Edit2, Trash2,
  MessageCircle, AlertTriangle, TrendingUp, Sparkles, ToggleLeft, ToggleRight, QrCode, CalendarDays,
  CheckCircle2, XCircle, Award, Eye, Search, ShieldAlert, RefreshCw, MapPin
} from "lucide-react";
import { RestaurantQRCode, getSiteUrl } from "@/components/RestaurantQRCode";
import { DishImage } from "@/components/DishImage";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem, Special } from "@workspace/api-client-react";

function parseRewardSummary(notes?: string | null): any {
  if (!notes) return null;
  try {
    const match = notes.match(/\[REWARD_SUMMARY:(.*?)\]/);
    if (match) return JSON.parse(match[1]);
  } catch {
    // ignore parse error
  }
  return null;
}
import { ImageUploader } from "@/components/ImageUploader";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be at least ₹1"),
  categorySlug: z.string().min(1, "Category is required"),
  isVeg: z.boolean(),
  isAvailable: z.boolean(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
      isVeg: false, isAvailable: true, imageUrl: "",
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
        imageUrl: editItem.imageUrl || "",
      });
    } else {
      form.reset({ name: "", description: "", price: 0, categorySlug: "", isVeg: false, isAvailable: true, imageUrl: "" });
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
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
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
    // Send imageUrl as-is (including "") so an explicit removal is
    // persisted — the backend only skips updating fields that are
    // `undefined`, so coercing "" to undefined here would silently keep
    // the old image URL in the database.
    const payload = values;
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
                  <FormLabel>Photo (Optional)</FormLabel>
                  <FormControl>
                    <ImageUploader
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
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

export default function Admin() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  const { data: adminStatus, isLoading } = useQuery({
    queryKey: ["admin-status", isSignedIn],
    queryFn: async () => {
      if (!isSignedIn) return { isAdmin: false };
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/admin/check-status", { headers });
      if (!res.ok) return { isAdmin: false };
      return res.json() as Promise<{ isAdmin: boolean; isOwner?: boolean; role?: string; email?: string | null }>;
    },
    enabled: !!isSignedIn,
  });

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="text-center max-w-md p-8 bg-card border border-border rounded-2xl shadow-sm">
          <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-bold mb-2">Admin Sign In Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in with an authorized administrator account to access the Darbar Admin Panel.</p>
          <Link href="/sign-in">
            <Button size="lg" className="w-full">Sign In to Admin</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-medium">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Verifying admin privileges...
        </div>
      </div>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <div className="text-center max-w-md p-8 bg-card border border-border rounded-2xl shadow-sm">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Your logged-in account does not have administrator privileges. Admin access is restricted to authorized email addresses.</p>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <AdminPanel adminStatus={adminStatus} />;
}

function AdminPanel({ adminStatus }: { adminStatus: { isAdmin: boolean; isOwner?: boolean; role?: string; email?: string | null } }) {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetStatsSummary();
  const { data: orders, refetch: refetchOrders, isRefetching: isRefetchingOrders } = useListOrders(
    undefined,
    {
      query: {
        refetchInterval: 5000,
      } as any,
    }
  );
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

  // Order filters
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Customer search & query
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customers, refetch: refetchCustomers } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/customers", { headers });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json() as Promise<Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        dateOfBirth: string;
        totalOrders: number;
        completedOrdersCount: number;
        totalSpending: number;
        currentProgress: number;
        availableRewards: number;
        redeemedRewards: number;
        birthdayEligibility: boolean;
      }>>;
    }
  });

  // Leads search & filters
  const [leadsSearch, setLeadsSearch] = useState("");

  // Feedback filter
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");

  // Admin Management state & query
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "owner">("admin");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [deleteAdminUser, setDeleteAdminUser] = useState<any | null>(null);
  const [adminUserSearch, setAdminUserSearch] = useState("");

  const { data: adminUsers, refetch: refetchAdminUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/users", { headers });
      if (!res.ok) throw new Error("Failed to fetch admin users");
      return res.json() as Promise<Array<{
        id: number;
        email: string;
        role: "owner" | "admin";
        addedBy: string;
        createdAt: string;
      }>>;
    },
    enabled: !!adminStatus?.isOwner,
  });

  const handleAddAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    try {
      setIsAddingAdmin(true);
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: newAdminEmail.trim(), role: newAdminRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add admin user");

      toast({
        title: "Admin Authorized",
        description: `Successfully added ${newAdminEmail.trim()} as an authorized ${newAdminRole.toUpperCase()}.`,
      });
      setNewAdminEmail("");
      refetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error Adding Admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleDeleteAdminUser = async () => {
    if (!deleteAdminUser) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/users/${deleteAdminUser.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke admin user");

      toast({
        title: "Admin Revoked",
        description: `Successfully revoked admin access for ${deleteAdminUser.email}.`,
      });
      setDeleteAdminUser(null);
      refetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error Revoking Admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Reusable CSV Export Helper
  const exportToCSV = (data: any[], headers: string[], filename: string) => {
    const csvRows = [];
    csvRows.push(headers.join(","));
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const stringified = val === null || val === undefined ? "" : String(val);
        const escaped = stringified.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const filteredOrdersList = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      if (orderSearch && !order.id.toString().includes(orderSearch)) return false;
      if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) return false;
      if (orderTypeFilter !== "all" && order.orderType !== orderTypeFilter) return false;
      if (orderPaymentFilter !== "all") {
        const isPaid = order.status === "completed";
        const isCancelled = order.status === "cancelled";
        const status = isPaid ? "paid" : isCancelled ? "cancelled" : "pending";
        if (status !== orderPaymentFilter) return false;
      }
      return true;
    });
  }, [orders, orderSearch, orderStatusFilter, orderTypeFilter, orderPaymentFilter]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter(c => {
      const term = customerSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.includes(term)
      );
    });
  }, [customers, customerSearch]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      const term = leadsSearch.toLowerCase();
      return (
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        (l.phone && l.phone.includes(term))
      );
    });
  }, [leads, leadsSearch]);

  const filteredFeedbackList = useMemo(() => {
    if (!feedbackList) return [];
    return feedbackList.filter(f => {
      if (feedbackRatingFilter !== "all" && f.rating.toString() !== feedbackRatingFilter) return false;
      return true;
    });
  }, [feedbackList, feedbackRatingFilter]);

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
    ...(adminStatus?.isOwner ? [{ id: "admin-users", label: "Admin Management", icon: ShieldAlert, badge: null }] : []),
    { id: "customers", label: "Customers & Loyalty", icon: Users, badge: null },
    { id: "leads", label: "Customer Leads", icon: Users, badge: null },
    { id: "reviews", label: "Reviews", icon: MessageSquare, badge: null },
    { id: "feedback", label: "Feedback", icon: MessageCircle, badge: null },
    { id: "qr-code", label: "Restaurant QR Code", icon: QrCode, badge: null },
    { id: "birthdays", label: "Upcoming Birthdays", icon: CalendarDays, badge: null },
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
            onClick={() => signOut({ redirectUrl: "/" })}
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
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{stats?.pendingOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{(stats as any)?.completedOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Fulfilled successfully</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{(stats as any)?.cancelledOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Voided/Returned</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <Award className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">₹{((stats as any)?.totalRevenue ?? 0).toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From completed orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">₹{((stats as any)?.averageOrderValue ?? 0).toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Per completed order</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{(stats as any)?.totalCustomers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total database customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
                  <CalendarDays className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{(stats as any)?.upcomingBirthdays || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">In the next 30 days</p>
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
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Order Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage, filter, and track order stages and fulfillment.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetchOrders()}
                  className="gap-2"
                  disabled={isRefetchingOrders}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefetchingOrders ? "animate-spin" : ""}`} />
                  Refresh Orders
                </Button>
                <Button onClick={() => {
                  const headers = ["id", "customerName", "phone", "email", "pickupTime", "status", "paymentMethod", "totalAmount", "createdAt"];
                  exportToCSV(filteredOrdersList, headers, "orders_export.csv");
                }} className="gap-2">
                  Export to CSV
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="h-4 w-4 text-muted-foreground my-auto ml-3 absolute top-0 bottom-0" />
                  <Input
                    placeholder="Search by Order ID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div>
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Received (Pending)</SelectItem>
                      <SelectItem value="confirmed">Accepted (Confirmed)</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="completed">Delivered / Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={orderPaymentFilter} onValueChange={setOrderPaymentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Payment Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid (Completed)</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 w-16">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrdersList.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="pl-6 font-medium">#{order.id}</TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell className="text-sm">{order.phone}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {order.orderType}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            {order.orderType === "delivery" ? "Delivery" : order.pickupTime}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span title={order.items.map(i => `${i.quantity}× ${i.menuItemName}`).join(", ")}>
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">₹{order.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === "pending" && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusUpdate(order.id, "confirmed")}>Confirm</Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleStatusUpdate(order.id, "preparing")}>Preparing</Button>
                            )}
                            {order.status === "preparing" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(order.id, "ready")}>Ready</Button>
                            )}
                            {order.status === "ready" && order.orderType === "delivery" && (
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleStatusUpdate(order.id, "out_for_delivery")}>Send</Button>
                            )}
                            {order.status === "ready" && order.orderType === "pickup" && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "completed")}>Complete</Button>
                            )}
                            {order.status === "out_for_delivery" && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "completed")}>Complete</Button>
                            )}
                            {order.status !== "completed" && order.status !== "cancelled" && (
                              <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, "cancelled")}>Cancel</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredOrdersList.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No matching orders found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Selected Order Detail Modal */}
            <Dialog open={selectedOrder !== null} onOpenChange={(v) => !v && setSelectedOrder(null)}>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">Order Details - #{selectedOrder?.id}</DialogTitle>
                  <DialogDescription>
                    Placed on {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                {selectedOrder && (
                  <div className="space-y-6">
                    {/* Customer information */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Customer Name</span>
                        <span className="font-medium">{selectedOrder.customerName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Contact Phone</span>
                        <span className="font-medium">{selectedOrder.phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground block">Email Address</span>
                        <span className="font-medium">{selectedOrder.email}</span>
                      </div>
                    </div>

                    {/* Delivery Address or Pickup Time */}
                    <div className="border border-border p-3 rounded-lg text-sm">
                      {selectedOrder.orderType === "delivery" ? (
                        <div>
                          <span className="text-xs font-semibold text-primary block mb-1">Delivery Address</span>
                          <p className="font-medium">
                            {selectedOrder.deliveryAddress?.houseNumber}, {selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.area}, {selectedOrder.deliveryAddress?.city} - {selectedOrder.deliveryAddress?.pincode}
                          </p>
                          {selectedOrder.deliveryAddress?.landmark && (
                            <p className="text-xs text-muted-foreground mt-1">Landmark: {selectedOrder.deliveryAddress.landmark}</p>
                          )}
                          {selectedOrder.deliveryAddress && (
                            <div className="mt-2">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${selectedOrder.deliveryAddress.houseNumber || ''} ${selectedOrder.deliveryAddress.street || ''} ${selectedOrder.deliveryAddress.area || ''} ${selectedOrder.deliveryAddress.city || ''} ${selectedOrder.deliveryAddress.pincode || ''}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                              >
                                <MapPin className="h-3.5 w-3.5" /> View on Google Maps
                              </a>
                            </div>
                          )}
                          {selectedOrder.deliveryPartner && (
                            <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded text-xs flex justify-between">
                              <span>Delivery Partner Assigned:</span>
                              <span className="font-bold">{selectedOrder.deliveryPartner}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-primary block mb-1">Pickup Slot</span>
                          <p className="font-medium">{selectedOrder.pickupTime}</p>
                        </div>
                      )}
                    </div>

                    {/* Ordered food items */}
                    <div className="space-y-3">
                      <span className="text-xs text-semibold text-muted-foreground block uppercase tracking-wider">Ordered Food Items</span>
                      <div className="space-y-2 border-t pt-2">
                        {selectedOrder.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center gap-3 text-sm">
                            <div className="flex items-center gap-3">
                              {menuItems?.find(m => m.id === item.menuItemId)?.imageUrl ? (
                                <DishImage
                                  src={menuItems.find(m => m.id === item.menuItemId)!.imageUrl}
                                  alt={item.menuItemName}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                              )}
                              <div>
                                <span className="font-medium block">{item.menuItemName}</span>
                                <span className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</span>
                              </div>
                            </div>
                            <span className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bill Breakdown */}
                    <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-sm border">
                      {(() => {
                        const summary = parseRewardSummary(selectedOrder.notes);
                        const itemsSubtotal = selectedOrder.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
                        return summary ? (
                          <>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Subtotal</span>
                              <span>₹{summary.subtotal.toFixed(0)}</span>
                            </div>
                            {summary.loyaltyDiscount > 0 && (
                              <div className="flex justify-between text-green-600 font-semibold">
                                <span>Loyalty Discount</span>
                                <span>-₹{summary.loyaltyDiscount.toFixed(0)}</span>
                              </div>
                            )}
                            {summary.birthdayDiscount > 0 && (
                              <div className="flex justify-between text-orange-600 font-semibold">
                                <span>Birthday Discount (10%)</span>
                                <span>-₹{summary.birthdayDiscount.toFixed(0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                              <span>GST (5%)</span>
                              <span>₹{summary.gst.toFixed(0)}</span>
                            </div>
                            {selectedOrder.orderType === "delivery" && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Delivery Fee</span>
                                <span>₹{summary.deliveryCharge.toFixed(0)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Subtotal</span>
                              <span>₹{itemsSubtotal.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>GST (5%)</span>
                              <span>₹{(itemsSubtotal * 0.05).toFixed(0)}</span>
                            </div>
                            {selectedOrder.orderType === "delivery" && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Delivery Fee</span>
                                <span>₹{selectedOrder.deliveryCharge}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div className="flex justify-between font-bold border-t pt-1.5 text-base text-primary">
                        <span>Grand Total</span>
                        <span>₹{selectedOrder.totalAmount.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="flex justify-between items-center text-sm border-t pt-3">
                      <div>
                        <span className="text-xs text-muted-foreground block">Payment Method</span>
                        <span className="font-semibold">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Payment Status</span>
                        <Badge variant={selectedOrder.status === "completed" ? "default" : "outline"} className="capitalize">
                          {selectedOrder.status === "completed" ? "Paid" : selectedOrder.status === "cancelled" ? "Cancelled" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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

        {/* CUSTOMERS & LOYALTY */}
        {activeTab === "customers" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Customers & Loyalty</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage and track registered user accounts and loyalty progress.</p>
              </div>
              <Button onClick={() => {
                const headers = ["id", "name", "email", "phone", "dateOfBirth", "totalOrders", "completedOrdersCount", "totalSpending", "currentProgress", "availableRewards", "redeemedRewards", "birthdayEligibility"];
                exportToCSV(filteredCustomers, headers, "customers_loyalty_export.csv");
              }} className="gap-2">
                Export to CSV
              </Button>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex max-w-sm gap-2 relative">
                  <Search className="h-4 w-4 text-muted-foreground my-auto ml-3 absolute top-0 bottom-0" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Date of Birth</TableHead>
                        <TableHead className="text-center">Total Orders</TableHead>
                        <TableHead className="text-center">Loyalty Progress</TableHead>
                        <TableHead className="text-center">Available Rewards</TableHead>
                        <TableHead className="text-center">Redeemed</TableHead>
                        <TableHead className="text-right">Total Spending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold">{item.name}</TableCell>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.phone || "—"}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              {item.dateOfBirth}
                              {item.birthdayEligibility && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] py-0 px-1 animate-pulse">🎂 Active</Badge>}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{item.totalOrders} ({item.completedOrdersCount} completed)</TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-xs bg-primary/10 text-primary py-0.5 px-2 rounded-full">{item.currentProgress} / 10</span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-green-600">{item.availableRewards}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{item.redeemedRewards}</TableCell>
                          <TableCell className="text-right font-bold">₹{item.totalSpending.toFixed(0)}</TableCell>
                        </TableRow>
                      ))}
                      {!filteredCustomers.length && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No customers found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LEADS */}
        {activeTab === "leads" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Customer Leads</h1>
                <p className="text-sm text-muted-foreground mt-1">General email and newsletter subscriber contacts.</p>
              </div>
              <Button onClick={() => {
                const headers = ["id", "name", "email", "phone", "dateOfBirth", "createdAt"];
                exportToCSV(filteredLeads, headers, "leads_export.csv");
              }} className="gap-2">
                Export to CSV
              </Button>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex max-w-sm gap-2 relative">
                  <Search className="h-4 w-4 text-muted-foreground my-auto ml-3 absolute top-0 bottom-0" />
                  <Input
                    placeholder="Search leads by name or email..."
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

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
                    {filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium pl-6">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell>{lead.dateOfBirth ? new Date(lead.dateOfBirth).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="pr-6 text-right text-muted-foreground text-sm">{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {!filteredLeads.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No leads found.</TableCell>
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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Reviews</h1>
                <p className="text-sm text-muted-foreground mt-1">Approve or hide customer reviews shown on the homepage.</p>
              </div>
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
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Customer Feedback</h1>
                <p className="text-sm text-muted-foreground mt-1">Direct feedback responses and ratings from patrons.</p>
              </div>
              <div className="flex gap-3 items-center">
                <Select value={feedbackRatingFilter} onValueChange={setFeedbackRatingFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Rating Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => {
                  const headers = ["id", "name", "rating", "comment", "createdAt"];
                  exportToCSV(filteredFeedbackList, headers, "feedback_export.csv");
                }} className="gap-2">
                  Export to CSV
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeedbackList.map(fb => (
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
              {!filteredFeedbackList.length && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                  No feedback found matching filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESTAURANT QR CODE */}
        {activeTab === "qr-code" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h1 className="text-3xl font-bold font-serif">Restaurant QR Code</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generated live from your site's URL — printing or downloading always points customers to the current, live site.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Homepage</CardTitle>
                  <CardDescription>For flyers, table tents, and general signage.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <RestaurantQRCode path="/" size={160} fileName="darbar-homepage-qr.png" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Full Menu</CardTitle>
                  <CardDescription>Best for dine-in tables — opens the menu directly.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <RestaurantQRCode path="/menu" size={160} fileName="darbar-menu-qr.png" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Online</CardTitle>
                  <CardDescription>Best for takeaway counters and packaging.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <RestaurantQRCode path="/order" size={160} fileName="darbar-order-qr.png" />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                Each code is generated on the fly from <span className="font-medium text-foreground">{getSiteUrl("/")}</span> — there's nothing to "regenerate"; if your domain ever changes, these codes update automatically.
              </CardContent>
            </Card>
          </div>
        )}

        {/* UPCOMING BIRTHDAYS */}
        {activeTab === "birthdays" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h1 className="text-3xl font-bold font-serif">Upcoming Birthdays</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Customers and leads who have birthdays in the next 30 days, sorted by nearest birthday first.
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <UpcomingBirthdaysPanel />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ADMIN USER MANAGEMENT */}
        {activeTab === "admin-users" && adminStatus?.isOwner && (
          <div className="space-y-8 animate-in fade-in-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Admin User Management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Authorize new email accounts or revoke existing admin access for restaurant managers & staff.
                </p>
              </div>
              <Badge variant="outline" className="px-3 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 border-orange-200">
                Role: Super Admin / Owner
              </Badge>
            </div>

            {/* Add Admin Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Authorize New Admin Email
                </CardTitle>
                <CardDescription className="text-xs">
                  Authorized emails can log in via Clerk to manage Orders, Menu items, and Customer feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAdminUser} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1.5 w-full">
                    <Label htmlFor="adminEmail" className="text-xs font-medium">Email Address</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="e.g. manager@darbar.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-full sm:w-48 space-y-1.5">
                    <Label htmlFor="adminRole" className="text-xs font-medium">Assigned Role</Label>
                    <Select value={newAdminRole} onValueChange={(v: "admin" | "owner") => setNewAdminRole(v)}>
                      <SelectTrigger id="adminRole">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Manager / Staff)</SelectItem>
                        <SelectItem value="owner">Owner (Super Admin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isAddingAdmin || !newAdminEmail.trim()} className="w-full sm:w-auto">
                    {isAddingAdmin ? "Authorizing..." : "Add Admin Email"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Authorized Admins List Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Authorized Admin Accounts</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Showing currently authorized emails stored in database and system environment.
                  </CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search email..."
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Email Address</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Date Authorized</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(adminUsers || [])
                      .filter((u) => u.email.toLowerCase().includes(adminUserSearch.toLowerCase().trim()))
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="pl-6 font-medium text-sm">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === "owner" ? "default" : "secondary"} className="capitalize font-semibold">
                              {u.role === "owner" ? "Owner / Super Admin" : "Admin / Staff"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.addedBy}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            {u.id > 0 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteAdminUser(u)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Revoke
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">System (.env)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!adminUsers || adminUsers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No authorized admin emails found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Revoke Admin Confirmation Dialog */}
            <AlertDialog open={deleteAdminUser !== null} onOpenChange={(v) => !v && setDeleteAdminUser(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive font-serif flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" /> Revoke Admin Privileges?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm pt-1">
                    Are you sure you want to revoke admin access for <strong className="text-foreground">{deleteAdminUser?.email}</strong>? They will no longer be able to access the Admin Panel or API endpoints.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAdminUser}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Revoke Access
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

function UpcomingBirthdaysPanel() {
  const { data: birthdays, isLoading, error } = useQuery({
    queryKey: ["admin-birthdays"],
    queryFn: async () => {
      const res = await fetch("/api/admin/birthdays");
      if (!res.ok) throw new Error("Failed to fetch upcoming birthdays");
      return res.json() as Promise<Array<{
        id: number;
        name: string;
        dateOfBirth: string;
        phone: string;
        email: string;
        daysUntil: number;
      }>>;
    }
  });

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">Loading upcoming birthdays...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-destructive font-medium">Failed to load birthdays.</div>;
  }

  if (!birthdays || birthdays.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No upcoming birthdays in the next 30 days.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Email Address</TableHead>
            <TableHead className="text-right">Days Until Birthday</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {birthdays.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.name}</TableCell>
              <TableCell>
                {new Date(item.dateOfBirth).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>{item.phone}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={item.daysUntil === 0 ? "default" : "secondary"}
                  className={item.daysUntil === 0 ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" : ""}
                >
                  {item.daysUntil === 0
                    ? "🎂 TODAY!"
                    : item.daysUntil === 1
                    ? "1 day left (tomorrow)"
                    : `${item.daysUntil} days left`}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

