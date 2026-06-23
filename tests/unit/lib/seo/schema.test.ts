import { describe, it, expect } from 'vitest';
import {
  buildOrganizationSchema,
  buildLocalBusinessSchema,
  buildArticleSchema,
  buildServiceSchema,
  buildProductSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildWebPageSchema,
  buildReviewSchemas,
} from '@/lib/seo/schema';

describe('SEO Schema Builders', () => {
  it('buildOrganizationSchema returns valid schema', () => {
    const schema = buildOrganizationSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBeDefined();
    expect(schema.url).toBeDefined();
    expect(schema.logo).toBeDefined();
    expect(schema.email).toBeDefined();
    expect(schema.telephone).toBeDefined();
    expect(schema.address).toBeDefined();
    expect(schema.sameAs).toBeInstanceOf(Array);
  });

  it('buildLocalBusinessSchema extends Organization with business data', () => {
    const schema = buildLocalBusinessSchema();
    expect(schema['@type']).toBe('LocalBusiness');
    expect(schema.areaServed).toBeInstanceOf(Array);
    expect(schema.hasOfferCatalog).toBeDefined();
    expect(schema.hasOfferCatalog?.itemListElement).toBeInstanceOf(Array);
  });

  it('buildArticleSchema returns BlogPosting schema', () => {
    const schema = buildArticleSchema({
      headline: 'Test Article',
      description: 'Test description',
      image: '/images/test.jpg',
      datePublished: '2024-01-01',
      url: '/blog/test/',
    });
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema.headline).toBe('Test Article');
    expect(schema.image).toContain('https://');
    expect(schema.author).toBeDefined();
    expect(schema.publisher).toBeDefined();
    expect(schema.mainEntityOfPage).toBeDefined();
  });

  it('buildServiceSchema returns Service schema', () => {
    const schema = buildServiceSchema({
      name: 'Web Development',
      description: 'Custom web development services',
      price: '5000',
    });
    expect(schema['@type']).toBe('Service');
    expect(schema.provider).toBeDefined();
    expect(schema.offers?.price).toBe('5000');
    expect(schema.offers?.priceCurrency).toBe('USD');
  });

  it('buildProductSchema returns SoftwareApplication when category provided', () => {
    const schema = buildProductSchema({
      name: 'Test App',
      description: 'A test application',
      applicationCategory: 'BusinessApplication',
    });
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.applicationCategory).toBe('BusinessApplication');
  });

  it('buildBreadcrumbSchema returns BreadcrumbList', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services/' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
  });

  it('buildFAQSchema returns FAQPage', () => {
    const schema = buildFAQSchema([
      { question: 'What?', answer: 'This.' },
    ]);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
  });

  it('buildWebPageSchema returns WebPage', () => {
    const schema = buildWebPageSchema({
      name: 'Homepage',
      description: 'Welcome to your site',
      url: 'https://example.com/',
    });
    expect(schema['@type']).toBe('WebPage');
    expect(schema.inLanguage).toBeDefined();
  });

  it('buildReviewSchemas returns array of Review schemas', () => {
    const reviews = [
      { name: 'Client A', quote: 'Great work' },
      { name: 'Client B', quote: 'Amazing service' },
    ];
    const schemas = buildReviewSchemas(reviews, { '@type': 'Organization', name: 'Your Organization' });
    expect(schemas).toHaveLength(2);
    expect(schemas[0]['@type']).toBe('Review');
    expect(schemas[0].reviewBody).toBe('Great work');
    expect(schemas[1].reviewBody).toBe('Amazing service');
    expect(schemas[0].reviewRating.ratingValue).toBe('5');
    expect(schemas[0].itemReviewed).toBeDefined();
  });
});
