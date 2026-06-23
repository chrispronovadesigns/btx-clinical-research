export const seoConfig = {
  siteName: 'BTX Clinical Research',
  siteUrl: 'https://btxclinicalresearch.com',
  defaultTitle: 'BTX Clinical Research — Innovation & Care',
  defaultDescription:
    'BTX Clinical Research is a clinical research organization and site based in Brownsville, Texas, providing reliable management of clinical trials.',
  defaultImage: '/images/btx-building.jpg',
  twitterHandle: '@btxclinical',

  organization: {
    name: 'BTX Clinical Research',
    legalName: 'BTX Clinical Research',
    url: 'https://btxclinicalresearch.com',
    logo: '/images/btx-logo.png',
    foundingDate: '2020',
    email: 'info@btxclinicalresearch.com',
    phone: '+19562805310',
    address: {
      streetAddress: '704 Paredes Line Rd, Ste F3',
      addressLocality: 'Brownsville',
      addressRegion: 'TX',
      postalCode: '78521',
      addressCountry: 'US',
    },
    social: {
      linkedin: '',
      facebook: '',
      instagram: '',
    },
  },

  services: [
    'Clinical Research',
    'Clinical Trials Management',
    'Patient Recruitment',
    'On-site Laboratory Services',
  ],

  areaServed: ['Brownsville, TX', 'Rio Grande Valley', 'Texas', 'United States'],
} as const;
