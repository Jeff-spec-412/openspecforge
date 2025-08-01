import 'dotenv/config'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'

// usage guard
const [, , file] = process.argv
if (!file) {
  console.error('usage: node scripts/s3put.js <file>')
  process.exit(1)
}

// build S3 client from .env
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
})

const bucketName = process.env.S3_BUCKET
const key = `runs/${Date.now()}-${file.split('/').pop()}`

// upload
await s3.send(new PutObjectCommand({
  Bucket: bucketName,
  Key: key,
  Body: fs.createReadStream(file)
}))

// get signed URL
const url = await getSignedUrl(
  s3,
  new PutObjectCommand({ Bucket: bucketName, Key: key }),
  { expiresIn: parseInt(process.env.SIGNED_URL_TTL, 10) }
)

console.log('Signed URL:', url)

