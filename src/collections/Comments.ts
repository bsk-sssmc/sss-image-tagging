import type { CollectionConfig } from 'payload'

interface PlainComment {
  id: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
  depth: number;
  commentBy?: string | {
    relationTo: string;
    value: string | {
      id: string;
      displayName: string;
    };
  };
  image?: string;
  parentComment?: string;
}

const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'commentText',
    defaultColumns: ['commentText', 'commentBy', 'createdAt'],
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
      relationTo: ['users', 'admins'],
      required: true,
      hooks: {
        afterRead: [
          ({ value }) => {
            // Ensure the value is properly populated
            if (value && typeof value === 'object' && 'value' in value) {
              const populatedValue = value.value;
              if (populatedValue && typeof populatedValue === 'object' && 'displayName' in populatedValue) {
                return {
                  relationTo: value.relationTo,
                  value: {
                    id: populatedValue.id,
                    displayName: populatedValue.displayName
                  }
                };
              }
            }
            return value;
          }
        ]
      }
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
        position: 'sidebar',
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
      name: 'parentComment',
      type: 'relationship',
      relationTo: 'comments',
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
      async ({ data, req, operation }) => {
        // Ensure user is authenticated for create operations
        if (operation === 'create') {
          if (!req.user) {
            throw new Error('User must be authenticated to create a comment');
          }

          // Set the commentBy field to the current user's ID
          data.commentBy = {
            relationTo: req.user.collection,
            value: req.user.id
          };

          // Set the creation date
          data.createdAt = new Date().toISOString();

          // Calculate depth for replies
          if (data.parentComment) {
            // If this is a reply, fetch the parent comment to get its depth
            const parentId = typeof data.parentComment === 'string' 
              ? data.parentComment 
              : data.parentComment.value;

            if (parentId) {
              const parentComment = await req.payload.findByID({
                collection: 'comments',
                id: parentId,
              });

              if (parentComment) {
                data.depth = (parentComment.depth || 0) + 1;
              } else {
                data.depth = 1; // Fallback if parent not found
              }
            } else {
              data.depth = 1; // Fallback if parent ID not found
            }
          } else {
            data.depth = 0; // Top-level comment
          }
        }

        return data;
      },
    ],
    afterRead: [
      ({ doc }) => {
        // Create a new plain object to avoid any MongoDB-specific properties
        const plainDoc: PlainComment = {
          id: doc.id,
          commentText: doc.commentText,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          depth: doc.depth || 0, // Ensure depth is always a number
        };

        // Handle commentBy field
        if (doc.commentBy) {
          if (typeof doc.commentBy === 'string') {
            plainDoc.commentBy = doc.commentBy;
          } else if (typeof doc.commentBy === 'object') {
            const value = doc.commentBy.value;
            plainDoc.commentBy = {
              relationTo: doc.commentBy.relationTo,
              value: typeof value === 'string' 
                ? value 
                : value && typeof value === 'object' && 'displayName' in value
                  ? { id: value.id, displayName: value.displayName }
                  : value?.id || value
            };
          }
        }

        // Handle image field
        if (doc.image) {
          if (typeof doc.image === 'string') {
            plainDoc.image = doc.image;
          } else if (typeof doc.image === 'object') {
            plainDoc.image = typeof doc.image.value === 'string'
              ? doc.image.value
              : doc.image.value?.id || doc.image.value;
          }
        }

        // Handle parentComment field
        if (doc.parentComment) {
          if (typeof doc.parentComment === 'string') {
            plainDoc.parentComment = doc.parentComment; // Unpopulated string ID
          } else if (typeof doc.parentComment === 'object' && 'id' in doc.parentComment && typeof doc.parentComment.id === 'string') {
             // Populated object with an 'id' property
             plainDoc.parentComment = doc.parentComment.id;
          }
        }

        return plainDoc;
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