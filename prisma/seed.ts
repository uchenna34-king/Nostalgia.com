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
  materials?: string;
  care?: string;
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
    materials: "100% double-faced wool with a horn-button placket.",
    care: "Dry clean only. Store on a broad-shouldered hanger.",
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
    materials: "Weathered 100% cotton shell with ribbed-knit trims.",
    care: "Machine wash cold, inside out. Hang to dry.",
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
    materials: "100% hand-framed lambswool.",
    care: "Hand wash cold. Dry flat, away from direct heat.",
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
    materials: "Heavyweight 100% garment-dyed cotton, 260gsm.",
    care: "Machine wash cold with like colors. Tumble dry low.",
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
    materials: "Heavyweight loopback cotton fleece, brushed interior.",
    care: "Machine wash cold, inside out. Do not bleach.",
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
    materials: "Vegetable-tanned full-grain leather.",
    care: "Wipe clean with a dry cloth. Condition leather occasionally.",
  },
];

const collections: {
  slug: string;
  name: string;
  description: string;
  productSlugs: string[];
}[] = [
  {
    slug: "autumn-archive",
    name: "Autumn Archive",
    description:
      "Wool, mohair, and cable-knit pulled from the archive for the season's turn.",
    productSlugs: [
      "sepia-wool-overcoat",
      "archive-bomber-jacket",
      "heritage-cable-knit",
      "faded-mohair-cardigan",
    ],
  },
  {
    slug: "essentials",
    name: "Essentials",
    description:
      "The everyday foundation — tees, hoodies, and accessories built to live in.",
    productSlugs: [
      "vintage-box-tee",
      "grain-logo-tee",
      "nostalgia-hoodie",
      "corduroy-cap",
      "leather-tote",
    ],
  },
];

async function main() {
  // FK-safe truncation order: order -> productImage -> collection -> product
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.collection.deleteMany();
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
        materials: p.materials,
        care: p.care,
        featured: p.featured ?? false,
        images: {
          create: [
            { url: `/products/${p.slug}-1.svg`, position: 0 },
            { url: `/products/${p.slug}-2.svg`, position: 1 },
          ],
        },
      },
    });
  }

  for (const c of collections) {
    await prisma.collection.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        products: {
          connect: c.productSlugs.map((slug) => ({ slug })),
        },
      },
    });
  }

  console.log(
    `Seeded ${products.length} products, ${products.length * 2} images, ${collections.length} collections.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
