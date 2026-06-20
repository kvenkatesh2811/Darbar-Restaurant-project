export const RESTAURANT_DETAILS = {
  name: "Darbar Multi-Cuisine Restaurant",
  tagline: "Authentic Rayalaseema Flavours & Multi-Cuisine Delights",
  address: "40/304, Bhagya Nagar, River View Colony, Kurnool, Andhra Pradesh – 518004",
  rating: 4.7,
  hours: {
    lunch: "11:00 AM – 3:00 PM",
    dinner: "7:00 PM – 10:30 PM",
  },
  phone: "+91 98765 43210",
  whatsappNumber: "919876543210",
  whatsappMessage: "Hello Darbar Multi-Cuisine Restaurant, I would like to place an order.",
  mapUrl: "https://maps.google.com/maps?q=Darbar+Multi-Cuisine+Restaurant+Kurnool&t=&z=15&ie=UTF8&iwloc=&output=embed"
};

export const HARDCODED_MENU = [
  // Biryani Specials
  { name: "Chicken Dum Biryani", price: 260, categorySlug: "biryani-specials", categoryName: "Biryani Specials", isVeg: false, isAvailable: true },
  { name: "Mutton Biryani", price: 340, categorySlug: "biryani-specials", categoryName: "Biryani Specials", isVeg: false, isAvailable: true },
  { name: "Fry Piece Biryani", price: 300, categorySlug: "biryani-specials", categoryName: "Biryani Specials", isVeg: false, isAvailable: true },
  { name: "Apollo Fish Biryani", price: 320, categorySlug: "biryani-specials", categoryName: "Biryani Specials", isVeg: false, isAvailable: true },
  // Starters
  { name: "Chicken 65", price: 220, categorySlug: "starters", categoryName: "Starters", isVeg: false, isAvailable: true },
  { name: "Apollo Fish", price: 260, categorySlug: "starters", categoryName: "Starters", isVeg: false, isAvailable: true },
  { name: "Chicken Lollipop", price: 240, categorySlug: "starters", categoryName: "Starters", isVeg: false, isAvailable: true },
  { name: "Chilli Chicken", price: 230, categorySlug: "starters", categoryName: "Starters", isVeg: false, isAvailable: true },
  { name: "Paneer 65", price: 200, categorySlug: "starters", categoryName: "Starters", isVeg: true, isAvailable: true },
  // Veg Specials
  { name: "Paneer Manchurian", price: 210, categorySlug: "veg-specials", categoryName: "Veg Specials", isVeg: true, isAvailable: true },
  { name: "Mushroom Fry", price: 220, categorySlug: "veg-specials", categoryName: "Veg Specials", isVeg: true, isAvailable: true },
  { name: "Veg Fried Rice", price: 180, categorySlug: "veg-specials", categoryName: "Veg Specials", isVeg: true, isAvailable: true },
  { name: "Gobi 65", price: 180, categorySlug: "veg-specials", categoryName: "Veg Specials", isVeg: true, isAvailable: true },
  // Chinese
  { name: "Chicken Fried Rice", price: 210, categorySlug: "chinese", categoryName: "Chinese", isVeg: false, isAvailable: true },
  { name: "Egg Fried Rice", price: 190, categorySlug: "chinese", categoryName: "Chinese", isVeg: false, isAvailable: true },
  { name: "Chicken Noodles", price: 220, categorySlug: "chinese", categoryName: "Chinese", isVeg: false, isAvailable: true },
  // Desserts & Beverages
  { name: "Fresh Lime Soda", price: 70, categorySlug: "desserts-beverages", categoryName: "Desserts & Beverages", isVeg: true, isAvailable: true },
  { name: "Oreo Shake", price: 120, categorySlug: "desserts-beverages", categoryName: "Desserts & Beverages", isVeg: true, isAvailable: true },
  { name: "Brownie with Ice Cream", price: 160, categorySlug: "desserts-beverages", categoryName: "Desserts & Beverages", isVeg: true, isAvailable: true },
];
