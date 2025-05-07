import { CollectionConfig } from 'payload/types';

const ImageTags: CollectionConfig = {
  slug: 'image-tags',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'whenType',
      type: 'select',
      label: 'When Type',
      description: 'Type of date information',
      options: [
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
      required: true,
    },
    {
      name: 'whenValue',
      type: 'text',
      label: 'When Value',
      description: 'Value received from frontend form',
      required: true,
    },
    {
      name: 'mediaId',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      label: 'Media',
      description: 'The picture this tag belongs to',
    },
    {
      name: 'persons',
      type: 'relationship',
      relationTo: 'persons',
      hasMany: true,
      label: 'Persons',
      description: 'People present in the picture',
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      label: 'Location',
      description: 'Location where the picture was taken',
    },
    {
      name: 'occasion',
      type: 'relationship',
      relationTo: 'occasions',
      label: 'Occasion',
      description: 'Occasion of the picture',
    },
    {
      name: 'context',
      type: 'textarea',
      label: 'Context',
      description: 'Any incident or information about the context of the picture',
    },
    {
      name: 'remarks',
      type: 'textarea',
      label: 'Remarks',
      description: 'Any additional remarks about the picture',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true, // This will automatically add createdAt and updatedAt fields
};

export default ImageTags; 