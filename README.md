# SIPADI

SIPADI adalah aplikasi web fullstack untuk **Sistem Pengarsipan dan Disposisi Inspektorat**. Aplikasi ini dirancang agar bisa dikembangkan dari laptop pribadi tanpa bergantung pada jaringan lokal kantor, lalu siap dipisah deploy ke Vercel, Render/Railway, dan Supabase PostgreSQL.

Data di repo ini seluruhnya dummy.

## Teknologi

- Frontend: Next.js, React, Tailwind CSS
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Auth: JWT dengan password hashing `bcryptjs`
- Upload: local storage di `apps/api/uploads`
- Export laporan: PDF dan Excel
- Target deploy: Vercel frontend, Render/Railway backend, Supabase database

## Struktur Folder

```text
.
├── apps
│   ├── api
│   │   ├── db
│   │   │   ├── migrate.js
│   │   │   ├── schema.sql
│   │   │   └── seed.js
│   │   ├── src
│   │   │   ├── config
│   │   │   ├── middleware
│   │   │   ├── routes
│   │   │   ├── services
│   │   │   ├── utils
│   │   │   └── server.js
│   │   └── uploads
│   └── web
│       ├── app
│       │   ├── (app)
│       │   └── login
│       ├── components
│       └── lib
├── docker-compose.yml
└── package.json
```

## Database Schema

Tabel utama:

- `organization_units`: 11 unit organisasi.
- `users`: user dummy dengan role Admin, Inspektur, Sekretaris, Sub Bag, Irban Wilayah, Staff.
- `archives`: arsip dokumen, status, tipe file, metadata upload, verifikasi.
- `archive_comments`: komentar arsip.
- `dispositions`: disposisi dokumen, tujuan user/unit, catatan, deadline, status.
- `disposition_history`: riwayat perubahan disposisi.
- `audit_logs`: log aktivitas user.

Schema lengkap ada di `apps/api/db/schema.sql`.

## Seed Data

Seeder membuat:

- 10 user
- 11 unit organisasi
- 30 arsip
- 10 disposisi
- 20 aktivitas audit

Akun login utama:

```text
admin@sipadi.test
password123
```

Semua user seed memakai password `password123`.

## Cara Menjalankan Lokal

1. Install dependency.

```bash
npm install
```

2. Siapkan file environment.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Jalankan PostgreSQL lokal dengan Docker.

```bash
docker compose up -d
```

Jika sudah punya PostgreSQL lokal, gunakan database sendiri dan set `DATABASE_URL`, misalnya:

```text
DATABASE_URL=postgresql:///sipadi
```

4. Terapkan schema dan seed dummy.

```bash
npm run db:schema
npm run db:seed
```

5. Jalankan frontend dan backend.

```bash
npm run dev
```

URL lokal:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

## API Endpoint

Auth:

- `POST /api/auth/login`
- `GET /api/auth/me`

Dashboard:

- `GET /api/dashboard`

Arsip:

- `GET /api/archives`
- `POST /api/archives`
- `GET /api/archives/:id`
- `PUT /api/archives/:id`
- `DELETE /api/archives/:id`
- `POST /api/archives/:id/comments`
- `POST /api/archives/:id/verify`
- `GET /api/archives/:id/download`

Disposisi:

- `GET /api/dispositions`
- `POST /api/dispositions`
- `GET /api/dispositions/:id`
- `PATCH /api/dispositions/:id/status`
- `DELETE /api/dispositions/:id`

Organisasi:

- `GET /api/organization`
- `GET /api/organization/users`

Laporan:

- `GET /api/reports/archives`
- `GET /api/reports/archives/export?format=pdf`
- `GET /api/reports/archives/export?format=xls`

Audit log:

- `GET /api/audit-logs`

User management:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Deploy Cloud

### Supabase PostgreSQL

1. Buat project Supabase.
2. Ambil connection string PostgreSQL.
3. Set `DATABASE_URL` backend ke connection string Supabase.
4. Jalankan schema dan seed dari laptop:

```bash
DATABASE_URL="postgresql://..." npm run db:schema
DATABASE_URL="postgresql://..." npm run db:seed
```

### Backend di Render atau Railway

Set environment:

```text
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=secret-produksi-yang-panjang
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://domain-frontend.vercel.app
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

Build command:

```bash
npm install
```

Start command:

```bash
npm run start --workspace @sipadi/api
```

Catatan upload: local storage cocok untuk development. Saat production, ganti adapter upload di `apps/api/src/middleware/upload.js` ke Supabase Storage atau Cloudinary agar file tidak hilang saat instance backend restart.

### Frontend di Vercel

Set root project ke repo ini dan environment:

```text
NEXT_PUBLIC_API_URL=https://domain-backend.onrender.com/api
```

Build command:

```bash
npm run build --workspace @sipadi/web
```

Output mengikuti standar Next.js di Vercel.

## Security Yang Sudah Disiapkan

- Password di-hash dengan `bcryptjs`.
- Auth JWT dengan expiry.
- Role-based access control di endpoint sensitif.
- Arsip bersifat terbuka untuk dibaca semua user login.
- File arsip bisa dipratinjau dan diunduh dari detail arsip oleh user login.
- Edit dan hapus arsip hanya untuk Admin, Inspektur, Sekretaris, atau role `Sub Bag`/`Irban Wilayah` pada unit arsipnya.
- Perubahan status arsip hanya untuk Admin, Inspektur, Sekretaris, atau role `Sub Bag`/`Irban Wilayah` pada unit arsipnya.
- Pembuatan disposisi hanya untuk Admin, Inspektur, atau Sekretaris.
- Validasi input dengan `zod`.
- Validasi upload extension, MIME, dan ukuran file.
- `helmet` untuk header security dasar.
- Semua secret lewat environment variable.
