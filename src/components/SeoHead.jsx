import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ital-truck.com.ua';
const LOGO_URL = `${SITE_URL}/logo.jpg`;
const MAPS_URL = 'https://maps.app.goo.gl/mw4fVkobK3tsrpQ88';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'AutoRepair',
  name: 'Сервісний центр Італ Трак',
  description:
    'Сервісний центр Iveco в Україні — ремонт, технічне обслуговування та діагностика вантажних автомобілів Daily, S-Way, X-Way, Stralis, Eurocargo.',
  url: SITE_URL,
  logo: LOGO_URL,
  image: LOGO_URL,
  telephone: ['+380955950777', '+380675950777', '+380973950777'],
  priceRange: '₴₴',
  currenciesAccepted: 'UAH',
  paymentAccepted: 'Cash, Bank Transfer',
  areaServed: {
    '@type': 'Country',
    name: 'Ukraine',
  },
  hasMap: MAPS_URL,
  sameAs: [MAPS_URL],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:30',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '09:00',
      closes: '15:00',
    },
  ],
  makesOffer: [
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Технічне обслуговування Iveco' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Діагностика двигуна' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Ремонт ходової частини' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Кузовний ремонт' } },
  ],
};

export default function SeoHead() {
  const title = 'Сервісний центр Iveco в Україні | Італ Трак';
  const description =
    'Сервіс Iveco — ремонт, ТО та діагностика вантажівок Daily, S-Way, X-Way, Stralis, Eurocargo. Досвід 15+ років. Дзвоніть: +380 95 595 0777';

  return (
    <Helmet>
      {/* ── Основні теги ── */}
      <html lang="uk" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="сервіс Iveco Україна, ремонт Iveco, ТО вантажівок, Daily S-Way X-Way Stralis, автосервіс вантажних авто" />
      <link rel="canonical" href={SITE_URL} />

      {/* ── Open Graph (Facebook, Telegram, Viber preview) ── */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={LOGO_URL} />
      <meta property="og:image:width" content="400" />
      <meta property="og:image:height" content="400" />
      <meta property="og:locale" content="uk_UA" />
      <meta property="og:site_name" content="Італ Трак" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={LOGO_URL} />

      {/* ── JSON-LD Structured Data ── */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
