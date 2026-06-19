import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://sipadi:sipadi123@localhost:5432/sipadi"
});

const units = [
  ["Inspektur", "INS", null, "Pimpinan", "Pimpinan Inspektorat"],
  ["Sekretaris", "SEK", 1, "Sekretariat", "Koordinasi administrasi dan tata usaha"],
  ["Sub Bag Umum dan Kepegawaian", "SUB-UMPEG", 2, "Sub Bag", "Administrasi umum dan kepegawaian"],
  ["Sub Bag Perencanaan, Evaluasi dan Pelaporan", "SUB-PEP", 2, "Sub Bag", "Perencanaan, evaluasi, dan pelaporan"],
  ["Sub Bag Keuangan dan Aset", "SUB-KA", 2, "Sub Bag", "Keuangan dan pengelolaan aset"],
  ["Inspektur Pembantu Wilayah I", "IRBAN-I", 1, "Irban Wilayah", "Pengawasan wilayah I"],
  ["Inspektur Pembantu Wilayah II", "IRBAN-II", 1, "Irban Wilayah", "Pengawasan wilayah II"],
  ["Inspektur Pembantu Wilayah III", "IRBAN-III", 1, "Irban Wilayah", "Pengawasan wilayah III"],
  ["Inspektur Pembantu Wilayah IV", "IRBAN-IV", 1, "Irban Wilayah", "Pengawasan wilayah IV"],
  ["Inspektur Pembantu Wilayah V", "IRBAN-V", 1, "Irban Wilayah", "Pengawasan wilayah V"],
  ["Jabatan Fungsional", "JF", 1, "Fungsional", "Auditor dan pengawas penyelenggaraan urusan pemerintahan"]
];

const users = [
  ["Admin SIPADI", "admin", "admin@sipadi.test", "Admin", 1],
  ["Dian Pratama", "inspektur", "inspektur@sipadi.test", "Inspektur", 1],
  ["Maya Lestari", "sekretaris", "sekretaris@sipadi.test", "Sekretaris", 2],
  ["Raka Wijaya", "umpeg", "umpeg@sipadi.test", "Sub Bag", 3],
  ["Nadia Kirana", "pep", "pep@sipadi.test", "Sub Bag", 4],
  ["Galih Saputra", "keuangan", "keuangan@sipadi.test", "Sub Bag", 5],
  ["Sinta Maharani", "irban1", "irban1@sipadi.test", "Irban Wilayah", 6],
  ["Bimo Hartono", "irban3", "irban3@sipadi.test", "Irban Wilayah", 8],
  ["Tari Anggraini", "auditor", "auditor@sipadi.test", "Staff", 11],
  ["Fajar Nugroho", "staff", "staff@sipadi.test", "Staff", 3]
];

const statuses = ["Draft", "Menunggu Review", "Terverifikasi", "Ditolak", "Diarsipkan"];
const documentTypes = [
  "Laporan Hasil Pemeriksaan",
  "Surat Masuk",
  "Surat Tugas",
  "Nota Dinas",
  "Berita Acara",
  "Bukti Dukung"
];
const fileTypes = ["PDF", "DOCX", "XLSX", "JPG", "PNG"];

