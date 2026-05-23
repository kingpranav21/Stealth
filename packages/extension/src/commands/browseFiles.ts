import { findRemoteFile } from "./findFile";

/** Opens the find-file picker (local index or GitHub code search). */
export async function browseRemoteFiles(): Promise<void> {
  await findRemoteFile();
}
