import type { CollectionConfig } from 'payload'

export const GeneralUsers: CollectionConfig = {
  slug: 'general-users',
  admin: {
    useAsTitle: 'displayName',
    group: 'Users',
    description: 'Frontend application users',
  },
  auth: {
    tokenExpiration: 7200, // 2 hours
    verify: false, // Don't require email verification
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
    admin: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
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
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
      ],
      admin: {
        description: 'User role for frontend access',
        readOnly: true,
      },
    },
  ],
} 