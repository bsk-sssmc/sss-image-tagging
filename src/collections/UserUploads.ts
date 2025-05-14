import type { CollectionConfig } from 'payload'
import { nanoid } from 'nanoid'

export const UserUploads: CollectionConfig = {
  slug: 'user-uploads',
  admin: {
    useAsTitle: 'fileName',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false, // Users can't update their uploads
    delete: () => false, // Users can't delete their uploads
  },
  upload: {
    disableLocalStorage: true,
    staticDir: 'user-uploads',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
    ],
    formatOptions: {
      format: 'webp',
      options: {
        effort: 6,
      },
    },
  },
  fields: [
    {
      name: 'fileName',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'fileSize',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'fileType',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  timestamps: true, // This will automatically add createdAt and updatedAt fields
} 