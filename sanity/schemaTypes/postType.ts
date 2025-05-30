import { DocumentTextIcon } from '@sanity/icons';
import { defineArrayMember, defineField, defineType } from 'sanity';

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: {type: 'author'},
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'category' }]
        }
      ]
    }),  
    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
      validation: Rule => Rule.required().max(200),
    }),  
    defineField({
      name: 'publishedAt',
      type: 'datetime',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
    }),

    // ✅ New field: Approved flag
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'pending',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Approved', value: 'approved' },
          { title: 'Rejected', value: 'rejected' },
        ],
        layout: 'radio',
      },
    }),
    
    defineField({
      name: 'rejectionReason',
      title: 'Rejection Reason',
      type: 'text',
      hidden: ({ parent }) => parent?.status !== 'rejected',  // Only show if rejected
    }),    

    // ✅ New field: Created At (manual since publishedAt may differ)
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),  // Set default to current time on creation
    }),    

    // ✅ Likes (array of user IDs)
    defineField({
      name: 'likes',
      title: 'Likes',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'userId',
              title: 'User ID',
              type: 'string',
              description: 'Anonymous user identifier or authenticated user ID'
            },
            {
              name: 'timestamp',
              title: 'Timestamp',
              type: 'datetime',
              initialValue: () => new Date().toISOString()
            },
            {
              name: 'ipAddress',
              title: 'IP Address',
              type: 'string',
              description: 'For preventing spam (optional)'
            }
          ]
        }
      ]
    }),
    
    defineField({
      name: 'likeCount',
      title: 'Like Count',
      type: 'number',
      initialValue: 0,
      description: 'Cached like count for performance'
    }),

    // ✅ Comments (array of objects)
    defineField({
      name: 'comments',
      title: 'Comments',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'userId', type: 'string', title: 'User ID' },
            { name: 'text', type: 'text', title: 'Comment Text' },
            { name: 'createdAt', type: 'datetime', title: 'Posted At' },
            {
              name: 'likes',
              type: 'array',
              of: [{ type: 'string' }],
            },
          ],
        }),
      ],
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const { author } = selection;
      return {
        ...selection,
        subtitle: author && `by ${author}`,
      };
    },
  },
});