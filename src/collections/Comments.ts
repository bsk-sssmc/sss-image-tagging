import type { CollectionConfig } from 'payload'

const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'commentText',
    defaultColumns: ['commentText', 'commentBy', 'createdAt', 'commentUpvotes', 'commentDownvotes'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'commentText',
      type: 'text',
      required: true,
      maxLength: 500,
    },
    {
      name: 'commentBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ operation }) => {
            if (operation === 'create') {
              return new Date().toISOString();
            }
            return undefined;
          },
        ],
      },
    },
    {
      name: 'commentUpvotes',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'commentDownvotes',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'userVote',
      type: 'select',
      options: [
        { label: 'Upvote', value: 'upvote' },
        { label: 'Downvote', value: 'downvote' },
      ],
      admin: {
        description: 'The current user\'s vote on this comment',
      },
    },
    {
      name: 'parentComment',
      type: 'relationship',
      relationTo: ['comments'],
      hasMany: false,
      admin: {
        description: 'If this is a reply, link to the parent comment',
      },
    },
    {
      name: 'depth',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Depth of the comment in the reply tree (0 for top-level comments)',
      },
    },
  ],
  indexes: [
    {
      fields: ['parentComment'],
    },
    {
      fields: ['commentBy'],
    },
    {
      fields: ['createdAt'],
    },
    {
      fields: ['image'],
    },
  ],
};

export default Comments; 