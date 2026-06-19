export const ROLES = ["Admin", "Inspektur", "Sekretaris", "Sub Bag", "Irban Wilayah", "Staff"];

export const GLOBAL_ROLES = ["Admin", "Inspektur", "Sekretaris"];
export const UNIT_EDIT_ROLES = ["Sub Bag", "Irban Wilayah"];

export const ARCHIVE_STATUSES = ["Draft", "Menunggu Review", "Terverifikasi", "Ditolak", "Diarsipkan"];

export const DISPOSITION_STATUSES = ["Dikirim", "Dibaca", "Diproses", "Selesai", "Dibatalkan"];

export const DOCUMENT_TYPES = [
  "Laporan Hasil Pemeriksaan",
  "Surat Masuk",
  "Surat Tugas",
  "Nota Dinas",
  "Berita Acara",
  "Bukti Dukung"
];

export const FILE_TYPES = ["PDF", "DOC", "DOCX", "XLS", "XLSX", "JPG", "PNG"];

export function canAccessGlobal(role) {
  return GLOBAL_ROLES.includes(role);
}

export function canChooseArchiveUnit(user) {
  return user?.role === "Admin";
}

export function canViewArchive() {
  return true;
}

export function canDownloadArchive() {
  return true;
}

export function canEditArchive(user, archive) {
  if (!user || !archive) return false;
  if (GLOBAL_ROLES.includes(user.role)) return true;
  return UNIT_EDIT_ROLES.includes(user.role) && Number(user?.unitId) === Number(archive?.unit_id);
}

export function canDeleteArchive(user, archive) {
  return canEditArchive(user, archive);
}

export function canUpdateArchiveStatus(user, archive) {
  return canEditArchive(user, archive);
}

export function canCreateDisposition(user) {
  return user?.role === "Admin" || user?.role === "Sekretaris" || user?.role === "Inspektur";
}
