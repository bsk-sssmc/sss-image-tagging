import type { CollectionConfig } from 'payload'
import { nanoid } from 'nanoid'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  upload: {
    // disableLocalStorage: true,
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
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
    staticDir: 'media',
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
      name: 'alt',
      type: 'text',
    },
  ],
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'createdAt'],
    group: 'Media',
    enableRichTextRelationship: true,
    enableRichTextLink: true,
    description: 'Upload and manage media files',
    listSearchableFields: ['filename', 'alt'],
    pagination: {
      defaultLimit: 50,
    },
  },
}
