import { CollectionConfig } from 'payload';

const ImageTags: CollectionConfig = {
  slug: 'image-tags',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'whenType',
      type: 'select',
      label: 'When Type',
      admin: {
        description: 'Type of date information'
      },
      options: [
        {
          label: 'Select an option',
          value: '',
        },
        {
          label: 'Full Date',
          value: 'full_date',
        },
        {
          label: 'Decades',
          value: 'decades',
        },
        {
          label: 'Year',
          value: 'year',
        },
        {
          label: 'Month-Year',
          value: 'month_year',
        },
      ],
      defaultValue: '',
    },
    {
      name: 'whenValue',
      type: 'text',
      label: 'When Value',
      admin: {
        description: 'Value received from frontend form'
      },
    },
    {
      name: 'whenValueConfidence',
      type: 'select',
      label: 'When Value Confidence',
      admin: {
        description: 'How confident are you about this date?'
      },
      options: [
        { label: '1 - Not confident', value: '1' },
        { label: '2 - Somewhat confident', value: '2' },
        { label: '3 - Moderately confident', value: '3' },
        { label: '4 - Very confident', value: '4' },
        { label: '5 - Extremely confident', value: '5' },
      ],
      defaultValue: '3',
    },
    {
      name: 'mediaId',
      type: 'relationship',
      relationTo: 'images',
      required: true,
      label: 'Media',
      admin: {
        description: 'The picture this tag belongs to'
      },
    },
    {
      name: 'personTags',
      type: 'array',
      label: 'Person Tags',
      admin: {
        description: 'Detailed information about people in the picture'
      },
      fields: [
        {
          name: 'personId',
          type: 'relationship',
          relationTo: 'persons',
          required: true,
          label: 'Person',
        },
        {
          name: 'confidence',
          type: 'select',
          label: 'Confidence Level',
          options: [
            { label: '1 - Not confident', value: '1' },
            { label: '2 - Somewhat confident', value: '2' },
            { label: '3 - Moderately confident', value: '3' },
            { label: '4 - Very confident', value: '4' },
            { label: '5 - Extremely confident', value: '5' },
          ],
          defaultValue: '3',
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
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          admin: {
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
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      label: 'Location',
      admin: {
        description: 'Location where the picture was taken'
      },
    },
    {
      name: 'locationConfidence',
      type: 'select',
      label: 'Location Confidence',
      admin: {
        description: 'How confident are you about this location?'
      },
      options: [
        { label: '1 - Not confident', value: '1' },
        { label: '2 - Somewhat confident', value: '2' },
        { label: '3 - Moderately confident', value: '3' },
        { label: '4 - Very confident', value: '4' },
        { label: '5 - Extremely confident', value: '5' },
      ],
      defaultValue: '3',
    },
    {
      name: 'occasion',
      type: 'relationship',
      relationTo: 'occasions',
      label: 'Occasion',
      admin: {
        description: 'Occasion of the picture'
      },
    },
    {
      name: 'occasionConfidence',
      type: 'select',
      label: 'Occasion Confidence',
      admin: {
        description: 'How confident are you about this occasion?'
      },
      options: [
        { label: '1 - Not confident', value: '1' },
        { label: '2 - Somewhat confident', value: '2' },
        { label: '3 - Moderately confident', value: '3' },
        { label: '4 - Very confident', value: '4' },
        { label: '5 - Extremely confident', value: '5' },
      ],
      defaultValue: '3',
    },
    {
      name: 'context',
      type: 'textarea',
      label: 'Context',
      admin: {
        description: 'Any incident or information about the context of the picture'
      },
    },
    {
      name: 'remarks',
      type: 'textarea',
      label: 'Remarks',
      admin: {
        description: 'Any additional remarks about the picture'
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'Tagged',
      options: [
        { label: 'Not Verified', value: 'Not Verified' },
        { label: 'Tagged', value: 'Tagged' },
        { label: 'Verified', value: 'Verified' },
      ],
      admin: {
        description: 'Indicates whether the tag is not verified, just tagged, or has been verified by an admin.'
      }
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation, req }) => {
            if (operation === 'create') {
              if (!req.user) {
                throw new Error('User must be authenticated to create an image tag');
              }
              return req.user.id;
            }
            return value;
          },
        ],
      },
    },
  ],
  timestamps: true, // This will automatically add createdAt and updatedAt fields
};

export default ImageTags; 