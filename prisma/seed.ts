import { PrismaClient } from "@prisma/client";
import { parseOrderItems, type OrderItem } from "../lib/orders";

const prisma = new PrismaClient();

// Default per-size stock for any size not given an explicit count below.
const DEFAULT_STOCK = 8;

type Seed = {
  slug: string;
  name: string;
  price: number; // cents
  category: string; // a lib/taxonomy.ts category label
  department?: "women" | "men" | "unisex"; // defaults to unisex
  subcategory?: string; // a section slug within the category
  description: string;
  sizes: string[];
  featured?: boolean;
  materials?: string;
  care?: string;
  stock?: Record<string, number>; // per-size stock override; sizes omitted default to DEFAULT_STOCK
};

// Resolve a product's per-size stock rows (explicit override or DEFAULT_STOCK), position-ordered by its sizes list.
function resolveVariants(p: Seed): { size: string; stock: number; position: number }[] {
  return p.sizes.map((size, position) => ({
    size,
    position,
    stock: p.stock?.[size] ?? DEFAULT_STOCK,
  }));
}

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
    stock: { S: 0 }, // fixture: one sold-out size (partial), rest default in stock
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
    category: "Shirts & T-shirts",
    subcategory: "t-shirts",
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
    category: "Shirts & T-shirts",
    subcategory: "t-shirts",
    description:
      "Ink-black tee with a grain-textured Nostalgia serif logo. Screen-printed by hand.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    slug: "nostalgia-hoodie",
    name: "Nostalgia Hoodie",
    price: 13000,
    category: "Sweatshirts",
    subcategory: "graphic",
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
    category: "Trousers",
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
    stock: { "One Size": 0 }, // fixture: entirely sold out -> hidden from listings
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

  // --- Shoes ---------------------------------------------------------------
  {
    slug: "tempo-road-runner",
    name: "Tempo Road Runner",
    price: 18000,
    category: "Shoes",
    department: "men",
    subcategory: "running",
    description:
      "A neutral daily trainer with a responsive foam midsole and an engineered-mesh upper that breathes over long miles.",
    sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    featured: true,
    materials: "Engineered mesh upper, EVA-blend midsole, carbon rubber outsole.",
    care: "Wipe clean. Air dry away from direct heat; never machine wash.",
  },
  {
    slug: "stride-mesh-trainer",
    name: "Stride Mesh Trainer",
    price: 16500,
    category: "Shoes",
    department: "women",
    subcategory: "running",
    description:
      "Lightweight tempo shoe with a rocker sole and a sock-fit collar. Quick underfoot, cushioned where it counts.",
    sizes: ["UK 5", "UK 6", "UK 7", "UK 8"],
  },
  {
    slug: "archive-oxford",
    name: "Archive Oxford",
    price: 32000,
    category: "Shoes",
    department: "men",
    subcategory: "corporate",
    description:
      "Closed-lace oxford in polished calf on a Goodyear-welted leather sole. The shoe the suit was cut for.",
    sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    materials: "Full-grain calf upper, leather lining, Goodyear-welted leather sole.",
    care: "Polish regularly. Rest a day between wears; store with cedar trees.",
  },
  {
    slug: "city-penny-loafer",
    name: "City Penny Loafer",
    price: 28000,
    category: "Shoes",
    department: "women",
    subcategory: "corporate",
    description:
      "A hand-sewn penny loafer in burnished brown with a stacked heel. Office in the week, everywhere at the weekend.",
    sizes: ["UK 5", "UK 6", "UK 7", "UK 8"],
  },
  {
    slug: "washed-canvas-low",
    name: "Washed Canvas Low",
    price: 9500,
    category: "Shoes",
    subcategory: "canvas",
    description:
      "Vulcanised low-top in stone-washed canvas with a gum sole. Softens and fades like a favourite pair of jeans.",
    sizes: ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
  },

  // --- Sweatshirts ---------------------------------------------------------
  {
    slug: "loopback-crewneck",
    name: "Loopback Crewneck",
    price: 12000,
    category: "Sweatshirts",
    subcategory: "plain",
    description:
      "Heavyweight loopback crew with a raglan sleeve and ribbed side panels. No branding, nothing to date it.",
    sizes: ["XS", "S", "M", "L", "XL"],
    materials: "Heavyweight 100% loopback cotton, 440gsm.",
    care: "Machine wash cold, inside out. Dry flat.",
  },
  {
    slug: "brushed-fleece-hoodie",
    name: "Brushed Fleece Hoodie",
    price: 13000,
    category: "Sweatshirts",
    department: "women",
    subcategory: "plain",
    description:
      "A cropped, double-lined hood on brushed fleece. Clean front, kangaroo pocket, dropped shoulder.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    slug: "varsity-graphic-crew",
    name: "Varsity Graphic Crew",
    price: 14000,
    category: "Sweatshirts",
    department: "men",
    subcategory: "graphic",
    description:
      "Collegiate crewneck with a cracked flock-print crest across the chest, garment-washed for a worn-in hand.",
    sizes: ["S", "M", "L", "XL"],
  },

  // --- Jeans ---------------------------------------------------------------
  {
    slug: "selvedge-straight-jean",
    name: "Selvedge Straight Jean",
    price: 21000,
    category: "Jeans",
    department: "men",
    subcategory: "denim",
    description:
      "Raw Japanese selvedge in a straight, mid-rise cut. Fades to your life; the first soak is the only rule.",
    sizes: ["28", "30", "32", "34", "36"],
    featured: true,
    materials: "14oz raw selvedge denim, copper rivets, button fly.",
    care: "Wear hard, wash rarely. Cold soak inside out; hang dry.",
  },
  {
    slug: "high-rise-wide-jean",
    name: "High-Rise Wide Jean",
    price: 19000,
    category: "Jeans",
    department: "women",
    subcategory: "denim",
    description:
      "High waist, wide leg, full length in a mid-blue rinse. Rigid cotton that moulds to you within a week.",
    sizes: ["28", "30", "32"],
  },
  {
    slug: "cord-five-pocket",
    name: "Cord Five-Pocket",
    price: 17000,
    category: "Jeans",
    department: "men",
    subcategory: "non-denim",
    description:
      "An eight-wale corduroy cut on our straight jean block, in tobacco. The jean for the days denim feels too loud.",
    sizes: ["30", "32", "34", "36"],
  },
  {
    slug: "twill-carpenter-jean",
    name: "Twill Carpenter Jean",
    price: 16000,
    category: "Jeans",
    department: "women",
    subcategory: "non-denim",
    description:
      "Relaxed carpenter jean in ecru cotton twill with a hammer loop and utility pocket.",
    sizes: ["28", "30", "32"],
  },

  // --- Shirts & T-shirts ---------------------------------------------------
  {
    slug: "oxford-button-down",
    name: "Oxford Button-Down",
    price: 15000,
    category: "Shirts & T-shirts",
    department: "men",
    subcategory: "shirts",
    description:
      "An unlined oxford-cloth button-down with a soft roll to the collar. Better for every wash.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "poplin-tunic-shirt",
    name: "Poplin Tunic Shirt",
    price: 14000,
    category: "Shirts & T-shirts",
    department: "women",
    subcategory: "shirts",
    description:
      "Crisp cotton poplin with a band collar and a long, split-hem body. Wears tucked, open or belted.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    slug: "atelier-crest-tee",
    name: "Atelier Crest Tee",
    price: 22000,
    category: "Shirts & T-shirts",
    department: "men",
    subcategory: "designer-t-shirts",
    description:
      "A designer-label tee in dense jersey with a tonal embroidered crest. Authenticated, with original tags.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "monogram-jersey-tee",
    name: "Monogram Jersey Tee",
    price: 24000,
    category: "Shirts & T-shirts",
    department: "women",
    subcategory: "designer-t-shirts",
    description:
      "Fitted designer tee with a jacquard monogram knitted through the jersey. Authenticated, with original tags.",
    sizes: ["XS", "S", "M", "L"],
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

// Verified-purchase review fixtures (D-01, D-03). Each reviewer is a real user
// who "purchased" the products they review; an Order snapshot backs every review
// so the seed invariant below can prove the verified-purchase trust signal.
// friend@nostalgia.test matches the demo-login default so a manual login lands
// on an existing verified purchaser.
type ReviewFixture = {
  slug: string;
  size: string;
  rating: number; // 1-5
  title: string;
  body?: string; // optional per D-03 — at least one omitted to exercise the null path
};
const reviewers: { email: string; name: string; status: string; reviews: ReviewFixture[] }[] = [
  {
    email: "friend@nostalgia.test",
    name: "Nostalgia Friend",
    status: "fulfilled",
    reviews: [
      {
        slug: "sepia-wool-overcoat",
        size: "M",
        rating: 5,
        title: "Wears like an heirloom",
        body: "The sepia deepens with every wear and the shoulders sit exactly right. Worth every cent.",
      },
      {
        slug: "nostalgia-hoodie",
        size: "L",
        rating: 4,
        title: "My weekend uniform",
        body: "Brushed interior is unreal. Only wish the cocoa ran a touch darker.",
      },
    ],
  },
  {
    email: "mara@nostalgia.test",
    name: "Mara Quinn",
    status: "paid",
    reviews: [
      // Body intentionally omitted — exercises the optional-body path.
      { slug: "sepia-wool-overcoat", size: "S", rating: 4, title: "Archive silhouette, done right" },
    ],
  },
  {
    email: "theo@nostalgia.test",
    name: "Theo Vance",
    status: "paid",
    reviews: [
      {
        slug: "vintage-box-tee",
        size: "M",
        rating: 5,
        title: "The only tee I reach for",
        body: "Heavyweight and boxy without swallowing me. Already bought two more.",
      },
    ],
  },
];

async function main() {
  // FK-safe truncation order: review -> order -> productImage -> productSizeStock -> collection -> product
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productSizeStock.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.product.deleteMany();

  let sizeStockRows = 0;
  for (const p of products) {
    const variants = resolveVariants(p);
    sizeStockRows += variants.length;
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        price: p.price,
        category: p.category,
        department: p.department ?? "unisex",
        subcategory: p.subcategory ?? null,
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
        variants: {
          create: variants,
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

  // ---- Verified-purchase reviews (TRST-01) ----
  // Map slug -> created product so orders/reviews reference real ids and copy real names/prices.
  const productRows = await prisma.product.findMany({
    select: { id: true, slug: true, name: true, price: true },
  });
  const bySlug = new Map(productRows.map((p) => [p.slug, p]));

  let reviewerCount = 0;
  let orderCount = 0;
  let reviewCount = 0;
  for (const r of reviewers) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.name },
      create: { email: r.email, name: r.name },
    });
    reviewerCount++;

    // One paid/fulfilled order snapshotting every product this reviewer reviews,
    // so each review is a genuine verified purchase (slug present in the order items).
    const items: OrderItem[] = r.reviews.map((rev) => {
      const p = bySlug.get(rev.slug);
      if (!p) throw new Error(`Seed error: review references unknown product slug "${rev.slug}".`);
      return { slug: p.slug, name: p.name, size: rev.size, unitPrice: p.price, qty: 1 };
    });
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    await prisma.order.create({
      data: {
        userId: user.id,
        email: r.email,
        items: JSON.stringify(items),
        total,
        status: r.status,
      },
    });
    orderCount++;

    for (const rev of r.reviews) {
      const p = bySlug.get(rev.slug)!;
      await prisma.review.create({
        data: {
          productId: p.id,
          userId: user.id,
          rating: rev.rating,
          title: rev.title,
          body: rev.body,
        },
      });
      reviewCount++;
    }
  }

  // Verified-purchase invariant: every seeded review must be backed by a paid/fulfilled
  // order for the same user whose items snapshot contains the reviewed product's slug.
  // `npm run seed` exiting 0 is therefore proof no fabricated "verified purchase" exists.
  const seededReviews = await prisma.review.findMany({
    select: { userId: true, product: { select: { slug: true } } },
  });
  const paidOrders = await prisma.order.findMany({
    where: { status: { in: ["paid", "fulfilled"] } },
    select: { userId: true, items: true },
  });
  for (const rev of seededReviews) {
    const backed = paidOrders.some(
      (o) =>
        o.userId === rev.userId &&
        parseOrderItems(o.items).some((it) => it.slug === rev.product.slug),
    );
    if (!backed) {
      throw new Error(
        `Seed invariant failed: review of "${rev.product.slug}" is not backed by a paid/fulfilled order for its user.`,
      );
    }
  }
  if (reviewCount < 4) {
    throw new Error(`Seed invariant failed: expected at least 4 reviews, got ${reviewCount}.`);
  }
  const perProduct = new Map<string, number>();
  for (const rev of seededReviews) {
    perProduct.set(rev.product.slug, (perProduct.get(rev.product.slug) ?? 0) + 1);
  }
  if (![...perProduct.values()].some((n) => n >= 2)) {
    throw new Error("Seed invariant failed: expected at least one product with 2+ reviews.");
  }

  // Invariant assertions: guarantee the downstream stock-aware fixtures exist, so `npm run seed`
  // exiting 0 is itself proof that (a) a fully sold-out product and (b) a partial sold-out size were created.
  const fullySoldOut = products.some((p) => {
    const v = resolveVariants(p);
    return v.length > 0 && v.every((row) => row.stock === 0);
  });
  const partialSoldOut = products.some((p) => {
    const v = resolveVariants(p);
    return v.some((row) => row.stock === 0) && v.some((row) => row.stock > 0);
  });
  if (!fullySoldOut) {
    throw new Error("Seed invariant failed: expected at least one fully sold-out product (all sizes 0).");
  }
  if (!partialSoldOut) {
    throw new Error("Seed invariant failed: expected at least one product with a partial sold-out size.");
  }

  console.log(
    `Seeded ${products.length} products, ${products.length * 2} images, ${sizeStockRows} size-stock rows, ${collections.length} collections, ${reviewerCount} reviewers, ${orderCount} purchase orders, ${reviewCount} verified-purchase reviews.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
