import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kobo-rits.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KOBO【非公式】 | 立命館大学',
    template: '%s | KOBO【非公式】',
  },
  description:
    '立命館大学OIC（大阪いばらきキャンパス）KOBO【非公式】- 3Dプリント・デジタルファブリケーションの情報サイト。FlashPrintやOrca Slicerの使い方、3Dモデリングなどの技術情報を提供。',
  authors: [{ name: 'KOBO【非公式】' }],
  keywords: [
    'KOBO',
    '立命館大学',
    '立命館',
    'OIC',
    '大阪いばらきキャンパス',
    '大阪茨木キャンパス',
    'Ritsumeikan University',
    'Osaka Ibaraki Campus',
    '3D Printing',
    '3Dプリント',
    '3Dプリンター',
    'Digital Fabrication',
    'デジタルファブリケーション',
    'Flashforge',
    'FlashPrint',
    'Orca Slicer',
    'Adventurer 5M Pro',
    'ものづくり',
    'ファブリケーション',
    'メイカースペース',
    '非公式',
    '学生サイト',
  ],
  openGraph: {
    title: 'KOBO【非公式】 | 立命館大学OIC',
    description:
      '立命館大学OIC（大阪いばらきキャンパス）KOBO【非公式】- 3Dプリント・デジタルファブリケーションの情報サイト',
    url: SITE_URL,
    siteName: 'KOBO【非公式】',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KOBO【非公式】 | 立命館大学OIC',
    description:
      '立命館大学OIC（大阪いばらきキャンパス）KOBO【非公式】- 3Dプリント・デジタルファブリケーションの情報サイト',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: 'ZDKD7epdSCSsAka9gbtuUxsMqcFoU65ciK9QatLodss',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// 構造化データ（JSON-LD）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'KOBO【非公式】',
  alternateName: [
    '立命館大学KOBO',
    '立命館 KOBO',
    'Ritsumeikan KOBO',
    'OIC KOBO',
    '大阪いばらきキャンパス KOBO',
    '立命館大学 OIC KOBO',
  ],
  url: SITE_URL,
  description:
    '立命館大学OIC（大阪いばらきキャンパス）KOBO【非公式】- 3Dプリント・デジタルファブリケーションの情報サイト',
  publisher: {
    '@type': 'Organization',
    name: 'KOBO【非公式】',
    url: SITE_URL,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/articles?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja'>
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