const archiveTitles = [
  "Laporan pemeriksaan reguler triwulan I",
  "Surat tugas pengawasan kinerja perangkat daerah",
  "Nota dinas permintaan reviu dokumen perencanaan",
  "Bukti dukung tindak lanjut rekomendasi",
  "Berita acara ekspose hasil pengawasan",
  "Laporan evaluasi maturitas SPIP",
  "Surat masuk permohonan pendampingan",
  "Rekapitulasi monitoring aksi pengawasan",
  "Draft pedoman pengarsipan internal",
  "Laporan pemeriksaan khusus aset daerah",
  "Surat tugas tim audit tujuan tertentu",
  "Dokumen verifikasi tindak lanjut LHP",
  "Nota dinas koordinasi pengawasan wilayah",
  "Laporan reviu RKPD perangkat daerah",
  "Daftar inventaris arsip aktif",
  "Bukti dukung klarifikasi temuan",
  "Berita acara rapat evaluasi mingguan",
  "Surat masuk dari perangkat daerah binaan",
  "Laporan pemantauan risiko strategis",
  "Dokumen reviu laporan keuangan",
  "Draft SOP layanan disposisi digital",
  "Surat tugas pendampingan manajemen risiko",
  "Laporan evaluasi SAKIP perangkat daerah",
  "Rekap hasil konsultasi pengawasan",
  "Bukti foto pemeriksaan lapangan",
  "Laporan penjaminan kualitas APIP",
  "Surat undangan ekspose hasil audit",
  "Nota dinas penyampaian hasil reviu",
  "Dokumen arsip permanen pengawasan",
  "Laporan akhir kegiatan pengawasan tahunan"
];

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE disposition_history, dispositions, archive_comments, audit_logs, archives, users, organization_units
      RESTART IDENTITY CASCADE
    `);

    for (const unit of units) {
      await client.query(
        `INSERT INTO organization_units (name, code, parent_id, unit_type, description)
         VALUES ($1, $2, $3, $4, $5)`,
        unit
      );
    }

    const passwordHash = await bcrypt.hash("password123", 10);
    for (const user of users) {
      await client.query(
        `INSERT INTO users (name, username, email, password_hash, role, unit_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user[0], user[1], user[2], passwordHash, user[3], user[4]]
      );
    }

    for (let i = 0; i < archiveTitles.length; i += 1) {
      const archiveNo = String(i + 1).padStart(3, "0");
      const year = 2024 + (i % 3);
      const status = statuses[i % statuses.length];
      const fileType = fileTypes[i % fileTypes.length];
      const unitId = (i % 11) + 1;
      const creatorId = (i % 10) + 1;
      const verifiedBy = ["Terverifikasi", "Diarsipkan"].includes(status) ? ((i + 1) % 3) + 1 : null;

      await client.query(
        `INSERT INTO archives (
          title, document_number, unit_id, document_type, file_type, year, status, classification,
          description, file_path, file_original_name, file_size, created_by, verified_by, verified_at,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)`,
        [
          archiveTitles[i],
          `SIPADI/${year}/${archiveNo}`,
          unitId,
          documentTypes[i % documentTypes.length],
          fileType,
          year,
          status,
          i % 4 === 0 ? "Rahasia" : "Internal",
          `Data dummy untuk ${archiveTitles[i].toLowerCase()}.`,
          null,
          `dummy-${archiveNo}.${fileType.toLowerCase()}`,
          128000 + i * 2048,
          creatorId,
          verifiedBy,
          verifiedBy ? daysAgo(12 - (i % 8)) : null,
          daysAgo(30 - i)
        ]
      );
    }

    const comments = [
      [1, 2, "Mohon lengkapi ringkasan tindak lanjut sebelum diverifikasi."],
      [2, 7, "Dokumen sudah sesuai dengan surat tugas."],
      [4, 9, "File pendukung akan ditambahkan pada pembaruan berikutnya."],
      [7, 3, "Tolong cek kembali nomor dokumen dan tahun arsip."],
      [12, 1, "Sudah diverifikasi berdasarkan catatan pemeriksa."]
    ];

    for (const comment of comments) {
      await client.query(
        "INSERT INTO archive_comments (archive_id, user_id, comment) VALUES ($1, $2, $3)",
        comment
      );
    }

    for (let i = 1; i <= 10; i += 1) {
      const status = ["Dikirim", "Dibaca", "Diproses", "Selesai", "Dibatalkan"][i % 5];
      const fromUser = ((i + 1) % 5) + 1;
      const toUser = i % 2 === 0 ? ((i + 4) % 10) + 1 : null;
      const toUnit = toUser ? null : ((i + 3) % 11) + 1;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + i + 2);

      const result = await client.query(
        `INSERT INTO dispositions (archive_id, from_user_id, to_user_id, to_unit_id, note, deadline, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          i,
          fromUser,
          toUser,
          toUnit,
          `Disposisi dummy nomor ${i}: tindak lanjuti dokumen dan berikan catatan hasil pemeriksaan.`,
          deadline,
          status,
          daysAgo(14 - i)
        ]
      );

      await client.query(
        "INSERT INTO disposition_history (disposition_id, status, note, user_id, created_at) VALUES ($1, $2, $3, $4, $5)",
        [result.rows[0].id, "Dikirim", "Disposisi dibuat.", fromUser, daysAgo(14 - i)]
      );

      if (status !== "Dikirim") {
        await client.query(
          "INSERT INTO disposition_history (disposition_id, status, note, user_id, created_at) VALUES ($1, $2, $3, $4, $5)",
          [result.rows[0].id, status, "Status disposisi diperbarui.", toUser || fromUser, daysAgo(9 - i)]
        );
      }
    }

    const actions = [
      ["LOGIN", "auth"], ["CREATE", "archive"], ["UPDATE", "archive"], ["VERIFY", "archive"], ["COMMENT", "archive"],
      ["CREATE", "disposition"], ["UPDATE_STATUS", "disposition"], ["EXPORT", "report"], ["DOWNLOAD", "archive"], ["CREATE", "user"]
    ];

    for (let i = 1; i <= 20; i += 1) {
      const action = actions[i % actions.length];
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          (i % 10) + 1,
          action[0],
          action[1],
          i <= 30 ? i : null,
          JSON.stringify({ source: "seed", message: `Aktivitas dummy ${i}` }),
          daysAgo(20 - i)
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Seed selesai: 10 user, 11 unit organisasi, 30 arsip, 10 disposisi, 20 aktivitas.");
    console.log("Login dummy: admin@sipadi.test / password123");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
