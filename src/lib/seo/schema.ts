import { seoConfig } from './config';

export interface SchemaOrganization {
  '@context': 'https://schema.org';
  '@type': 'Organization' | 'LocalBusiness';
  name: string;
  legalName?: string;
  url: string;
  logo: string;
  description?: string;
  foundingDate?: string;
  email?: string;
  telephone?: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  sameAs?: string[];
  areaServed?: string[];
  hasOfferCatalog?: {
    '@type': 'OfferCatalog';
    name: string;
    itemListElement: Array<{
      '@type': 'Offer';
      itemOffered: {
        '@type': 'Service';
        name: string;
      };
    }>;
  };
}

export interface SchemaArticle {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
    url?: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
}

export interface SchemaService {
  '@context': 'https://schema.org';
  '@type': 'Service';
  name: string;
  description: string;
  provider: {
    '@type': 'Organization';
    name: string;
    url: string;
  };
  areaServed?: string[];
  serviceType?: string;
  offers?: {
    '@type': 'Offer';
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
}

export interface SchemaProduct {
  '@context': 'https://schema.org';
  '@type': 'Product' | 'SoftwareApplication';
  name: string;
  description: string;
  image?: string;
  brand?: {
    '@type': 'Organization';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price?: string;
    priceCurrency?: string;
    availability?: string;
    url?: string;
  };
  applicationCategory?: string;
  operatingSystem?: string;
}

export interface SchemaBreadcrumb {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface SchemaFAQ {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export interface SchemaWebPage {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
  isPartOf?: {
    '@type': 'WebSite';
    '@id': string;
  };
}

export interface SchemaReview {
  '@context': 'https://schema.org';
  '@type': 'Review';
  itemReviewed?: {
    '@type': string;
    name: string;
    url?: string;
  };
  reviewBody: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  reviewRating: {
    '@type': 'Rating';
    ratingValue: string;
    bestRating: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
  };
}

export function buildOrganizationSchema(
  overrides?: Partial<SchemaOrganization>
): SchemaOrganization {
  const { organization } = seoConfig;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.name,
    legalName: organization.legalName,
    url: organization.url,
    logo: new URL(organization.logo, seoConfig.siteUrl).href,
    email: organization.email,
    telephone: organization.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: organization.address.streetAddress,
      addressLocality: organization.address.addressLocality,
      addressRegion: organization.address.addressRegion,
      postalCode: organization.address.postalCode,
      addressCountry: organization.address.addressCountry,
    },
    sameAs: [
      organization.social.linkedin,
      organization.social.facebook,
      organization.social.instagram,
    ].filter(Boolean),
    ...overrides,
  };
}

export function buildLocalBusinessSchema(): SchemaOrganization {
  return {
    ...buildOrganizationSchema(),
    '@type': 'LocalBusiness',
    areaServed: [...seoConfig.areaServed],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: seoConfig.services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service,
        },
      })),
    },
  };
}

export function buildArticleSchema(data: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}): SchemaArticle {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.headline,
    description: data.description,
    image: new URL(data.image, seoConfig.siteUrl).href,
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    author: {
      '@type': 'Person',
      name: data.author || seoConfig.organization.name,
    },
    publisher: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
      logo: {
        '@type': 'ImageObject',
        url: new URL(seoConfig.organization.logo, seoConfig.siteUrl).href,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url,
    },
  };
}

export function buildServiceSchema(data: {
  name: string;
  description: string;
  serviceType?: string;
  price?: string;
  priceCurrency?: string;
}): SchemaService {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: data.name,
    description: data.description,
    provider: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
      url: seoConfig.siteUrl,
    },
    areaServed: [...seoConfig.areaServed],
    serviceType: data.serviceType,
    ...(data.price && {
      offers: {
        '@type': 'Offer',
        price: data.price,
        priceCurrency: data.priceCurrency || 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
  };
}

export function buildProductSchema(data: {
  name: string;
  description: string;
  image?: string;
  price?: string;
  priceCurrency?: string;
  url?: string;
  applicationCategory?: string;
}): SchemaProduct {
  return {
    '@context': 'https://schema.org',
    '@type': data.applicationCategory ? 'SoftwareApplication' : 'Product',
    name: data.name,
    description: data.description,
    ...(data.image && { image: new URL(data.image, seoConfig.siteUrl).href }),
    brand: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
    },
    ...(data.price && {
      offers: {
        '@type': 'Offer',
        price: data.price,
        priceCurrency: data.priceCurrency || 'USD',
        availability: 'https://schema.org/InStock',
        ...(data.url && { url: data.url }),
      },
    }),
    ...(data.applicationCategory && { applicationCategory: data.applicationCategory }),
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): SchemaBreadcrumb {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: new URL(item.url, seoConfig.siteUrl).href }),
    })),
  };
}

export function buildFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): SchemaFAQ {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildWebPageSchema(data: {
  name: string;
  description: string;
  url: string;
}): SchemaWebPage {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.name,
    description: data.description,
    url: data.url,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      '@id': seoConfig.siteUrl,
    },
  };
}

export function buildMedicalServiceSchema(data: {
  name: string;
  description: string;
  serviceType?: string;
}): SchemaService {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: data.name,
    description: data.description,
    provider: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
      url: seoConfig.siteUrl,
    },
    areaServed: [...seoConfig.areaServed],
    serviceType: data.serviceType,
    // @ts-ignore — audience is valid on Service per schema.org spec
    audience: {
      '@type': 'Audience',
      audienceType: 'Medical Practices and Healthcare Organizations',
    },
  };
}

export function buildLegalServiceSchema(data: {
  name: string;
  description: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: data.name,
    description: data.description,
    provider: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
      url: seoConfig.siteUrl,
    },
    areaServed: [...seoConfig.areaServed],
  };
}

export function buildReviewSchemas(
  testimonials: Array<{ quote: string; name: string }>,
  itemReviewed?: { '@type': string; name: string; url?: string }
): SchemaReview[] {
  return testimonials.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    ...(itemReviewed && { itemReviewed }),
    reviewBody: t.quote,
    author: {
      '@type': 'Person',
      name: t.name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: '5',
      bestRating: '5',
    },
    publisher: {
      '@type': 'Organization',
      name: seoConfig.organization.name,
    },
  }));
}
