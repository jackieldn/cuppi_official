// schema.org structured data for the Plans and Compare pages: a machine-readable copy of what the page already says,
// for search engines and AI tools. Pure functions, no imports of values. (The FAQ's own lives in faq-jsonld.ts.)

import type { PlansPrices } from './plans-settings';

type Json = Record<string, unknown>;

type Crumb = { name: string; path?: string };

function breadcrumb(origin: string, trail: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      ...(t.path ? { item: `${origin}${t.path}` } : {}),
    })),
  };
}

/** "£5.99" -> "5.99". The admin types prices as text; anything that is not a plain amount is left out rather than guessed at. */
function amountOf(price: string): string | undefined {
  const m = price.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? m[0] : undefined;
}

function webPage(origin: string, path: string, name: string, description: string, trail: Crumb[], extra: Json = {}): Json[] {
  return [
    { '@id': `${origin}${path}#breadcrumb`, ...breadcrumb(origin, trail) },
    {
      '@type': 'WebPage',
      '@id': `${origin}${path}#page`,
      url: `${origin}${path}`,
      name,
      description,
      inLanguage: 'en-GB',
      isPartOf: { '@type': 'WebSite', name: 'Cuppi', url: origin },
      breadcrumb: { '@id': `${origin}${path}#breadcrumb` },
      ...extra,
    },
  ];
}

/** /plans: the page, plus Cuppi Home as an app with its Free and Pro offers, priced as shown on the page. */
export function buildPlansJsonLd(origin: string, prices: PlansPrices, description: string): Json {
  const monthly = amountOf(prices.monthly);
  const annual = amountOf(prices.annual);
  const offer = (name: string, price: string, unit?: { duration: string; unitCode: string }): Json => ({
    '@type': 'Offer',
    name,
    price,
    priceCurrency: 'GBP',
    availability: 'https://schema.org/InStock',
    ...(unit
      ? { priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'GBP', billingDuration: unit.duration, unitCode: unit.unitCode } }
      : {}),
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...webPage(origin, '/plans', 'Plans', description, [{ name: 'Cuppi', path: '/' }, { name: 'Plans' }], { mainEntity: { '@id': `${origin}/#app` } }),
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#app`,
        name: 'Cuppi Home',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'iOS',
        url: origin,
        offers: [
          offer('Cuppi Free', '0'),
          ...(monthly ? [offer('Cuppi Pro, monthly', monthly, { duration: 'P1M', unitCode: 'MON' })] : []),
          ...(annual ? [offer('Cuppi Pro, annual', annual, { duration: 'P1Y', unitCode: 'ANN' })] : []),
        ],
      },
    ],
  };
}

/** /compare and /compare/snapshots. `checkedOn` is the date the comparison was last checked (an ISO date), when there is one. */
export function buildComparePageJsonLd(
  origin: string,
  page: { path: string; name: string; description: string; checkedOn?: string; parent?: { name: string; path: string } },
): Json {
  const trail: Crumb[] = [{ name: 'Cuppi', path: '/' }, ...(page.parent ? [{ name: page.parent.name, path: page.parent.path }] : []), { name: page.name }];
  return {
    '@context': 'https://schema.org',
    '@graph': webPage(origin, page.path, page.name, page.description, trail, page.checkedOn ? { dateModified: page.checkedOn } : {}),
  };
}

const SITE_DESCRIPTION = 'Cuppi is your calm and private household app where you save information once and get reminded gently forever.';

/** The publisher, as the footer states it. Shared by the home page and every blog post. */
function organisation(origin: string): Json {
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organisation`,
    name: 'Cuppi',
    legalName: 'JackiePoot Creations Ltd',
    url: origin,
    address: { '@type': 'PostalAddress', streetAddress: '124 City Road', addressLocality: 'London', postalCode: 'EC1V 2NX', addressCountry: 'GB' },
  };
}

/** The home page: who makes Cuppi, the site, and what the app is, in one sentence of its own (the page's headline is a rotating promo). */
export function buildHomeJsonLd(origin: string): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organisation(origin),
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: origin, name: 'Cuppi', description: SITE_DESCRIPTION, inLanguage: 'en-GB', publisher: { '@id': `${origin}/#organisation` } },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#app`,
        name: 'Cuppi Home',
        description: SITE_DESCRIPTION,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'iOS',
        url: origin,
        publisher: { '@id': `${origin}/#organisation` },
      },
    ],
  };
}

/** A blog post (The Cosy Corner). `image` is the post's picture, when it has one. */
export function buildBlogPostJsonLd(
  origin: string,
  post: { slug: string; title: string; description?: string; published: string; image?: string },
): Json {
  const path = `/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(origin, [{ name: 'Cuppi', path: '/' }, { name: 'The Cosy Corner', path: '/blog' }, { name: post.title }]),
      {
        '@type': 'BlogPosting',
        '@id': `${origin}${path}#post`,
        mainEntityOfPage: `${origin}${path}`,
        url: `${origin}${path}`,
        headline: post.title,
        ...(post.description ? { description: post.description } : {}),
        datePublished: post.published,
        ...(post.image ? { image: post.image } : {}),
        inLanguage: 'en-GB',
        author: { '@id': `${origin}/#organisation` },
        publisher: organisation(origin),
      },
    ],
  };
}

/** A feature page: the page, under Features, about the Cuppi app. */
export function buildFeaturePageJsonLd(origin: string, feature: { slug: string; name: string; description: string }): Json {
  const path = `/features/${feature.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': webPage(origin, path, feature.name, feature.description, [{ name: 'Cuppi', path: '/' }, { name: 'Features', path: '/features' }, { name: feature.name }], {
      about: { '@id': `${origin}/#app` },
    }),
  };
}
