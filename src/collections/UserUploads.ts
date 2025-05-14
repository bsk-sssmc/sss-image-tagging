import type { CollectionConfig } from 'payload'
import { nanoid } from 'nanoid'

export const UserUploads: CollectionConfig = {
  slug: 'user-uploads',
  access: {
    read: () => true,
  },
  upload: {
    disableLocalStorage: true,
    staticDir: 'sss-image-tagging-user-uploads',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
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
      name: 'mediaId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) {
              return nanoid(10)
            }
            return value
          },
        ],
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
      hooks: {
        beforeChange: [
          ({ value, operation, req }) => {
            if (operation === 'create') {
              return req.user?.id || null
            }
            return value
          },
        ],
      },
    },
    {
      name: 'alt',
      type: 'text',
    },
  ],
} 