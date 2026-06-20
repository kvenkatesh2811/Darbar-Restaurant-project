import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  BarChart3, Users, MessageSquare, ShoppingCart, 
  Settings, LogOut, Search, ChefHat, Star,
  Clock,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  useGetStatsSummary,
  useListOrders,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  useListReviews,
  useListLeads,
  useListMenuItems,
  useListSpecials
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useGetStatsSummary();
  const { data: orders } = useListOrders();
  const { data: reviews } = useListReviews();
  const { data: leads } = useListLeads();
  const { data: menuItems } = useListMenuItems();
  
  const updateOrderStatus = useUpdateOrderStatus();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleStatusUpdate = (orderId: number, newStatus: any) => {
    updateOrderStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Status updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update status" });
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      preparing: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      ready: "bg-green-100 text-green-800 hover:bg-green-100",
      completed: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
    };
    return <Badge className={`${variants[status]} border-none`} variant="outline">{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30 pt-20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border p-6 flex flex-col hidden md:flex min-h-[calc(100vh-80px)] sticky top-20">
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold text-primary">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Darbar Restaurant</p>
        </div>
        
        <nav className="space-y-2 flex-1">
          <Button 
            variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
            className="w-full justify-start"
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button 
            variant={activeTab === "orders" ? "secondary" : "ghost"} 
            className="w-full justify-start"
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Orders
            {stats?.pendingOrders ? (
              <Badge className="ml-auto bg-primary">{stats.pendingOrders}</Badge>
            ) : null}
          </Button>
          <Button 
            variant={activeTab === "menu" ? "secondary" : "ghost"} 
            className="w-full justify-start"
            onClick={() => setActiveTab("menu")}
          >
            <ChefHat className="mr-2 h-4 w-4" /> Menu Management
          </Button>
          <Button 
            variant={activeTab === "leads" ? "secondary" : "ghost"} 
            className="w-full justify-start"
            onClick={() => setActiveTab("leads")}
          >
            <Users className="mr-2 h-4 w-4" /> Leads & Customers
          </Button>
          <Button 
            variant={activeTab === "reviews" ? "secondary" : "ghost"} 
            className="w-full justify-start"
            onClick={() => setActiveTab("reviews")}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Reviews
          </Button>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-border">
          <Link href="/">
            <Button variant="outline" className="w-full justify-start text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Return to Site
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-border bg-card p-4 overflow-x-auto scrollbar-hide">
        <div className="flex space-x-2">
          {["dashboard", "orders", "menu", "leads", "reviews"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize whitespace-nowrap"
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Dashboard Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.todayOrders || 0} today
                  </p>
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
                  <div className="text-2xl font-bold text-yellow-500">{stats?.averageRating?.toFixed(1) || "4.7"}</div>
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

            <Card className="mt-8">
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
                    {orders?.slice(0, 5).map((order) => (
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
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No orders found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold font-serif">Order Management</h1>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 pl-6">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium pl-6">#{order.id}</TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell className="text-sm">{order.phone}</TableCell>
                        <TableCell>{order.pickupTime}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={order.items.map(i => `${i.quantity}x ${i.menuItemName}`).join(", ")}>
                          {order.items.length} items
                        </TableCell>
                        <TableCell className="font-bold">₹{order.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {order.status === 'pending' && (
                              <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="bg-blue-600 hover:bg-blue-700">Confirm</Button>
                            )}
                            {order.status === 'confirmed' && (
                              <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'ready')} className="bg-green-600 hover:bg-green-700">Mark Ready</Button>
                            )}
                            {order.status === 'ready' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, 'completed')}>Complete</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!orders?.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          No orders found. Wait for customers to place orders.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "menu" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold font-serif">Menu Management</h1>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 pl-6">ID</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-6 text-muted-foreground">{item.id}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.isVeg ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>
                            {item.isVeg ? "VEG" : "NON-VEG"}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{item.price}</TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Available</Badge>
                          ) : (
                            <Badge variant="secondary">Out of Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!menuItems?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No menu items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

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
                    {leads?.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium pl-6">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell>{lead.dateOfBirth ? new Date(lead.dateOfBirth).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right pr-6 text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!leads?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No leads collected yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold font-serif mb-6">Reviews Management</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews?.map((review) => (
                <Card key={review.id} className="relative">
                  <div className="absolute top-4 right-4">
                    <Badge variant={review.isApproved ? "default" : "secondary"}>
                      {review.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{review.customerName}</CardTitle>
                    <div className="flex text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm italic">"{review.comment}"</p>
                    <p className="text-xs text-muted-foreground mt-4">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {!reviews?.length && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                  No reviews submitted yet.
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
