import {
  moveLegacyToBackup,
  readLegacyV1,
  readManifest,
  writeCurrentProjectId,
  writeManifest,
  writeProject,
} from "./storage";

export function runMigrationIfNeeded(): void {
  if (readManifest()) return;
  const legacy = readLegacyV1();
  if (!legacy) return;
  const id = crypto.randomUUID();
  const now = Date.now();
  writeProject(id, legacy);
  writeManifest({
    version: 2,
    projects: [
      {
        id,
        name: "My Seating Chart",
        createdAt: now,
        updatedAt: now,
        guestCount: legacy.guests.length,
        tableCount: legacy.tables.length,
      },
    ],
  });
  writeCurrentProjectId(id);
  moveLegacyToBackup();
}
