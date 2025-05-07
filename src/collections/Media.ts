import type { CollectionConfig } from 'payload'
import { nanoid } from 'nanoid'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
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
  upload: true,
}
