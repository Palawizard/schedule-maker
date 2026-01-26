import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
const maxUploadBytes = 6 * 1024 * 1024;

const getSafeExtension = (file: File) => {
  const name = file.name.toLowerCase();
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const type = file.type.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "";
};

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return new Response("Invalid file type", { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return new Response("File too large", { status: 413 });
  }

  const extension = getSafeExtension(file);
  const filename = extension
    ? `${crypto.randomUUID()}.${extension}`
    : crypto.randomUUID();

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), buffer);

  return Response.json({ url: `/uploads/${filename}` });
}
