import type { CollectionConfig } from 'payload'
import { nanoid } from 'nanoid'

export const Images: CollectionConfig = {
  slug: 'images',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  upload: {
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
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'location',
          type: 'text',
        },
        {
          name: 'occasion',
          type: 'text',
        },
        {
          name: 'whenType',
          type: 'text',
        },
        {
          name: 'whenValue',
          type: 'text',
        },
        {
          name: 'context',
          type: 'text',
        },
        {
          name: 'personTags',
          type: 'array',
          fields: [
            {
              name: 'personId',
              type: 'text',
              required: true,
            },
            {
              name: 'confidence',
              type: 'text',
            },
            {
              name: 'coordinates',
              type: 'group',
              fields: [
                {
                  name: 'x',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'y',
                  type: 'number',
                  required: true,
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'createdAt'],
    enableRichTextRelationship: true,
    enableRichTextLink: true,
    description: 'Upload and manage media files',
  },
} 