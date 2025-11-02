import archiver from "archiver";
import { PassThrough } from "node:stream";

export async function zipDirectoryToBuffer(directory: string): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  const passthrough = new PassThrough();

  const completion = new Promise<void>((resolve, reject) => {
    archive.on("error", reject);
    passthrough.on("error", reject);
    passthrough.on("end", () => resolve());
  });

  passthrough.on("data", (chunk) => {
    chunks.push(chunk as Buffer);
  });

  archive.directory(directory, false);
  archive.pipe(passthrough);
  void archive.finalize();

  await completion;

  return Buffer.concat(chunks);
}
