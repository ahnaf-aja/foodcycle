/**
 * FoodCycle seed data.
 *
 * Realistic Indonesian marketplace data — fictional businesses, real-sounding
 * menus, prices in Rupiah. No "Lorem ipsum", no "Restaurant 1".
 *
 * Stock model: each food declares the stock it had BEFORE any seeded order.
 * Orders then decrement it, so the final `stock` in the database is internally
 * consistent with the order history rather than an invented number.
 */

import {
  PrismaClient,
  UserRole,
  Grade,
  FoodStatus,
  OrderStatus,
  OrderPurpose,
  FulfillmentType,
  DonationStatus,
  InstitutionType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";

/**
 * Demo clock.
 *
 * The seeded listings use relative deadlines ("pickup in 2 hours") so the
 * marketplace always looks live and the "ending soon" sort has something real
 * to sort. The cost is that the demo rots on its own: seed it in the evening
 * and by the next morning `expireStaleListings` has correctly expired every
 * listing, leaving an empty marketplace — accurate behaviour, but useless in
 * front of an audience.
 *
 * So every future deadline is pushed out by `DEMO_HORIZON_DAYS`. The spacing
 * between listings is left untouched (1h still ends before 8h) — only the whole
 * window moves, which keeps a seeded demo presentable for weeks. Deadlines that
 * are deliberately in the past (the EXPIRED sample listing) keep their offset,
 * so that case is still demonstrated.
 */
const DEMO_HORIZON_DAYS = 45;
const DEMO_HORIZON_HOURS = DEMO_HORIZON_DAYS * 24;

const hoursFromNow = (h: number) =>
  new Date(Date.now() + (h > 0 ? h + DEMO_HORIZON_HOURS : h) * 3_600_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

/** Order numbers must look like the ones the app generates: FC-XXXXXX. */
let orderCounter = 0;
function seedOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  orderCounter += 1;
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[(orderCounter * 7 + i * 11) % alphabet.length];
  }
  return `FC-${code}`;
}

