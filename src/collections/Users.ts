import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'displayName',
    group: 'Users',
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
      label: 'Display Name',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    // Add more fields as needed
  ],
}
