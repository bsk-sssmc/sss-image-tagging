import type { CollectionConfig } from 'payload'

const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'commentText',
    defaultColumns: ['commentText', 'commentBy', 'createdAt', 'commentUpvotes'],
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
      hooks: {
        beforeChange: [
          ({ value, operation, req }) => {
            if (operation === 'create') {
              if (!req.user) {
                throw new Error('User must be authenticated to create a comment');
              }
              return req.user.id;
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'images',
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
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // Ensure user is authenticated for create operations
        if (operation === 'create' && !req.user) {
          throw new Error('User must be authenticated to create a comment');
        }

        // Set the commentBy field to the current user's ID
        if (operation === 'create') {
          data.commentBy = req.user.id;
        }

        // Set createdAt for new comments
        if (operation === 'create') {
          data.createdAt = new Date().toISOString();
        }

        // Calculate depth for replies
        if (data.parentComment) {
          data.depth = 1; // For direct replies
        } else {
          data.depth = 0; // For top-level comments
        }

        return data;
      },
    ],
  },
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