import { mkdir, writeFile, access, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeFileRecursive(
  filePath: string,
  contents: string,
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, contents, "utf8");
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function resolveFromRoot(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

export async function calculateDirectorySize(targetPath: string): Promise<number> {
  const stats = await stat(targetPath);

  if (!stats.isDirectory()) {
    return stats.size;
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      total += await calculateDirectorySize(entryPath);
    } else {
      const fileStats = await stat(entryPath);
      total += fileStats.size;
    }
  }

  return total;
}
