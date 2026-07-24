import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Parse .env manually
const envPath = "k:/VenkyData/Darbar-Restaurant/.env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
console.log("Connecting to PostgreSQL at:", dbUrl ? dbUrl.replace(/:[^:@]+@/, ":****@") : "MISSING");

let pg;
try {
  pg = require("pg");
} catch {
  pg = require("../lib/db/node_modules/pg");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: dbUrl });

const categoriesData = [
  { name: "Biryani Specials", slug: "biryani", display_order: 1 },
  { name: "Starters & Appetizers", slug: "starters", display_order: 2 },
  { name: "Main Course & Curries", slug: "main-course", display_order: 3 },
  { name: "Tandoori & Kebabs", slug: "tandoori-kebabs", display_order: 4 },
  { name: "Breads & Naan", slug: "breads", display_order: 5 },
  { name: "Desserts & Beverages", slug: "desserts-beverages", display_order: 6 },
];

const menuItemsData = [
  // Biryani Specials
  {
    name: "Chicken Dum Biryani",
    description: "Slow-cooked dum style aromatic biryani with whole spices and tender chicken.",
    price: 260.00,
    category_slug: "biryani",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop",
    rating: 4.8,
    prep_time_minutes: 25,
    is_bestseller: true,
  },
  {
    name: "Mutton Biryani",
    description: "Rich and flavourful mutton biryani cooked in traditional Rayalaseema spices.",
    price: 340.00,
    category_slug: "biryani",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop",
    rating: 4.9,
    prep_time_minutes: 30,
    is_bestseller: true,
  },
  {
    name: "Fry Piece Biryani",
    description: "Crispy fried chicken pieces layered with fragrant dum biryani rice.",
    price: 300.00,
    category_slug: "biryani",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop",
    rating: 4.7,
    prep_time_minutes: 25,
    is_bestseller: true,
  },
  {
    name: "Apollo Fish Biryani",
    description: "Flaky fish cooked with biryani masala and saffron basmati rice.",
    price: 320.00,
    category_slug: "biryani",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop",
    rating: 4.6,
    prep_time_minutes: 25,
    is_bestseller: true,
  },
  {
    name: "Royal Veg Dum Biryani",
    description: "Garden fresh vegetables, cottage cheese, and fragrant herbs in basmati rice.",
    price: 220.00,
    category_slug: "biryani",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1642821373181-696a54913e93?w=800&auto=format&fit=crop",
    rating: 4.5,
    prep_time_minutes: 20,
    is_bestseller: true,
  },

  // Starters
  {
    name: "Chicken 65",
    description: "Crispy deep-fried chicken tossed with curry leaves and green chillies.",
    price: 220.00,
    category_slug: "starters",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop",
    rating: 4.7,
    prep_time_minutes: 15,
    is_bestseller: true,
  },
  {
    name: "Gobi Manchurian Dry",
    description: "Crispy cauliflower florets tossed in a dark soy ginger garlic glaze.",
    price: 180.00,
    category_slug: "starters",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop",
    rating: 4.4,
    prep_time_minutes: 15,
    is_bestseller: false,
  },
  {
    name: "Apollo Fish Fry",
    description: "Boneless fish fillets marinated in spiced red chili garlic batter.",
    price: 320.00,
    category_slug: "starters",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop",
    rating: 4.6,
    prep_time_minutes: 20,
    is_bestseller: false,
  },

  // Main Course
  {
    name: "Rayalaseema Spicy Chicken Curry",
    description: "Authentic Kurnool style fiery chicken curry cooked with roasted coriander and black pepper.",
    price: 340.00,
    category_slug: "main-course",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop",
    rating: 4.9,
    prep_time_minutes: 25,
    is_bestseller: true,
  },
  {
    name: "Paneer Butter Masala",
    description: "Cubes of fresh paneer simmered in a silky tomato and cashew cream gravy.",
    price: 280.00,
    category_slug: "main-course",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop",
    rating: 4.7,
    prep_time_minutes: 20,
    is_bestseller: true,
  },
  {
    name: "Dal Tadka Special",
    description: "Yellow lentils tempered with ghee, cumin seeds, garlic, and dry red chilies.",
    price: 190.00,
    category_slug: "main-course",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop",
    rating: 4.3,
    prep_time_minutes: 15,
    is_bestseller: false,
  },

  // Tandoori & Kebabs
  {
    name: "Tandoori Chicken (Half)",
    description: "Chicken marinated in spiced yogurt, grilled in a traditional clay oven.",
    price: 310.00,
    category_slug: "tandoori-kebabs",
    is_veg: false,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&auto=format&fit=crop",
    rating: 4.8,
    prep_time_minutes: 25,
    is_bestseller: true,
  },
  {
    name: "Paneer Tikka Kebab",
    description: "Soft paneer cubes roasted with tandoori spices and served with mint chutney.",
    price: 260.00,
    category_slug: "tandoori-kebabs",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop",
    rating: 4.6,
    prep_time_minutes: 20,
    is_bestseller: false,
  },

  // Breads & Naan
  {
    name: "Butter Naan",
    description: "Soft leavened clay-oven flatbread brushed with pure melted butter.",
    price: 45.00,
    category_slug: "breads",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop",
    rating: 4.7,
    prep_time_minutes: 10,
    is_bestseller: true,
  },
  {
    name: "Garlic Naan",
    description: "Tandoori flatbread topped with chopped garlic and coriander.",
    price: 55.00,
    category_slug: "breads",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop",
    rating: 4.8,
    prep_time_minutes: 10,
    is_bestseller: false,
  },

  // Desserts & Beverages
  {
    name: "Gulab Jamun with Ice Cream",
    description: "Warm golden milk dumplings in cardamom syrup with vanilla ice cream.",
    price: 120.00,
    category_slug: "desserts-beverages",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=800&auto=format&fit=crop",
    rating: 4.9,
    prep_time_minutes: 10,
    is_bestseller: true,
  },
  {
    name: "Fresh Mango Lassi",
    description: "Chilled yogurt drink blended with Alphonso mango pulp and saffron.",
    price: 90.00,
    category_slug: "desserts-beverages",
    is_veg: true,
    is_available: true,
    image_url: "https://images.unsplash.com/photo-1571006682858-a45722271c46?w=800&auto=format&fit=crop",
    rating: 4.8,
    prep_time_minutes: 5,
    is_bestseller: false,
  },
];

