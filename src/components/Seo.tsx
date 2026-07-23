import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
}

const SITE_URL = 'https://lernzeit.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const Seo = ({ title, description, path, image }: SeoProps) => {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="LernZeit" />
      <meta property="og:locale" content="de_DE" />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default Seo;