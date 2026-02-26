// app/api/_lib/s3-json.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

export const s3 = new S3Client({ region: "us-west-1" });

function readableToString(body: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    body.on("data", (chunk: Buffer) => chunks.push(chunk));
    body.on("error", reject);
    body.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function bodyToString(body: unknown): Promise<string> {
  if (body instanceof Readable) return readableToString(body);

  const maybe = body as { transformToString?: () => Promise<string> } | null;
  if (maybe?.transformToString) return maybe.transformToString();

  throw new Error("Unsupported S3 body type");
}

export async function getObjectText(Bucket: string, Key: string): Promise<string> {
  const out = await s3.send(new GetObjectCommand({ Bucket, Key }));
  if (!out.Body) throw new Error(`Empty S3 body for ${Key}`);
  return bodyToString(out.Body);
}

export function isNotFoundError(e: unknown): boolean {
  const name = (e as { name?: unknown })?.name;
  return name === "NoSuchKey" || name === "NotFound";
}