const specialsData = [
  {
    dish_name: "Chicken Dum Biryani",
    description: "Our signature slow-cooked Rayalaseema-style dum biryani, bursting with aromatic whole spices and tender chicken. Chef's most recommended dish.",
    price: 260.00,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop",
    is_active: true,
  },
];

const reviewsData = [
  {
    customer_name: "Ramesh Reddy",
    rating: 5,
    comment: "The Mutton Biryani at Darbar is unbeatable in Kurnool! Pure authentic Rayalaseema spices and juicy meat.",
    is_approved: true,
  },
  {
    customer_name: "Sneha Sharma",
    rating: 5,
    comment: "Amazing family dining experience! Paneer Butter Masala and Garlic Naan were soft, fresh, and super delicious.",
    is_approved: true,
  },
  {
    customer_name: "Vikram Teja",
    rating: 5,
    comment: "Fast delivery, hot food, and generous portions. Chicken 65 and Dum Biryani are absolute must-tries!",
    is_approved: true,
  },
];

async function seed() {
  try {
    console.log("--- Clearing existing data ---");
    await pool.query("DELETE FROM reviews;");
    await pool.query("DELETE FROM specials;");
    await pool.query("DELETE FROM menu_items;");
    await pool.query("DELETE FROM categories;");

    console.log("--- Seeding Categories ---");
    for (const cat of categoriesData) {
      await pool.query(
        "INSERT INTO categories (name, slug, display_order) VALUES ($1, $2, $3);",
        [cat.name, cat.slug, cat.display_order]
      );
    }
    console.log(`Inserted ${categoriesData.length} categories.`);

    console.log("--- Seeding Menu Items ---");
    for (const item of menuItemsData) {
      await pool.query(
        `INSERT INTO menu_items 
        (name, description, price, category_slug, is_veg, is_available, image_url, rating, prep_time_minutes, is_bestseller) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [
          item.name,
          item.description,
          item.price,
          item.category_slug,
          item.is_veg,
          item.is_available,
          item.image_url,
          item.rating,
          item.prep_time_minutes,
          item.is_bestseller,
        ]
      );
    }
    console.log(`Inserted ${menuItemsData.length} menu items.`);

    console.log("--- Seeding Specials ---");
    for (const spec of specialsData) {
      await pool.query(
        `INSERT INTO specials (dish_name, description, price, image_url, is_active) 
        VALUES ($1, $2, $3, $4, $5);`,
        [spec.dish_name, spec.description, spec.price, spec.image_url, spec.is_active]
      );
    }
    console.log(`Inserted ${specialsData.length} specials.`);

    console.log("--- Seeding Approved Reviews ---");
    for (const rev of reviewsData) {
      await pool.query(
        `INSERT INTO reviews (customer_name, rating, comment, is_approved) 
        VALUES ($1, $2, $3, $4);`,
        [rev.customer_name, rev.rating, rev.comment, rev.is_approved]
      );
    }
    console.log(`Inserted ${reviewsData.length} reviews.`);

    console.log("\n✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ SEEDING FAILED:", err);
  } finally {
    await pool.end();
  }
}

seed();
