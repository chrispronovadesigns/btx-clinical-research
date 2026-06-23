import { defineCollection, z } from 'astro:content';

const settings = defineCollection({
  type: 'data',
  schema: z.object({
    siteName: z.string(),
    tagline: z.string(),
    contact: z.object({
      email: z.string(),
      phone: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
    }),
    social: z.object({
      linkedin: z.string(),
      facebook: z.string(),
      instagram: z.string(),
      twitter: z.string(),
      youtube: z.string(),
    }),
    defaultSeo: z.object({
      metaTitle: z.string(),
      metaDescription: z.string(),
      ogImage: z.string(),
    }),
    googleAnalyticsId: z.string(),
  }),
});

export const collections = { settings };
