import { Product } from "../models/Product.model.js";

const CATEGORY_TEMPLATES = {
  Apparel: [
    { name: "Recycled Denim Jacket", tags: ["recycled", "denim", "upcycled"], ecoScore: 84, price: 69.0 },
    { name: "Hemp Blend Hoodie", tags: ["hemp", "casual", "low-impact"], ecoScore: 86, price: 54.5 },
    { name: "Linen Summer Shirt", tags: ["linen", "breathable", "natural"], ecoScore: 82, price: 39.0 },
  ],
  Home: [
    { name: "Compostable Kitchen Sponge Pack", tags: ["compostable", "kitchen", "plastic-free"], ecoScore: 91, price: 12.0 },
    { name: "Refillable Glass Cleaner Kit", tags: ["refill", "glass", "zero-waste"], ecoScore: 89, price: 16.5 },
    { name: "Bamboo Cutlery Set", tags: ["bamboo", "reusable", "travel"], ecoScore: 90, price: 14.99 },
  ],
  Electronics: [
    { name: "Energy Efficient LED Desk Lamp", tags: ["led", "energy-star", "home-office"], ecoScore: 80, price: 31.0 },
    { name: "Solar Power Bank", tags: ["solar", "portable", "charging"], ecoScore: 83, price: 47.5 },
    { name: "Refurbished Bluetooth Speaker", tags: ["refurbished", "audio", "warranty"], ecoScore: 76, price: 59.0 },
  ],
  Beauty: [
    { name: "Plastic-Free Shampoo Bar", tags: ["shampoo", "bar", "plastic-free"], ecoScore: 93, price: 10.5 },
    { name: "Refillable Deodorant Stick", tags: ["refillable", "deodorant", "low-waste"], ecoScore: 88, price: 13.0 },
  ],
};

const DEFAULT_IMAGES_BY_CATEGORY = {
  Apparel: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618354691551-44de113f0164?w=800&auto=format&fit=crop",
  ],
  Home: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop",
  ],
  Electronics: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop",
  ],
  Beauty: [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&auto=format&fit=crop",
  ],
  default: ["https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop"],
};

function pickImage(category, idx = 0) {
  const arr = DEFAULT_IMAGES_BY_CATEGORY[category] || DEFAULT_IMAGES_BY_CATEGORY.default;
  return arr[idx % arr.length];
}

/**
 * Grow catalog with synthetic-but-realistic products based on behavior intent.
 * This keeps demo projects from being stuck with 2-3 items.
 */
export async function expandCatalogFromSignals({ preferredCategories = [], preferredTags = [] }) {
  const categories = preferredCategories.length ? preferredCategories : ["Apparel", "Home", "Electronics"];
  const added = [];

  for (const category of categories) {
    const existingCount = await Product.countDocuments({ category, isActive: true });
    if (existingCount >= 8) continue;

    const templates = CATEGORY_TEMPLATES[category] || [];
    for (const t of templates) {
      const exists = await Product.findOne({ name: t.name }).lean();
      if (exists) continue;
      const tags = Array.from(new Set([...(t.tags || []), ...preferredTags.slice(0, 2)]));
      const created = await Product.create({
        name: t.name,
        category,
        tags,
        price: t.price,
        ecoScore: t.ecoScore,
        carbonKgPerUnit: Number((Math.random() * 10 + 0.5).toFixed(2)),
        stock: Math.floor(Math.random() * 120) + 20,
        description: `${t.name} recommended from your recent interests in ${category}.`,
        imageUrl: pickImage(category, added.length),
      });
      added.push(created);
      if (added.length >= 6) return added;
    }
  }

  return added;
}

