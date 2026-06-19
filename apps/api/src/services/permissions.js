const GLOBAL_ARCHIVE_ROLES = new Set(["Admin", "Inspektur", "Sekretaris"]);
const UNIT_EDIT_ROLES = new Set(["Sub Bag", "Irban Wilayah"]);

export function canViewArchive() {
  return true;
}

export function canDownloadArchive() {
  return true;
}

export function canEditArchive(user, archive) {
  if (!user || !archive) return false;
  if (GLOBAL_ARCHIVE_ROLES.has(user.role)) return true;
  return UNIT_EDIT_ROLES.has(user.role) && Number(user?.unitId) === Number(archive?.unit_id);
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

export function canChooseArchiveUnit(user) {
  return user?.role === "Admin";
}
