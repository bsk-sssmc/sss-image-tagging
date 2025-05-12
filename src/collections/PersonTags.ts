import { CollectionConfig } from 'payload/types';

const PersonTags: CollectionConfig = {
  slug: 'person-tags',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['mediaId', 'personId', 'confidence', 'createdAt'],
    group: 'Tagging',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'mediaId',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      label: 'Media',
      description: 'The picture this person tag belongs to',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'personId',
      type: 'relationship',
      relationTo: 'persons',
      required: true,
      label: 'Person',
      description: 'The person being tagged',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'confidence',
      type: 'select',
      label: 'Confidence Level',
      description: 'How confident are you about this person tag?',
      options: [
        { label: '1 - Not confident', value: '1' },
        { label: '2 - Somewhat confident', value: '2' },
        { label: '3 - Moderately confident', value: '3' },
        { label: '4 - Very confident', value: '4' },
        { label: '5 - Extremely confident', value: '5' },
      ],
      defaultValue: '3',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'coordinates',
      type: 'group',
      fields: [
        {
          name: 'x',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          admin: {
            step: 1,
          },
        },
        {
          name: 'y',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          admin: {
            step: 1,
          },
        }
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation, req }) => {
            if (operation === 'create') {
              if (!req.user) {
                throw new Error('User must be authenticated to create a person tag');
              }
              return req.user.id;
            }
            return value;
          },
        ],
      },
    },
  ],
  timestamps: true,
};

export default PersonTags; 