async function main() {
  console.log("Clearing existing data…");
  // Order matters: children before parents.
  await prisma.impactRecord.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.savedRestaurant.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.socialInstitution.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // =========================================================================
  // Users
  // =========================================================================
  console.log("Creating users…");

  const admin = await prisma.user.create({
    data: {
      name: "Dimas Prakoso",
      email: "admin@foodcycle.demo",
      passwordHash,
      role: UserRole.ADMIN,
      phone: "+62 811 2000 100",
    },
  });

  const customerSeeds = [
    { name: "Andi Pratama", email: "customer@foodcycle.demo", phone: "+62 812 3456 7890" },
    { name: "Siti Rahmawati", email: "siti.rahmawati@foodcycle.demo", phone: "+62 813 2233 4455" },
    { name: "Budi Santoso", email: "budi.santoso@foodcycle.demo", phone: "+62 815 7788 9900" },
    { name: "Maya Anggraini", email: "maya.anggraini@foodcycle.demo", phone: "+62 817 4433 2211" },
    { name: "Rizky Ramadhan", email: "rizky.ramadhan@foodcycle.demo", phone: "+62 819 5566 7788" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    customers.push(
      await prisma.user.create({
        data: { ...seed, passwordHash, role: UserRole.CUSTOMER },
      }),
    );
  }
  const [andi, siti, budi, maya, rizky] = customers;

  // =========================================================================
  // Restaurants
  // =========================================================================
  console.log("Creating restaurants…");

  const restaurantSeeds = [
    {
      owner: { name: "Bu Sari Wulandari", email: "restaurant@foodcycle.demo", phone: "+62 811 9080 700" },
      name: "Dapur Bu Sari",
      slug: "dapur-bu-sari",
      image: "/images/venue/dapur-bu-sari.jpg",
      cuisine: "Indonesian home cooking",
      description:
        "Masakan rumahan Jawa yang dimasak segar setiap pagi. Kami memasak dalam jumlah terbatas, dan sisa yang masih layak kami tawarkan dengan harga lebih ringan daripada dibuang.",
      address: "Jl. Kemang Raya No. 42",
      city: "Jakarta",
      latitude: -6.2607,
      longitude: 106.8136,
      phone: "+62 21 719 4420",
    },
    {
      owner: { name: "Rangga Mahendra", email: "roti.senja@foodcycle.demo", phone: "+62 812 6677 889" },
      name: "Roti Senja",
      slug: "roti-senja",
      image: "/images/venue/roti-senja.jpg",
      cuisine: "Bakery & pastry",
      description:
        "Toko roti sourdough dan pastry Prancis. Semua roti dipanggang pagi, dan yang tidak terjual sebelum tutup kami lepas dengan harga setengah.",
      address: "Jl. Braga No. 118",
      city: "Bandung",
      latitude: -6.9175,
      longitude: 107.6098,
      phone: "+62 22 420 3311",
    },
    {
      owner: { name: "Kenji Wijaya", email: "kedai.katsu@foodcycle.demo", phone: "+62 813 1122 334" },
      name: "Kedai Katsu",
      slug: "kedai-katsu",
      image: "/images/venue/kedai-katsu.jpg",
      cuisine: "Japanese-Indonesian",
      description:
        "Katsu, donburi, dan furai yang digoreng setelah dipesan. Porsi sisa dari jam makan siang kami tawarkan lewat FoodCycle setiap sore.",
      address: "Jl. Raya Darmo No. 87",
      city: "Surabaya",
      latitude: -7.2891,
      longitude: 112.7341,
      phone: "+62 31 567 2288",
    },
    {
      owner: { name: "Laura Simanjuntak", email: "pasta.senopati@foodcycle.demo", phone: "+62 818 3344 556" },
      name: "Pasta House Senopati",
      slug: "pasta-house-senopati",
      image: "/images/venue/pasta-house-senopati.jpg",
      cuisine: "Italian",
      description:
        "Pasta segar buatan sendiri setiap hari. Menu yang tidak habis di jam makan malam kami jual setengah harga mulai pukul 20.00.",
      address: "Jl. Senopati No. 25",
      city: "Jakarta",
      latitude: -6.2352,
      longitude: 106.8093,
      phone: "+62 21 520 7712",
    },
  ];

  const restaurants = [];
  for (const seed of restaurantSeeds) {
    const owner = await prisma.user.create({
      data: { ...seed.owner, passwordHash, role: UserRole.RESTAURANT },
    });
    const { owner: _owner, ...restaurantData } = seed;
    restaurants.push(
      await prisma.restaurant.create({ data: { ...restaurantData, ownerId: owner.id } }),
    );
  }
  const [dapurBuSari, rotiSenja, kedaiKatsu, pastaHouse] = restaurants;

  // =========================================================================
  // Social institutions
  // =========================================================================
  console.log("Creating social institutions…");

  const institutionSeeds = [
    {
      owner: { name: "Ibu Hartini", email: "institution@foodcycle.demo", phone: "+62 811 4455 667" },
      name: "Panti Asuhan Kasih Ibu",
      slug: "panti-asuhan-kasih-ibu",
      image: "/images/venue/panti-asuhan-kasih-ibu.jpg",
      type: InstitutionType.ORPHANAGE,
      description:
        "Panti asuhan yang menampung anak-anak usia sekolah. Kami menyediakan makan tiga kali sehari dan sangat terbantu oleh donasi makanan siap saji.",
      address: "Jl. Pramuka Sari II No. 15",
      city: "Jakarta",
      supportedCount: 35,
      needs: ["Meals", "Rice", "Fresh vegetables"],
    },
    {
      owner: { name: "Pak Yusuf Hamdani", email: "panti.wreda@foodcycle.demo", phone: "+62 812 9988 776" },
      name: "Panti Wreda Harapan Senja",
      slug: "panti-wreda-harapan-senja",
      image: "/images/venue/panti-wreda-harapan-senja.jpg",
      type: InstitutionType.NURSING_HOME,
      description:
        "Panti jompo dengan 48 penghuni lanjut usia. Kami membutuhkan makanan yang lembut dan mudah dikunyah.",
      address: "Jl. Setiabudi No. 203",
      city: "Bandung",
      supportedCount: 48,
      needs: ["Soft meals", "Rice", "Bread"],
    },
    {
      owner: { name: "Mbak Ratna Kusuma", email: "berbagi.rasa@foodcycle.demo", phone: "+62 813 2211 334" },
      name: "Yayasan Berbagi Rasa",
      slug: "yayasan-berbagi-rasa",
      image: "/images/venue/yayasan-berbagi-rasa.jpg",
      type: InstitutionType.COMMUNITY_KITCHEN,
      description:
        "Dapur umum yang memasak dan membagikan makanan gratis untuk pekerja jalanan dan keluarga prasejahtera di sekitar Malioboro.",
      address: "Jl. Sosrowijayan No. 8",
      city: "Yogyakarta",
      supportedCount: 120,
      needs: ["Bread", "Vegetables", "Cooked meals"],
    },
  ];

  const institutions = [];
  for (const seed of institutionSeeds) {
    const owner = await prisma.user.create({
      data: { ...seed.owner, passwordHash, role: UserRole.SOCIAL_INSTITUTION },
    });
    const { owner: _owner, ...institutionData } = seed;
    institutions.push(
      await prisma.socialInstitution.create({
        data: { ...institutionData, ownerId: owner.id },
      }),
    );
  }
  const [kasihIbu, harapanSenja, berbagiRasa] = institutions;

  // =========================================================================
  // Food items
  // =========================================================================
  console.log("Creating food listings…");

  type FoodSeed = {
    key: string;
    restaurantId: string;
    name: string;
    description: string;
    category: string;
    originalPrice: number;
    discountPrice: number;
    /** Stock before any seeded order is applied. */
    stock: number;
    grade: Grade;
    qualityScore: number;
    /** Hours from now until the pickup deadline. Negative means already past. */
    pickupInHours: number;
    expiresInHours: number;
    status?: FoodStatus;
  };

  const foodSeeds: FoodSeed[] = [
    // --- Dapur Bu Sari (Jakarta) -------------------------------------------
    {
      key: "nasi-ayam-teriyaki",
      restaurantId: dapurBuSari.id,
      name: "Nasi Ayam Teriyaki",
      description:
        "Ayam paha atas dimasak dengan saus teriyaki, disajikan dengan nasi putih pulen, tumis buncis, dan telur mata sapi. Dimasak pagi ini pukul 10.00.",
      category: "Rice & Bowls",
      originalPrice: 50000,
      discountPrice: 25000,
      stock: 12,
      grade: Grade.GRADE_A,
      qualityScore: 92,
      pickupInHours: 5,
      expiresInHours: 8,
    },
    {
      key: "nasi-goreng-spesial",
      restaurantId: dapurBuSari.id,
      name: "Nasi Goreng Spesial",
      description:
        "Nasi goreng kampung dengan telur ceplok, ayam suwir, kerupuk, dan acar timun. Porsi besar, cocok untuk makan malam.",
      category: "Rice & Bowls",
      originalPrice: 45000,
      discountPrice: 27000,
      stock: 8,
      grade: Grade.GRADE_A,
      qualityScore: 88,
      pickupInHours: 6,
      expiresInHours: 9,
    },
    {
      key: "beef-rice-bowl",
      restaurantId: dapurBuSari.id,
      name: "Beef Rice Bowl",
      description:
        "Irisan daging sapi tumis bawang bombai dan paprika, di atas nasi hangat dengan saus mentega.",
      category: "Rice & Bowls",
      originalPrice: 65000,
      discountPrice: 39000,
      stock: 6,
      grade: Grade.GRADE_B,
      qualityScore: 82,
      pickupInHours: 3,
      expiresInHours: 6,
    },
    {
      key: "ayam-bakar-kecap",
      restaurantId: dapurBuSari.id,
      name: "Ayam Bakar Kecap",
      description:
        "Ayam kampung dibakar dengan bumbu kecap manis dan sambal terasi, disertai lalapan dan nasi putih.",
      category: "Chicken",
      originalPrice: 55000,
      discountPrice: 33000,
      stock: 10,
      grade: Grade.GRADE_A,
      qualityScore: 90,
      pickupInHours: 7,
      expiresInHours: 10,
    },
    {
      key: "gado-gado",
      restaurantId: dapurBuSari.id,
      name: "Gado-Gado Siram",
      description:
        "Sayuran rebus segar dengan tahu, tempe, lontong, dan saus kacang yang ditumbuk hari ini.",
      category: "Salads",
      originalPrice: 35000,
      discountPrice: 21000,
      stock: 5,
      grade: Grade.GRADE_B,
      qualityScore: 80,
      pickupInHours: 2,
      expiresInHours: 4,
    },
    {
      key: "tempe-mendoan",
      restaurantId: dapurBuSari.id,
      name: "Tempe Mendoan & Perkedel",
      description:
        "Tempe tipis berbalut tepung dengan sambal kecap, ditemani dua perkedel kentang. Gorengan sore.",
      category: "Snacks",
      originalPrice: 20000,
      discountPrice: 12000,
      stock: 14,
      grade: Grade.GRADE_C,
      qualityScore: 68,
      pickupInHours: 1.5,
      expiresInHours: 3,
    },

    // --- Roti Senja (Bandung) ----------------------------------------------
    {
      key: "croissant-butter",
      restaurantId: rotiSenja.id,
      name: "Croissant Butter",
      description:
        "Croissant lapis 27 dengan mentega Prancis, dipanggang pukul 06.00. Bagian luar renyah, dalamnya lembut berlapis.",
      category: "Bakery & Pastry",
      originalPrice: 28000,
      discountPrice: 14000,
      stock: 18,
      grade: Grade.GRADE_A,
      qualityScore: 94,
      pickupInHours: 4,
      expiresInHours: 20,
    },
    {
      key: "pain-au-chocolat",
      restaurantId: rotiSenja.id,
      name: "Pain au Chocolat",
      description:
        "Pastry berlapis dengan dua batang dark chocolate 62%. Paling nikmat dihangatkan sebentar sebelum dimakan.",
      category: "Bakery & Pastry",
      originalPrice: 32000,
      discountPrice: 16000,
      stock: 15,
      grade: Grade.GRADE_A,
      qualityScore: 91,
      pickupInHours: 4,
      expiresInHours: 20,
    },
    {
      key: "sourdough-loaf",
      restaurantId: rotiSenja.id,
      name: "Sourdough Loaf",
      description:
        "Roti sourdough fermentasi 18 jam dengan starter alami kami. Satu loaf utuh, berat sekitar 700 gram.",
      category: "Bakery & Pastry",
      originalPrice: 55000,
      discountPrice: 28000,
      stock: 7,
      grade: Grade.GRADE_B,
      qualityScore: 84,
      pickupInHours: 5,
      expiresInHours: 30,
    },
    {
      key: "cinnamon-roll",
      restaurantId: rotiSenja.id,
      name: "Cinnamon Roll",
      description:
        "Roti gulung kayu manis dengan lapisan cream cheese frosting. Manisnya pas, tidak berlebihan.",
      category: "Bakery & Pastry",
      originalPrice: 30000,
      discountPrice: 15000,
      stock: 12,
      grade: Grade.GRADE_A,
      qualityScore: 89,
      pickupInHours: 4,
      expiresInHours: 18,
    },
    {
      key: "almond-danish",
      restaurantId: rotiSenja.id,
      name: "Almond Danish",
      description:
        "Danish pastry dengan krim almond dan taburan almond slice. Dari batch pagi, sebaiknya segera dimakan.",
      category: "Bakery & Pastry",
      originalPrice: 34000,
      discountPrice: 17000,
      stock: 4,
      grade: Grade.GRADE_C,
      qualityScore: 72,
      pickupInHours: 1,
      expiresInHours: 4,
    },
    {
      key: "kopi-susu-gula-aren",
      restaurantId: rotiSenja.id,
      name: "Kopi Susu Gula Aren",
      description:
        "Espresso dari biji Arabika Jawa Barat dengan susu segar dan gula aren cair. Disajikan dingin.",
      category: "Beverages",
      originalPrice: 24000,
      discountPrice: 15000,
      stock: 9,
      grade: Grade.GRADE_A,
      qualityScore: 86,
      pickupInHours: 3,
      expiresInHours: 5,
    },

    // --- Kedai Katsu (Surabaya) -------------------------------------------
    {
      key: "chicken-katsu",
      restaurantId: kedaiKatsu.id,
      name: "Chicken Katsu",
      description:
        "Dada ayam berbalut panko, digoreng setelah dipesan. Disajikan dengan saus tonkatsu dan irisan kubis segar.",
      category: "Chicken",
      originalPrice: 52000,
      discountPrice: 26000,
      stock: 11,
      grade: Grade.GRADE_A,
      qualityScore: 93,
      pickupInHours: 5,
      expiresInHours: 7,
    },
    {
      key: "chicken-katsu-curry",
      restaurantId: kedaiKatsu.id,
      name: "Chicken Katsu Curry",
      description:
        "Katsu ayam dengan saus kari Jepang yang dimasak delapan jam, disajikan di atas nasi Jepang.",
      category: "Rice & Bowls",
      originalPrice: 60000,
      discountPrice: 33000,
      stock: 8,
      grade: Grade.GRADE_A,
      qualityScore: 90,
      pickupInHours: 5,
      expiresInHours: 7,
    },
    {
      key: "beef-yakiniku-bowl",
      restaurantId: kedaiKatsu.id,
      name: "Beef Yakiniku Bowl",
      description:
        "Daging sapi slice tipis dengan saus yakiniku, bawang bombai, dan wijen di atas nasi hangat.",
      category: "Rice & Bowls",
      originalPrice: 68000,
      discountPrice: 41000,
      stock: 5,
      grade: Grade.GRADE_B,
      qualityScore: 83,
      pickupInHours: 2.5,
      expiresInHours: 5,
    },
    {
      key: "ebi-furai",
      restaurantId: kedaiKatsu.id,
      name: "Ebi Furai",
      description:
        "Lima ekor udang berbalut panko dengan saus tartar. Renyah di luar, juicy di dalam.",
      category: "Snacks",
      originalPrice: 48000,
      discountPrice: 26000,
      stock: 6,
      grade: Grade.GRADE_B,
      qualityScore: 81,
      pickupInHours: 3,
      expiresInHours: 6,
    },
    {
      key: "chicken-sandwich",
      restaurantId: kedaiKatsu.id,
      name: "Chicken Sandwich",
      description:
        "Ayam panggang dengan selada, tomat, dan mayo wasabi di dalam roti sourdough panggang.",
      category: "Sandwiches & Wraps",
      originalPrice: 38000,
      discountPrice: 21000,
      stock: 7,
      grade: Grade.GRADE_A,
      qualityScore: 87,
      pickupInHours: 4,
      expiresInHours: 8,
    },
    {
      key: "tofu-salad-bowl",
      restaurantId: kedaiKatsu.id,
      name: "Tofu Salad Bowl",
      description:
        "Tahu panggang dengan saus wijen, edamame, timun, dan wortel di atas selada romaine.",
      category: "Salads",
      originalPrice: 40000,
      discountPrice: 22000,
      stock: 3,
      grade: Grade.GRADE_C,
      qualityScore: 70,
      pickupInHours: 1,
      expiresInHours: 3,
    },

    // --- Pasta House Senopati (Jakarta) ------------------------------------
    {
      key: "pasta-bolognese",
      restaurantId: pastaHouse.id,
      name: "Pasta Bolognese",
      description:
        "Spaghetti dengan saus daging sapi cincang yang dimasak perlahan selama tiga jam, ditaburi parmesan.",
      category: "Noodles & Pasta",
      originalPrice: 58000,
      discountPrice: 32000,
      stock: 9,
      grade: Grade.GRADE_A,
      qualityScore: 88,
      pickupInHours: 6,
      expiresInHours: 10,
    },
    {
      key: "aglio-olio",
      restaurantId: pastaHouse.id,
      name: "Spaghetti Aglio Olio",
      description:
        "Spaghetti dengan bawang putih, cabai kering, dan minyak zaitun extra virgin. Sederhana tapi tepat.",
      category: "Noodles & Pasta",
      originalPrice: 52000,
      discountPrice: 29000,
      stock: 6,
      grade: Grade.GRADE_B,
      qualityScore: 79,
      pickupInHours: 4,
      expiresInHours: 8,
    },
    {
      key: "carbonara",
      restaurantId: pastaHouse.id,
      name: "Fettuccine Carbonara",
      description:
        "Fettuccine dengan saus krim, beef bacon, dan kuning telur. Porsi cukup untuk satu orang yang lapar.",
      category: "Noodles & Pasta",
      originalPrice: 62000,
      discountPrice: 35000,
      stock: 4,
      grade: Grade.GRADE_B,
      qualityScore: 82,
      pickupInHours: 3,
      expiresInHours: 6,
    },
    {
      key: "caesar-salad",
      restaurantId: pastaHouse.id,
      name: "Caesar Salad",
      description:
        "Romaine, crouton sourdough, parmesan, dan dressing caesar buatan sendiri. Dressing dipisah terpisah.",
      category: "Salads",
      originalPrice: 45000,
      discountPrice: 25000,
      stock: 5,
      grade: Grade.GRADE_A,
      qualityScore: 85,
      pickupInHours: 5,
      expiresInHours: 9,
    },
    {
      key: "tiramisu-slice",
      restaurantId: pastaHouse.id,
      name: "Tiramisu Slice",
      description:
        "Tiramisu klasik dengan mascarpone dan espresso, didiamkan semalaman. Satu potong cukup untuk dua orang.",
      category: "Desserts",
      originalPrice: 40000,
      discountPrice: 22000,
      stock: 8,
      grade: Grade.GRADE_A,
      qualityScore: 86,
      pickupInHours: 7,
      expiresInHours: 24,
    },
    {
      key: "panna-cotta",
      restaurantId: pastaHouse.id,
      name: "Panna Cotta Vanilla",
      description:
        "Panna cotta lembut dengan saus berry. Disimpan dingin sejak pagi.",
      category: "Desserts",
      originalPrice: 35000,
      discountPrice: 19000,
      stock: 6,
      grade: Grade.GRADE_B,
      qualityScore: 78,
      pickupInHours: 5,
      expiresInHours: 20,
    },

    // --- Status variety: sold out, expired, withdrawn ----------------------
    {
      key: "nasi-uduk-komplit",
      restaurantId: dapurBuSari.id,
      name: "Nasi Uduk Komplit",
      description:
        "Nasi uduk dengan bihun, tempe orek, telur balado, dan bawang goreng. Batch pagi sudah habis.",
      category: "Rice & Bowls",
      originalPrice: 40000,
      discountPrice: 22000,
      stock: 0,
      grade: Grade.GRADE_A,
      qualityScore: 88,
      pickupInHours: 2,
      expiresInHours: 6,
      status: FoodStatus.SOLD_OUT,
    },
    {
      key: "roti-tawar-gandum",
      restaurantId: rotiSenja.id,
      name: "Roti Tawar Gandum",
      description:
        "Satu loaf roti tawar gandum utuh. Batch kemarin, sudah melewati batas penjemputan.",
      category: "Bakery & Pastry",
      originalPrice: 26000,
      discountPrice: 13000,
      stock: 5,
      grade: Grade.GRADE_C,
      qualityScore: 64,
      pickupInHours: -6,
      expiresInHours: -2,
      status: FoodStatus.EXPIRED,
    },
    {
      key: "es-teh-manis",
      restaurantId: kedaiKatsu.id,
      name: "Es Teh Manis",
      description:
        "Teh tubruk manis dengan es batu. Sementara tidak kami tawarkan lewat FoodCycle.",
      category: "Beverages",
      originalPrice: 12000,
      discountPrice: 8000,
      stock: 20,
      grade: Grade.GRADE_A,
      qualityScore: 90,
      pickupInHours: 8,
      expiresInHours: 12,
      status: FoodStatus.UNAVAILABLE,
    },
  ];

  const foodByKey: Record<string, { id: string; name: string; category: string; price: number; originalPrice: number; grade: Grade; restaurantId: string }> = {};

  for (const seed of foodSeeds) {
    const created = await prisma.foodItem.create({
      data: {
        restaurantId: seed.restaurantId,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        // Bundled locally in public/images/food/ — keyed by the seed's own key,
        // so a listing's photo can never drift from the listing it belongs to.
        image: `/images/food/${seed.key}.jpg`,
        originalPrice: seed.originalPrice,
        discountPrice: seed.discountPrice,
        stock: seed.stock,
        grade: seed.grade,
        qualityScore: seed.qualityScore,
        expirationTime: hoursFromNow(seed.expiresInHours),
        pickupDeadline: hoursFromNow(seed.pickupInHours),
        status: seed.status ?? FoodStatus.AVAILABLE,
        createdAt: hoursAgo(4 + (orderCounter % 5)),
      },
    });
    foodByKey[seed.key] = {
      id: created.id,
      name: created.name,
      category: created.category,
      price: created.discountPrice,
      originalPrice: created.originalPrice,
      grade: created.grade,
      restaurantId: created.restaurantId,
    };
  }

  console.log(`  ${foodSeeds.length} listings created.`);

  // =========================================================================
  // Orders
  // =========================================================================
  console.log("Creating orders…");

  type OrderLine = { key: string; qty: number };

  /**
   * Create an order, its line items, and the matching stock decrement.
   * Cancelled orders return their stock, exactly as the live action does.
   */
  async function createOrder(opts: {
    customerId: string;
    restaurantId: string;
    status: OrderStatus;
    purpose: OrderPurpose;
    fulfillment?: FulfillmentType;
    lines: OrderLine[];
    createdAt: Date;
    notes?: string;
  }) {
    const lines = opts.lines.map((line) => {
      const food = foodByKey[line.key];
      if (!food) throw new Error(`Unknown food key in seed: ${line.key}`);
      return { food, qty: line.qty };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.food.price * l.qty, 0);
    const originalTotal = lines.reduce((sum, l) => sum + l.food.originalPrice * l.qty, 0);
    const savings = originalTotal - subtotal;

    const active = opts.status !== OrderStatus.CANCELLED;

    const timeline = {
      confirmedAt: ([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.ON_DELIVERY, OrderStatus.COMPLETED] as OrderStatus[]).includes(opts.status)
        ? new Date(opts.createdAt.getTime() + 5 * 60_000)
        : null,
      preparingAt: ([OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.ON_DELIVERY, OrderStatus.COMPLETED] as OrderStatus[]).includes(opts.status)
        ? new Date(opts.createdAt.getTime() + 12 * 60_000)
        : null,
      readyAt: ([OrderStatus.READY, OrderStatus.ON_DELIVERY, OrderStatus.COMPLETED] as OrderStatus[]).includes(opts.status)
        ? new Date(opts.createdAt.getTime() + 25 * 60_000)
        : null,
      onDeliveryAt: ([OrderStatus.ON_DELIVERY, OrderStatus.COMPLETED] as OrderStatus[]).includes(opts.status)
        ? new Date(opts.createdAt.getTime() + 35 * 60_000)
        : null,
      completedAt: opts.status === OrderStatus.COMPLETED
        ? new Date(opts.createdAt.getTime() + 55 * 60_000)
        : null,
      cancelledAt: opts.status === OrderStatus.CANCELLED
        ? new Date(opts.createdAt.getTime() + 15 * 60_000)
        : null,
    };

    const order = await prisma.order.create({
      data: {
        orderNumber: seedOrderNumber(),
        customerId: opts.customerId,
        restaurantId: opts.restaurantId,
        status: opts.status,
        purpose: opts.purpose,
        fulfillment: opts.fulfillment ?? FulfillmentType.PICKUP,
        subtotal,
        savings,
        deliveryFee: 0,
        total: subtotal,
        notes: opts.notes,
        createdAt: opts.createdAt,
        ...timeline,
        items: {
          create: lines.map((l) => ({
            foodItemId: l.food.id,
            name: l.food.name,
            quantity: l.qty,
            unitPrice: l.food.price,
            unitOriginalPrice: l.food.originalPrice,
            grade: l.food.grade,
          })),
        },
      },
    });

    // Keep stock consistent with the order history.
    for (const l of lines) {
      if (active) {
        await prisma.foodItem.update({
          where: { id: l.food.id },
          data: { stock: { decrement: l.qty } },
        });
      }
    }

    return { order, lines, subtotal };
  }

  // --- Andi's history (the primary demo customer) --------------------------
  const andiOrder1 = await createOrder({
    customerId: andi.id,
    restaurantId: dapurBuSari.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "nasi-ayam-teriyaki", qty: 2 }, { key: "tempe-mendoan", qty: 1 }],
    createdAt: daysAgo(9),
  });

  const andiOrder2 = await createOrder({
    customerId: andi.id,
    restaurantId: rotiSenja.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "croissant-butter", qty: 3 }, { key: "kopi-susu-gula-aren", qty: 2 }],
    createdAt: daysAgo(6),
  });

  // A completed donation — the source of Andi's donated-meal impact.
  const andiDonationOrder = await createOrder({
    customerId: andi.id,
    restaurantId: dapurBuSari.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.DONATION,
    lines: [{ key: "nasi-goreng-spesial", qty: 5 }],
    createdAt: daysAgo(4),
    notes: "Mohon dipisah per porsi agar mudah dibagikan.",
  });

  await prisma.donation.create({
    data: {
      orderId: andiDonationOrder.order.id,
      donorId: andi.id,
      restaurantId: dapurBuSari.id,
      institutionId: kasihIbu.id,
      status: DonationStatus.DELIVERED,
      meals: 5,
      weightKg: 1.8,
      notes: "Diterima lengkap, anak-anak sangat senang.",
      deliveredAt: daysAgo(4),
      receivedAt: daysAgo(4),
      receivedBy: "Ibu Hartini",
      createdAt: daysAgo(4),
    },
  });

  // An order in flight right now, so the customer dashboard has a live timeline.
  await createOrder({
    customerId: andi.id,
    restaurantId: kedaiKatsu.id,
    status: OrderStatus.PREPARING,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "chicken-katsu", qty: 2 }],
    createdAt: hoursAgo(1),
  });

  // A live donation still moving through the pipeline — the institution sees this.
  const liveDonationOrder = await createOrder({
    customerId: andi.id,
    restaurantId: rotiSenja.id,
    status: OrderStatus.CONFIRMED,
    purpose: OrderPurpose.DONATION,
    lines: [{ key: "croissant-butter", qty: 6 }, { key: "pain-au-chocolat", qty: 4 }],
    createdAt: hoursAgo(2),
    notes: "Untuk sarapan anak-anak besok pagi.",
  });

  await prisma.donation.create({
    data: {
      orderId: liveDonationOrder.order.id,
      donorId: andi.id,
      restaurantId: rotiSenja.id,
      institutionId: kasihIbu.id,
      status: DonationStatus.CONFIRMED,
      meals: 10,
      weightKg: 3.2,
      notes: "Untuk sarapan anak-anak besok pagi.",
      createdAt: hoursAgo(2),
    },
  });

  await createOrder({
    customerId: andi.id,
    restaurantId: pastaHouse.id,
    status: OrderStatus.CANCELLED,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "carbonara", qty: 1 }],
    createdAt: daysAgo(2),
  });

  // --- Other customers -----------------------------------------------------
  await createOrder({
    customerId: siti.id,
    restaurantId: dapurBuSari.id,
    status: OrderStatus.PENDING,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "ayam-bakar-kecap", qty: 2 }],
    createdAt: hoursAgo(0.4),
  });

  await createOrder({
    customerId: budi.id,
    restaurantId: dapurBuSari.id,
    status: OrderStatus.PENDING,
    purpose: OrderPurpose.DONATION,
    lines: [{ key: "gado-gado", qty: 4 }],
    createdAt: hoursAgo(0.7),
    notes: "Tolong sertakan sendok sekali pakai.",
  });

  await createOrder({
    customerId: maya.id,
    restaurantId: rotiSenja.id,
    status: OrderStatus.PENDING,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "cinnamon-roll", qty: 2 }, { key: "sourdough-loaf", qty: 1 }],
    createdAt: hoursAgo(1.2),
  });

  await createOrder({
    customerId: rizky.id,
    restaurantId: kedaiKatsu.id,
    status: OrderStatus.READY,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "chicken-katsu-curry", qty: 1 }],
    createdAt: hoursAgo(2.5),
  });

  await createOrder({
    customerId: siti.id,
    restaurantId: pastaHouse.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "pasta-bolognese", qty: 2 }],
    createdAt: daysAgo(3),
  });

  await createOrder({
    customerId: maya.id,
    restaurantId: rotiSenja.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "pain-au-chocolat", qty: 2 }],
    createdAt: daysAgo(5),
  });

  await createOrder({
    customerId: budi.id,
    restaurantId: kedaiKatsu.id,
    status: OrderStatus.PREPARING,
    purpose: OrderPurpose.SELF,
    lines: [{ key: "ebi-furai", qty: 2 }],
    createdAt: hoursAgo(1.5),
  });

  // A second delivered donation, so community impact is not a single data point.
  const sitiDonationOrder = await createOrder({
    customerId: siti.id,
    restaurantId: kedaiKatsu.id,
    status: OrderStatus.COMPLETED,
    purpose: OrderPurpose.DONATION,
    lines: [{ key: "tofu-salad-bowl", qty: 3 }],
    createdAt: daysAgo(7),
  });

  await prisma.donation.create({
    data: {
      orderId: sitiDonationOrder.order.id,
      donorId: siti.id,
      restaurantId: kedaiKatsu.id,
      institutionId: harapanSenja.id,
      status: DonationStatus.DELIVERED,
      meals: 3,
      weightKg: 1.1,
      deliveredAt: daysAgo(7),
      receivedAt: daysAgo(7),
      receivedBy: "Pak Yusuf Hamdani",
      createdAt: daysAgo(7),
    },
  });

  // =========================================================================
  // Reviews
  // =========================================================================
  console.log("Creating reviews…");

  await prisma.review.create({
    data: {
      userId: andi.id,
      foodItemId: foodByKey["nasi-ayam-teriyaki"].id,
      restaurantId: dapurBuSari.id,
      orderId: andiOrder1.order.id,
      rating: 5,
      comment:
        "Porsinya masih hangat waktu diambil dan bumbunya meresap. Tidak terasa seperti makanan sisa sama sekali.",
      createdAt: daysAgo(9),
    },
  });

  await prisma.review.create({
    data: {
      userId: andi.id,
      foodItemId: foodByKey["croissant-butter"].id,
      restaurantId: rotiSenja.id,
      orderId: andiOrder2.order.id,
      rating: 5,
      comment: "Masih renyah di luar. Dihangatkan sebentar, hasilnya seperti baru dipanggang.",
      createdAt: daysAgo(6),
    },
  });

  const reviewSeeds = [
    { userId: siti.id, key: "pasta-bolognese", rating: 5, comment: "Sausnya kaya rasa dan porsinya besar. Harga setengahnya masuk akal sekali.", days: 3 },
    { userId: maya.id, key: "pain-au-chocolat", rating: 4, comment: "Cokelatnya masih banyak. Sedikit lembek tapi masih enak.", days: 5 },
    { userId: budi.id, key: "chicken-katsu", rating: 5, comment: "Katsu-nya masih krispi. Anak saya suka.", days: 8 },
    { userId: rizky.id, key: "chicken-katsu-curry", rating: 4, comment: "Kari-nya pekat dan hangat. Cocok untuk makan malam.", days: 10 },
    { userId: siti.id, key: "nasi-goreng-spesial", rating: 5, comment: "Sudah dua kali pesan, kualitasnya konsisten.", days: 12 },
    { userId: maya.id, key: "cinnamon-roll", rating: 5, comment: "Frosting-nya tidak terlalu manis. Pas.", days: 2 },
    { userId: rizky.id, key: "beef-yakiniku-bowl", rating: 4, comment: "Dagingnya empuk. Nasi sedikit dingin tapi masih oke.", days: 4 },
    { userId: budi.id, key: "caesar-salad", rating: 4, comment: "Sayurnya masih segar. Dressing dipisah, jadi tidak lembek.", days: 6 },
  ];

  for (const r of reviewSeeds) {
    // A review is tied to an order, so only seed ones whose order exists.
    const food = foodByKey[r.key];
    await prisma.review.create({
      data: {
        userId: r.userId,
        foodItemId: food.id,
        restaurantId: food.restaurantId,
        rating: r.rating,
        comment: r.comment,
        createdAt: daysAgo(r.days),
      },
    });
  }

  // =========================================================================
  // Impact records
  // =========================================================================
  console.log("Creating impact records…");

  await prisma.impactRecord.create({
    data: {
      userId: andi.id,
      orderId: andiOrder1.order.id,
      mealsSaved: 3,
      mealsDonated: 0,
      weightKg: 1.1,
      createdAt: daysAgo(9),
    },
  });

  await prisma.impactRecord.create({
    data: {
      userId: andi.id,
      orderId: andiOrder2.order.id,
      mealsSaved: 5,
      mealsDonated: 0,
      weightKg: 1.4,
      createdAt: daysAgo(6),
    },
  });

  await prisma.impactRecord.create({
    data: {
      userId: andi.id,
      orderId: andiDonationOrder.order.id,
      mealsSaved: 0,
      mealsDonated: 5,
      weightKg: 1.8,
      createdAt: daysAgo(4),
    },
  });

  await prisma.impactRecord.create({
    data: {
      userId: siti.id,
      orderId: sitiDonationOrder.order.id,
      mealsSaved: 0,
      mealsDonated: 3,
      weightKg: 1.1,
      createdAt: daysAgo(7),
    },
  });

  // Aggregate the broader community figures as synthetic history, so the
  // Community Impact figures are real sums over real rows rather than a
  // hard-coded number printed in the UI.
  console.log("Creating community impact history…");

  const communityRows: {
    mealsSaved: number;
    mealsDonated: number;
    weightKg: number;
    createdAt: Date;
  }[] = [];

  for (let day = 60; day >= 0; day--) {
    // A gentle upward trend with a weekend bump.
    const date = daysAgo(day);
    const weekend = [0, 6].includes(date.getDay());
    const base = 55 + Math.round((60 - day) * 1.6) + (weekend ? 25 : 0);
    const jitter = ((day * 37) % 17) - 8;

    const saved = Math.max(10, base + jitter);
    const donated = Math.round(saved * 0.28) + ((day * 13) % 5);

    communityRows.push({
      mealsSaved: saved,
      mealsDonated: donated,
      weightKg: Math.round((saved + donated) * 0.35 * 10) / 10,
      createdAt: date,
    });
  }

  await prisma.impactRecord.createMany({ data: communityRows });

  // =========================================================================
  // Preferences & saved restaurants
  // =========================================================================
  console.log("Creating preferences and saved restaurants…");

  const andiPreferences = [
    { category: "Rice & Bowls", score: 1.0 },
    { category: "Chicken", score: 0.82 },
    { category: "Bakery & Pastry", score: 0.64 },
    { category: "Beverages", score: 0.41 },
    { category: "Snacks", score: 0.28 },
  ];

  for (const p of andiPreferences) {
    await prisma.userPreference.create({
      data: { userId: andi.id, category: p.category, score: p.score },
    });
  }

  for (const p of [
    { category: "Noodles & Pasta", score: 0.9 },
    { category: "Salads", score: 0.55 },
  ]) {
    await prisma.userPreference.create({
      data: { userId: siti.id, category: p.category, score: p.score },
    });
  }

  for (const restaurantId of [dapurBuSari.id, rotiSenja.id, kedaiKatsu.id]) {
    await prisma.savedRestaurant.create({
      data: { userId: andi.id, restaurantId },
    });
  }

  await prisma.savedRestaurant.create({
    data: { userId: maya.id, restaurantId: rotiSenja.id },
  });

  // =========================================================================
  // Notifications
  // =========================================================================
  console.log("Creating notifications…");

  const notifications: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    read?: boolean;
    createdAt: Date;
  }[] = [
    // Andi
    {
      userId: andi.id,
      type: NotificationType.ORDER_PREPARING,
      title: "Pesananmu sedang disiapkan",
      body: "Kedai Katsu sedang menyiapkan Chicken Katsu kamu. Siap sekitar 20 menit lagi.",
      link: "/orders",
      createdAt: hoursAgo(0.8),
    },
    {
      userId: andi.id,
      type: NotificationType.DONATION_CREATED,
      title: "Donasimu sedang diproses",
      body: "Roti Senja sudah menerima donasi 10 porsi untuk Panti Asuhan Kasih Ibu.",
      link: "/impact",
      read: true,
      createdAt: hoursAgo(2),
    },
    {
      userId: andi.id,
      type: NotificationType.DONATION_DELIVERED,
      title: "Donasimu sudah diterima",
      body: "Panti Asuhan Kasih Ibu mengonfirmasi penerimaan 5 porsi makanan.",
      link: "/impact",
      read: true,
      createdAt: daysAgo(4),
    },
    {
      userId: andi.id,
      type: NotificationType.ORDER_COMPLETED,
      title: "Pesanan selesai",
      body: "Pesanan Croissant Butter kamu sudah selesai. Terima kasih sudah mengurangi makanan terbuang.",
      link: "/orders",
      read: true,
      createdAt: daysAgo(6),
    },
    // Restaurant — Dapur Bu Sari
    {
      userId: dapurBuSari.ownerId,
      type: NotificationType.ORDER_PLACED,
      title: "Pesanan baru masuk",
      body: "Siti Rahmawati memesan 2× Ayam Bakar Kecap.",
      link: "/restaurant/orders",
      createdAt: hoursAgo(0.4),
    },
    {
      userId: dapurBuSari.ownerId,
      type: NotificationType.DONATION_CREATED,
      title: "Pesanan donasi baru",
      body: "Budi Santoso mendonasikan 4× Gado-Gado Siram untuk Yayasan Berbagi Rasa.",
      link: "/restaurant/orders",
      createdAt: hoursAgo(0.7),
    },
    {
      userId: dapurBuSari.ownerId,
      type: NotificationType.LOW_STOCK,
      title: "Stok menipis",
      body: "Gado-Gado Siram tersisa 1 porsi.",
      link: "/restaurant/inventory",
      read: true,
      createdAt: hoursAgo(3),
    },
    // Institution
    {
      userId: kasihIbu.ownerId,
      type: NotificationType.DONATION_CREATED,
      title: "Donasi masuk",
      body: "Andi Pratama mendonasikan 10 porsi dari Roti Senja untuk panti Anda.",
      link: "/institution/donations",
      createdAt: hoursAgo(2),
    },
    {
      userId: kasihIbu.ownerId,
      type: NotificationType.DONATION_DELIVERED,
      title: "Donasi diterima",
      body: "5 porsi dari Dapur Bu Sari telah dikonfirmasi diterima.",
      link: "/institution/donations",
      read: true,
      createdAt: daysAgo(4),
    },
    // Admin
    {
      userId: admin.id,
      type: NotificationType.SYSTEM,
      title: "Selamat datang di FoodCycle",
      body: "4 restoran dan 3 lembaga sosial terdaftar. Semua akun terverifikasi.",
      link: "/admin/dashboard",
      read: true,
      createdAt: daysAgo(1),
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read ?? false,
        createdAt: n.createdAt,
      },
    });
  }

  // =========================================================================
  // Summary
  // =========================================================================
  const counts = {
    users: await prisma.user.count(),
    restaurants: await prisma.restaurant.count(),
    institutions: await prisma.socialInstitution.count(),
    foods: await prisma.foodItem.count(),
    orders: await prisma.order.count(),
    donations: await prisma.donation.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    impactRows: await prisma.impactRecord.count(),
  };

  console.log("\nSeed complete.");
  console.table(counts);
  console.log("\nDemo accounts (password: demo123)");
  console.log("  customer@foodcycle.demo     Andi Pratama     — customer with order & donation history");
  console.log("  restaurant@foodcycle.demo   Dapur Bu Sari    — restaurant with a live order queue");
  console.log("  institution@foodcycle.demo  Panti Asuhan Kasih Ibu — institution with an incoming donation");
  console.log("  admin@foodcycle.demo        Dimas Prakoso    — platform admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
