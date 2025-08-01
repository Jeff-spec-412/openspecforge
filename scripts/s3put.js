import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
const [, , file] = process.argv;
if (!file) { console.error("usage: node s3put.js <file>"); process.exit(1); }

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  credentials: { accessKeyId: "osf", secretAccessKey: "osfsecret" },
  forcePathStyle: true
});
const Key = `runs/${Date.now()}-${file.split("/").pop()}`;
await s3.send(new PutObjectCommand({ Bucket: "osf", Key, Body: fs.createReadStream(file) }));
const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: "osf", Key }), { expiresIn: 3600 });
console.log("Signed URL:", url);
