import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  slug: string;
  name: string;
  price: number; // cents
  category: string;
  description: string;
  sizes: string[];
  featured?: boolean;
};

const products: Seed[] = [
  {
    slug: "sepia-wool-overcoat",
    name: "Sepia Wool Overcoat",
    price: 34000,
    category: "Outerwear",
    description:
      "A double-faced wool overcoat in warm sepia. Tailored drop shoulders, horn buttons, and a relaxed archive silhouette that ages beautifully.",
    sizes: ["S", "M", "L", "XL"],
    featured: true,
  },
  {
    slug: "archive-bomber-jacket",
    name: "Archive Bomber Jacket",
    price: 26000,
    category: "Outerwear",
    description:
      "Boxy bomber in weathered cotton with ribbed trims and a hidden placket. Built from a 1970s pattern, cut for today.",
    sizes: ["S", "M", "L", "XL"],
    featured: true,
  },
  {
    slug: "heritage-cable-knit",
    name: "Heritage Cable Knit",
    price: 18000,
    category: "Knitwear",
    description:
      "Hand-framed lambswool cable knit with a rolled collar. Dense, warm, and quietly luxurious.",
    sizes: ["S", "M", "L"],
    featured: true,
  },
  {
    slug: "faded-mohair-cardigan",
    name: "Faded Mohair Cardigan",
    price: 21000,
    category: "Knitwear",
    description:
      "Brushed mohair cardigan in a faded rose tone. Slouchy fit, tonal buttons, a haze you can wear.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "vintage-box-tee",
    name: "Vintage Box Tee",
    price: 6000,
    category: "Tees",
    description:
      "Heavyweight box-cut tee, garment-dyed to a lived-in sand. The everyday foundation of the house.",
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: true,
  },
  {
    slug: "grain-logo-tee",
    name: "Grain Logo Tee",
    price: 6500,
    category: "Tees",
    description:
      "Ink-black tee with a grain-textured Nostalgia serif logo. Screen-printed by hand.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    slug: "nostalgia-hoodie",
    name: "Nostalgia Hoodie",
    price: 13000,
    category: "Tees",
    description:
      "Heavyweight loopback hoodie in cocoa. Oversized hood, embroidered wordmark, brushed interior.",
    sizes: ["S", "M", "L", "XL"],
    featured: true,
  },
  {
    slug: "pleated-trouser",
    name: "Pleated Trouser",
    price: 15000,
    category: "Bottoms",
    description:
      "Single-pleat wool-blend trouser with a tapered leg. Sits high, drapes clean, dresses either way.",
    sizes: ["28", "30", "32", "34", "36"],
  },
  {
    slug: "corduroy-cap",
    name: "Corduroy Cap",
    price: 4500,
    category: "Accessories",
    description:
      "Six-panel corduroy cap in burnt sepia with an embroidered eyelet vent and adjustable strap.",
    sizes: ["One Size"],
  },
  {
    slug: "leather-tote",
    name: "Leather Tote",
    price: 19000,
    category: "Accessories",
    description:
      "Vegetable-tanned leather tote that patinas with use. Roomy, unlined, made to outlast trends.",
    sizes: ["One Size"],
    featured: true,
  },
];

async function main() {
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description,
        sizes: JSON.stringify(p.sizes),
        images: JSON.stringify([
          `/products/${p.slug}-1.svg`,
          `/products/${p.slug}-2.svg`,
        ]),
        featured: p.featured ?? false,
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
