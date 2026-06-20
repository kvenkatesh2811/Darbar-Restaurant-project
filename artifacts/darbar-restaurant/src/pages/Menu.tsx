import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Download, Printer, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import QRCode from "qrcode";
import { useListMenuItems, useListCategories } from "@workspace/api-client-react";
import { HARDCODED_MENU } from "@/lib/constants";

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const { data: apiMenuItems } = useListMenuItems();
  const { data: categories } = useListCategories();

  // Merge hardcoded menu with API menu items if available, avoiding duplicates by name
  const allItems = [...HARDCODED_MENU];
  if (apiMenuItems) {
    apiMenuItems.forEach(apiItem => {
      if (!allItems.some(item => item.name.toLowerCase() === apiItem.name.toLowerCase())) {
        allItems.push(apiItem as any);
      }
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Generate QR Code for the menu page
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(window.location.href, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1F2937', // Dark Gray
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    generateQR();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Derive categories from items
  const uniqueCategories = Array.from(new Set(allItems.map(item => item.categoryName)));

  // Filter items
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVeg = isVegOnly ? item.isVeg === true : true;
    return matchesSearch && matchesVeg;
  });

  return (
    <div className="flex flex-col w-full min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-border pb-8">
          <div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">Our Menu</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Discover authentic Rayalaseema spices and our chef's special multi-cuisine delights.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/order">
              <Button size="lg" className="rounded-full px-8 shadow-md">
                Order Online
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar / Filters */}
          <div className="w-full lg:w-1/4 space-y-8">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-lg mb-4">Filters</h3>
              
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search dishes..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-menu-search"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="veg-mode" 
                    checked={isVegOnly}
                    onCheckedChange={setIsVegOnly}
                    data-testid="switch-veg-only"
                  />
                  <Label htmlFor="veg-mode" className="flex items-center gap-2 cursor-pointer">
                    <div className="w-4 h-4 rounded-sm flex items-center justify-center border border-green-600 bg-green-50">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    Pure Veg Only
                  </Label>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="mt-8 pt-8 border-t border-border text-center">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Scan Menu</h4>
                {qrCodeDataUrl && (
                  <div className="bg-white p-2 rounded-lg inline-block shadow-sm border border-border mb-4">
                    <img src={qrCodeDataUrl} alt="Menu QR Code" className="w-32 h-32" />
                  </div>
                )}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="w-full" data-testid="button-print-menu">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" asChild className="w-full" data-testid="button-download-menu">
                    <a href={qrCodeDataUrl} download="darbar-menu-qr.png">
                      <Download className="mr-2 h-4 w-4" />
                      QR Code
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="w-full lg:w-3/4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-24 bg-muted/30 rounded-xl border border-border border-dashed">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-serif text-2xl font-bold mb-2">No items found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                <Button variant="link" onClick={() => { setSearchQuery(""); setIsVegOnly(false); }} className="mt-4">
                  Clear all filters
                </Button>
              </div>
            ) : (
              <Tabs defaultValue={uniqueCategories[0]} className="w-full">
                <div className="overflow-x-auto pb-4 mb-4 scrollbar-hide">
                  <TabsList className="w-max inline-flex h-12 items-center justify-start rounded-full bg-muted p-1 text-muted-foreground">
                    {uniqueCategories.map(category => (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {uniqueCategories.map(category => {
                  const categoryItems = filteredItems.filter(item => item.categoryName === category);
                  
                  if (categoryItems.length === 0) return null;

                  return (
                    <TabsContent key={category} value={category} className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="font-serif text-3xl font-bold mb-6 pt-4 text-primary">{category}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {categoryItems.map((item, index) => (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            key={`${item.name}-${index}`}
                          >
                            <Card className="h-full overflow-hidden hover:border-primary/30 transition-colors bg-card">
                              <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className={`shrink-0 w-4 h-4 rounded-sm flex items-center justify-center border ${item.isVeg ? "border-green-600" : "border-red-600"}`} title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}>
                                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                                      </div>
                                      <h3 className="font-serif text-lg font-bold leading-tight">{item.name}</h3>
                                    </div>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                                    )}
                                  </div>
                                  <div className="font-serif text-xl font-bold text-primary shrink-0">
                                    ₹{item.price}
                                  </div>
                                </div>
                                
                                <div className="mt-auto pt-4 flex justify-end">
                                  <Link href="/order">
                                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                                      Order
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
