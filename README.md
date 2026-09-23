# FoodCycle 🍽️♻️❤️

Platform jual-beli **makanan surplus** sekaligus **donasi makanan** untuk panti sosial.

Restoran menjual makanan yang tidak habis terjual dengan harga ±50%, pembeli bisa
menikmatinya sendiri atau mendonasikannya ke panti asuhan / panti jompo. Setiap
donasi tercatat sebagai dampak yang bisa dilihat.

---

## Alur utama

```
Restoran  ──►  memasukkan makanan yang tidak habis terjual
          ──►  dijual dengan harga ±50% (Grade A/B/C + Quality Score)
Pengguna  ──►  membeli makanan tersebut
          ──►  pilih: "Donasikan"  atau  buat dirinya sendiri
Donasi    ──►  disalurkan ke panti asuhan / panti jompo
Sistem    ──►  mencatat dampak donasi (porsi, berat, riwayat)  ♻️❤️
```

---

## Fitur

### Grade — indikator kondisi makanan

Setiap makanan surplus diberi grade oleh restoran, supaya pembeli tahu kondisi
sebenarnya sebelum membeli — bukan sekadar "murah karena mau basi".

| Grade | Arti | Kapan dipakai |
|---|---|---|
| **A** | Excellent condition | Jendela konsumsi masih lega, kualitas visual sangat baik |
| **B** | Good condition | Masih layak, tapi sebaiknya segera dimakan |
| **C** | Consume soon | Masih dianggap layak restoran, tapi mendekati akhir jendela konsumsi |

> FoodCycle Grade adalah indikator internal marketplace, **bukan** sertifikasi
> keamanan pangan resmi. Restoran tetap bertanggung jawab atas kelayakan makanan.

### Quality Score — skor 0–100

Skor perkiraan kondisi makanan saat ini, dihitung dari kesegaran listing, sisa
jendela konsumsi, kondisi penyimpanan, dan informasi dari restoran.

| Skor | Label |
|---|---|
| ≥ 90 | Excellent |
| ≥ 80 | Very good |
| ≥ 70 | Good |
| ≥ 60 | Fair |
| < 60 | Consume soon |

Bisa difilter: `?minQuality=90` hanya menampilkan skor ≥ 90.

### Recommendation filtering

Halaman depan dan `/foods?sort=recommended` memakai mesin rekomendasi yang
menyesuaikan diri dengan riwayat belanja pengguna:

- **Pengguna anonim** melihat rak umum ("Popular right now", "Ending soon").
- **Pengguna login** melihat rak personal ("Recommended for you") berdasarkan
  kategori yang sering dibeli, preferensi tersimpan, dan restoran yang di-follow.
- Setiap kartu rekomendasi menampilkan **alasan** kenapa ia muncul
  ("Anda sering memesan Rice & Bowls", "Rating tinggi", "Diskon 50%", dst.)
- Urutan `recommended` **berbeda** dari urutan `price-asc` — ranking benar-benar
  diterapkan, bukan sekadar label.

### Filter & sort marketplace

Filter: kategori, grade, restoran, diskon minimum, kualitas minimum, jendela
penjemputan, harga.
Sort: `recommended`, `newest`, `price-asc`, `discount`, `quality`, `ending-soon`.

### Donasi & dampak

- Saat checkout, pembeli memilih **untuk diri sendiri** atau **donasikan**.
- Donasi masuk ke panti sosial (panti asuhan / panti jompo) dan tercatat
  sebagai `Donation` + `ImpactRecord`.
- Halaman `/impact` menampilkan akumulasi dampak: porsi terselamatkan, berat
  makanan, donasi tersalurkan.

---

## Peran pengguna

| Peran | Area | Isi |
|---|---|---|
| **Customer** | `/`, `/foods`, `/donate`, `/impact` | Belanja, checkout, donasi, riwayat order |
| **Restaurant** | `/restaurant/*` | Kelola listing, inventori, order masuk, ulasan |
| **Institution** | `/institution/*` | Donasi masuk, profil panti, onboarding |
| **Admin** | `/admin/*` | Kelola pengguna, restoran, institusi |

Total **37 halaman**, **17 model** database.

---

## Teknologi

| Bagian | Dipakai |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | NextAuth (Auth.js) v5 — credentials, bcryptjs |
| Validasi | Zod |
| Ikon | Lucide React |

---

## Menjalankan di lokal

**Prasyarat:** Node.js 20+, Docker Desktop.

### Cara cepat (VS Code)

1. Buka folder `foodcycle-app` di VS Code
2. Tekan **`Ctrl + Shift + B`** → task *"1. Jalanin website (dev server)"*
3. Buka http://localhost:3000

### Cara manual

```bash
docker compose up -d      # 1. nyalakan PostgreSQL
npm install               # 2. pasang dependensi
npx prisma generate       # 3. generate Prisma Client
npx prisma migrate deploy # 4. buat tabel
npm run db:seed           # 5. isi data contoh
npm run dev               # 6. jalankan
```

Atau sekali jalan: `sh setup.sh`

### Akun demo

Password semua akun: **`demo123`**

| Email | Peran |
|---|---|
| `customer@foodcycle.demo` | Pembeli — punya riwayat order & donasi |
| `restaurant@foodcycle.demo` | Restoran — punya antrean pesanan |
| `institution@foodcycle.demo` | Panti asuhan — punya donasi masuk |
| `admin@foodcycle.demo` | Admin platform |

### Perintah lain

```bash
npm run typecheck   # cek error TypeScript
npm run db:studio   # GUI lihat isi database
npm run build       # build produksi
```

---

## Catatan tentang data demo

Listing hasil seed memakai **deadline relatif** ("pickup dalam 2 jam"), lalu
semuanya digeser ke depan **45 hari** oleh `DEMO_HORIZON_DAYS` di `prisma/seed.ts`.
Ini supaya demo tidak "membusuk" sendiri: tanpa itu, `expireStaleListings()`
akan menandai semua listing sebagai EXPIRED beberapa jam setelah seeding, dan
marketplace jadi kosong.

Kalau data demo tetap perlu disegarkan:

```bash
npm run db:seed
```

---

## Struktur proyek

```
foodcycle-app/
├── prisma/
│   ├── schema.prisma        # 17 model
│   ├── seed.ts              # data demo realistis (Rupiah, menu Indonesia)
│   └── migrations/
├── public/images/
│   ├── food/                # 27 foto makanan (lokal, bukan hotlink)
│   └── venue/               # 7 foto restoran & panti
├── src/
│   ├── app/
│   │   ├── (site)/          # area customer
│   │   ├── (auth)/          # login & signup
│   │   ├── restaurant/      # dashboard restoran
│   │   ├── institution/     # dashboard panti
│   │   └── admin/           # dashboard admin
│   ├── components/          # food/, marketplace/, layout/, ui/, auth/
│   ├── lib/                 # domain.ts (Grade/Quality), recommendation.ts, filters.ts
│   └── server/              # query & server actions
└── docker-compose.yml       # PostgreSQL 16 lokal
```

---

## Deployment

`docker-compose.yml`, `.env.example`, dan `prisma/migrations/` sudah disertakan
supaya bisa di-deploy ke Vercel / Railway / Fly.io (butuh PostgreSQL terkelola).

Variabel lingkungan yang wajib diisi: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
`AUTH_TRUST_HOST`. Lihat `.env.example`.

> ⚠️ `AUTH_SECRET` di `.env` hanya untuk pengembangan lokal. Generate nilai baru
> untuk produksi:
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
