// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import type { PayloadHandler } from 'payload'
import type { Request, Response, NextFunction } from 'express'
import type { PayloadRequest } from 'payload'

import { s3Storage } from '@payloadcms/storage-s3';

import { Users } from './collections/Users'
import { Images } from './collections/Images'
import { Locations } from './collections/Locations'
import { Occasions } from './collections/Occasions'
import { Persons } from './collections/Persons'
import ImageTags from './collections/ImageTags'
import { Albums } from './collections/Albums'
import Comments from './collections/Comments'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  auth: {
    jwtOrder: ['Bearer', 'cookie', 'JWT'],
  },
  collections: [Users, Images, Occasions, Locations, Persons, ImageTags, Albums, Comments],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  endpoints: [
    {
      path: '/random-image',
      method: 'get',
      handler: async (req) => {
        try {
          const { docs } = await req.payload.find({
            collection: 'images',
            limit: 1000,
          });

          if (docs.length === 0) {
            return Response.json({ error: 'No images found' }, { status: 404 });
          }

          const randomIndex = Math.floor(Math.random() * docs.length);
          return Response.json(docs[randomIndex]);
        } catch (error) {
          console.error('Error fetching random image:', error);
          return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
      },
    },
    {
      path: '/media-access',
      method: 'post',
      handler: async (req) => {
        return Response.json({ access: true });
      },
    },
  ],
  plugins: [
    payloadCloudPlugin(),
    s3Storage({
      collections: {
        images: {
          disableLocalStorage: false,
          generateFileURL: ({ filename }: { filename: string }) => {
            return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/images/${filename}`
          },
          prefix: 'images/',
        },
      },
      bucket: process.env.S3_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        region: process.env.S3_REGION!,
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        maxAttempts: 3,
      },
    }),
  ],
})
