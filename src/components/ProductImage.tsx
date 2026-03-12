import React, { useEffect, useState } from 'react';

type ProductImageLike = {
  id?: number | string;
  productId?: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  fabric?: string;
  color?: string;
  image?: string;
  image_url?: string;
};

type ProductImageProps = {
  product: ProductImageLike;
  alt?: string;
  className?: string;
};

type Palette = {
  background: string;
  card: string;
  shadow: string;
  primary: string;
  secondary: string;
  accent: string;
  detail: string;
  text: string;
  muted: string;
};

const palettes: Palette[] = [
  {
    background: '#fbf7f2',
    card: '#fffdf9',
    shadow: '#eadccf',
    primary: '#a61b46',
    secondary: '#f3b6bf',
    accent: '#d1863c',
    detail: '#fce8d4',
    text: '#2f1d1d',
    muted: '#826d67',
  },
  {
    background: '#f4f8fc',
    card: '#ffffff',
    shadow: '#dce5ef',
    primary: '#24539b',
    secondary: '#9ec1f0',
    accent: '#d7a441',
    detail: '#eef5ff',
    text: '#1d2d4b',
    muted: '#66758f',
  },
  {
    background: '#f8f5fd',
    card: '#ffffff',
    shadow: '#e4dbf4',
    primary: '#6d35a3',
    secondary: '#cdb4ef',
    accent: '#e59a52',
    detail: '#f3ebff',
    text: '#302047',
    muted: '#75658b',
  },
  {
    background: '#f3faf7',
    card: '#fefffe',
    shadow: '#d8eadf',
    primary: '#17795c',
    secondary: '#9fd7b7',
    accent: '#d2a437',
    detail: '#e9f8f0',
    text: '#1d3a31',
    muted: '#6a8277',
  },
  {
    background: '#fff7f2',
    card: '#ffffff',
    shadow: '#f0ddd0',
    primary: '#b85a23',
    secondary: '#f0be97',
    accent: '#7a2443',
    detail: '#fff1e7',
    text: '#3f281d',
    muted: '#8d7364',
  },
  {
    background: '#f4f5f7',
    card: '#ffffff',
    shadow: '#dfe3e9',
    primary: '#374151',
    secondary: '#b7c0cd',
    accent: '#d4a94e',
    detail: '#f8fafc',
    text: '#1f2937',
    muted: '#6b7280',
  },
];

const colorKeywords: Array<{ matches: string[]; paletteIndex: number }> = [
  { matches: ['red', 'ruby', 'crimson', 'maroon', 'wine', 'magenta', 'pink', 'rose'], paletteIndex: 0 },
  { matches: ['blue', 'navy', 'indigo', 'peacock', 'sky', 'aqua'], paletteIndex: 1 },
  { matches: ['purple', 'lilac', 'lavender', 'plum', 'mauve'], paletteIndex: 2 },
  { matches: ['green', 'emerald', 'olive', 'mint', 'sage', 'teal', 'bottle'], paletteIndex: 3 },
  { matches: ['gold', 'amber', 'mustard', 'saffron', 'copper', 'peach', 'orange'], paletteIndex: 4 },
  { matches: ['black', 'white', 'ivory', 'silver', 'grey', 'gray', 'beige', 'taupe', 'stone', 'mocha'], paletteIndex: 5 },
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const clipText = (value: string, limit: number) => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trim()}...`;
};

const hashSeed = (value: string) =>
  Array.from(value).reduce((total, character, index) => total + character.charCodeAt(0) * (index + 1), 0);

const getResolvedCategory = (product: ProductImageLike) => {
  if (product.category) return product.category;
  const text = `${product.name || product.title || ''} ${product.subcategory || ''}`.toLowerCase();
  if (text.includes('blouse')) return 'Blouses';
  if (text.includes('kurta set') || text.includes(' set')) return 'Kurta Sets';
  if (text.includes('dress')) return 'Dresses';
  if (text.includes('kurta')) return 'Kurtas';
  return 'Sarees';
};

const getLookupText = (product: ProductImageLike) =>
  [
    product.productId,
    product.name,
    product.title,
    product.description,
    product.category,
    product.subcategory,
    product.fabric,
    product.color,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getPalette = (product: ProductImageLike, seed: number) => {
  const lookup = getLookupText(product);
  const colorMatch = colorKeywords.find((entry) => entry.matches.some((token) => lookup.includes(token)));
  if (colorMatch) return palettes[colorMatch.paletteIndex];
  return palettes[seed % palettes.length];
};

const splitTitle = (value: string) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 20) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return [clipText(lines[0] || value, 20), clipText(lines[1] || '', 20)].filter(Boolean);
};

const renderPattern = (seed: number, palette: Palette, x: number, y: number, width: number, height: number) => {
  const variant = seed % 5;
  const parts: string[] = [];

  if (variant === 0) {
    for (let stripe = 0; stripe < 6; stripe += 1) {
      const offset = x + 16 + stripe * ((width - 32) / 6);
      parts.push(
        `<rect x="${offset.toFixed(1)}" y="${y + 10}" width="${Math.max(8, width / 22).toFixed(1)}" height="${height - 20}" rx="6" fill="${palette.secondary}" opacity="${0.45 + stripe * 0.05}" />`
      );
    }
  } else if (variant === 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cx = x + 28 + col * ((width - 56) / 3);
        const cy = y + 24 + row * ((height - 48) / 3);
        parts.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(7, width / 28).toFixed(1)}" fill="${palette.detail}" opacity="0.85" />`
        );
      }
    }
  } else if (variant === 2) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const cx = x + 36 + col * ((width - 72) / 2);
        const cy = y + 32 + row * ((height - 64) / 2);
        const size = Math.max(11, width / 20);
        parts.push(
          `<path d="M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z" fill="${palette.secondary}" opacity="0.6" />`
        );
      }
    }
  } else if (variant === 3) {
    for (let row = 0; row < 4; row += 1) {
      const cy = y + 24 + row * ((height - 48) / 3);
      parts.push(
        `<path d="M ${x + 22} ${cy} C ${x + width * 0.28} ${cy - 12}, ${x + width * 0.42} ${cy + 12}, ${x + width * 0.54} ${cy} S ${x + width * 0.8} ${cy - 12}, ${x + width - 22} ${cy}" stroke="${palette.detail}" stroke-width="7" fill="none" opacity="0.85" />`
      );
    }
  } else {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const cx = x + 38 + col * ((width - 76) / 2);
        const cy = y + 32 + row * ((height - 64) / 2);
        const r = Math.max(9, width / 24);
        parts.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${palette.secondary}" opacity="0.55" /><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r / 2.4).toFixed(1)}" fill="${palette.detail}" opacity="0.9" />`
        );
      }
    }
  }

  return parts.join('');
};

const renderSareeProduct = (seed: number, palette: Palette) => {
  const mainRotation = -10 + (seed % 9);
  const foldedRotation = 5 + (seed % 7);
  const accentBand = 22 + (seed % 16);

  return `
    <ellipse cx="452" cy="700" rx="250" ry="78" fill="${palette.shadow}" opacity="0.35" />
    <g transform="rotate(${mainRotation} 450 500)">
      <rect x="198" y="280" width="420" height="320" rx="28" fill="${palette.primary}" />
      <rect x="198" y="536" width="420" height="${accentBand}" fill="${palette.accent}" />
      ${renderPattern(seed, palette, 218, 308, 380, 198)}
      <rect x="230" y="318" width="356" height="14" rx="7" fill="${palette.detail}" opacity="0.7" />
      <rect x="230" y="350" width="330" height="10" rx="5" fill="${palette.detail}" opacity="0.52" />
    </g>
    <g transform="rotate(${foldedRotation} 450 500)">
      <rect x="312" y="206" width="260" height="180" rx="24" fill="${palette.primary}" />
      <rect x="312" y="346" width="260" height="${Math.max(18, accentBand - 4)}" fill="${palette.accent}" />
      ${renderPattern(seed + 11, palette, 330, 228, 224, 96)}
    </g>
    <g transform="translate(${614 + (seed % 12)} ${548 + (seed % 10)})">
      <rect x="0" y="0" width="18" height="82" rx="8" fill="${palette.accent}" />
      <rect x="26" y="-6" width="18" height="88" rx="8" fill="${palette.secondary}" />
      <rect x="52" y="4" width="18" height="74" rx="8" fill="${palette.detail}" />
    </g>
  `;
};

const renderBlouseProduct = (seed: number, palette: Palette) => {
  const neckWidth = 56 + (seed % 24);
  const sleeveLift = 18 + (seed % 12);

  return `
    <ellipse cx="450" cy="708" rx="216" ry="70" fill="${palette.shadow}" opacity="0.34" />
    <path d="M 330 340 C 356 294 394 266 450 266 C 506 266 544 294 570 340 L 650 390 L 624 446 L 560 418 L 560 618 C 560 640 542 658 520 658 L 380 658 C 358 658 340 640 340 618 L 340 418 L 276 446 L 250 390 Z" fill="${palette.primary}" />
    <path d="M ${450 - neckWidth / 2} 286 C 434 328, 466 328, ${450 + neckWidth / 2} 286" stroke="${palette.detail}" stroke-width="18" fill="none" stroke-linecap="round" />
    <path d="M 340 438 L 560 438" stroke="${palette.accent}" stroke-width="18" />
    <path d="M 292 ${410 - sleeveLift} L 344 434 L 328 516 L 276 474 Z" fill="${palette.secondary}" opacity="0.88" />
    <path d="M 608 ${410 - sleeveLift} L 556 434 L 572 516 L 624 474 Z" fill="${palette.secondary}" opacity="0.88" />
    ${renderPattern(seed + 7, palette, 370, 470, 160, 126)}
    <rect x="394" y="620" width="112" height="22" rx="11" fill="${palette.accent}" opacity="0.78" />
  `;
};

const renderKurtaProduct = (seed: number, palette: Palette) => {
  const hemCurve = 24 + (seed % 18);

  return `
    <ellipse cx="450" cy="720" rx="226" ry="72" fill="${palette.shadow}" opacity="0.34" />
    <path d="M 404 236 L 496 236 L 516 276 L 598 332 L 568 388 L 522 364 L 522 728 C 522 766 492 796 454 796 L 446 796 C 408 796 378 766 378 728 L 378 364 L 332 388 L 302 332 L 384 276 Z" fill="${palette.primary}" />
    <path d="M 450 252 L 450 724" stroke="${palette.detail}" stroke-width="14" stroke-linecap="round" />
    <rect x="426" y="286" width="48" height="114" rx="18" fill="${palette.accent}" opacity="0.92" />
    <path d="M 378 720 Q 450 ${770 + hemCurve} 522 720" fill="${palette.secondary}" opacity="0.85" />
    <rect x="392" y="738" width="20" height="62" rx="10" fill="${palette.secondary}" />
    <rect x="488" y="738" width="20" height="62" rx="10" fill="${palette.secondary}" />
    ${renderPattern(seed + 13, palette, 392, 430, 116, 208)}
    <path d="M 402 214 L 450 176 L 498 214" stroke="${palette.muted}" stroke-width="14" stroke-linecap="round" fill="none" />
    <path d="M 450 176 L 450 218" stroke="${palette.muted}" stroke-width="14" stroke-linecap="round" />
  `;
};

const renderDressProduct = (seed: number, palette: Palette) => {
  const waist = 56 + (seed % 24);
  const skirtWidth = 182 + (seed % 42);

  return `
    <ellipse cx="450" cy="732" rx="244" ry="74" fill="${palette.shadow}" opacity="0.34" />
    <path d="M 404 220 L 496 220 L 520 268 L 592 332 L 560 384 L 516 350 L 502 420 C 486 470 474 510 450 552 C 426 510 414 470 398 420 L 384 350 L 340 384 L 308 332 L 380 268 Z" fill="${palette.primary}" />
    <path d="M ${450 - waist} 430 Q 450 390 ${450 + waist} 430 L ${450 + skirtWidth} 760 L ${450 - skirtWidth} 760 Z" fill="${palette.primary}" />
    <path d="M ${450 - skirtWidth + 36} 746 Q 450 688 ${450 + skirtWidth - 36} 746" fill="${palette.secondary}" opacity="0.8" />
    <path d="M 450 184 L 450 224" stroke="${palette.muted}" stroke-width="14" stroke-linecap="round" />
    <path d="M 406 220 Q 450 176 494 220" stroke="${palette.muted}" stroke-width="14" stroke-linecap="round" fill="none" />
    ${renderPattern(seed + 17, palette, 320, 474, 260, 214)}
    <rect x="418" y="292" width="64" height="128" rx="28" fill="${palette.accent}" opacity="0.92" />
  `;
};

const renderKurtaSetProduct = (seed: number, palette: Palette) => {
  const dupattaWidth = 82 + (seed % 26);

  return `
    <ellipse cx="450" cy="742" rx="250" ry="72" fill="${palette.shadow}" opacity="0.34" />
    <path d="M 352 270 L 432 270 L 452 304 L 520 350 L 494 398 L 454 374 L 454 696 C 454 730 428 756 394 756 L 390 756 C 356 756 330 730 330 696 L 330 374 L 290 398 L 264 350 L 332 304 Z" fill="${palette.primary}" />
    <path d="M 392 286 L 392 692" stroke="${palette.detail}" stroke-width="12" stroke-linecap="round" />
    ${renderPattern(seed + 19, palette, 350, 430, 84, 196)}
    <rect x="490" y="454" width="44" height="286" rx="18" fill="${palette.secondary}" />
    <rect x="548" y="454" width="44" height="286" rx="18" fill="${palette.secondary}" />
    <rect x="596" y="286" width="${dupattaWidth}" height="424" rx="22" fill="${palette.accent}" />
    ${renderPattern(seed + 23, palette, 606, 318, dupattaWidth - 20, 338)}
    <path d="M 372 248 L 392 216 L 412 248" stroke="${palette.muted}" stroke-width="12" stroke-linecap="round" fill="none" />
  `;
};

const renderProductArt = (product: ProductImageLike, seed: number, palette: Palette) => {
  const category = getResolvedCategory(product);
  if (category === 'Blouses') return renderBlouseProduct(seed, palette);
  if (category === 'Kurtas') return renderKurtaProduct(seed, palette);
  if (category === 'Dresses') return renderDressProduct(seed, palette);
  if (category === 'Kurta Sets') return renderKurtaSetProduct(seed, palette);
  return renderSareeProduct(seed, palette);
};

export const buildGeneratedProductImage = (product: ProductImageLike) => {
  const seedSource = String(product.productId || product.id || product.name || product.title || 'fashionNEST');
  const seed = hashSeed(seedSource);
  const palette = getPalette(product, seed);
  const category = getResolvedCategory(product);
  const title = product.name || product.title || `${category} style`;
  const subcategory = product.subcategory || category;
  const fabric = product.fabric || 'Ethnic Wear';
  const color = product.color || 'Signature';
  const titleLines = splitTitle(title);
  const cardOffset = seed % 14;
  const chipText = clipText(`${fabric} · ${color}`, 28);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" role="img" aria-label="${escapeXml(title)}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.background}" />
          <stop offset="100%" stop-color="${palette.detail}" />
        </linearGradient>
        <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.card}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#bg)" rx="34" />
      <circle cx="158" cy="144" r="96" fill="${palette.secondary}" opacity="0.16" />
      <circle cx="762" cy="994" r="144" fill="${palette.accent}" opacity="0.12" />
      <rect x="${74 + cardOffset}" y="${62 + cardOffset}" width="752" height="1028" rx="34" fill="${palette.shadow}" opacity="0.26" />
      <rect x="72" y="60" width="752" height="1028" rx="34" fill="url(#card)" />
      <rect x="112" y="102" width="150" height="36" rx="18" fill="${palette.secondary}" opacity="0.32" />
      <text x="187" y="126" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${palette.text}" letter-spacing="1.8">${escapeXml(category.toUpperCase())}</text>
      <text x="450" y="184" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${palette.text}">${escapeXml(clipText(subcategory, 28))}</text>
      <g>${renderProductArt(product, seed, palette)}</g>
      <rect x="118" y="840" width="664" height="194" rx="24" fill="${palette.card}" stroke="${palette.shadow}" stroke-width="2" />
      <text x="148" y="900" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${palette.text}">${escapeXml(titleLines[0] || title)}</text>
      ${titleLines[1] ? `<text x="148" y="936" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${palette.text}">${escapeXml(titleLines[1])}</text>` : ''}
      <rect x="148" y="964" width="194" height="34" rx="17" fill="${palette.detail}" />
      <text x="245" y="987" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="${palette.muted}" letter-spacing="1.2">${escapeXml(chipText.toUpperCase())}</text>
      <text x="148" y="1020" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="${palette.muted}" letter-spacing="1.2">${escapeXml(String(product.productId || product.id || 'FASHIONNEST'))}</text>
      <text x="780" y="1020" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="${palette.accent}" letter-spacing="1.4">UNIQUE PRODUCT VISUAL</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const hasUsableImageSource = (value?: string) => {
  const candidate = String(value || '').trim();
  return Boolean(candidate) && (/^https?:\/\//i.test(candidate) || candidate.startsWith('/') || candidate.startsWith('data:image/'));
};

const getPreferredImageSource = (product: ProductImageLike) => {
  const candidate = product.image_url || product.image;
  return hasUsableImageSource(candidate) ? String(candidate) : null;
};

const getProductImageStyle = (product: ProductImageLike, usingRealImage: boolean): React.CSSProperties | undefined => {
  if (!usingRealImage) return undefined;

  const category = getResolvedCategory(product);
  const source = String(product.image_url || product.image || '').toLowerCase();

  if (category === 'Sarees') {
    if (source.includes('/uploads/curated-') || source.includes('prashanti') || source.includes('vaibhogam') || source.includes('madhuram') || source.includes('nalina') || source.includes('bridal')) {
      return { objectFit: 'cover', objectPosition: 'center 42%' };
    }

    return { objectFit: 'cover', objectPosition: 'center 48%' };
  }

  return { objectFit: 'cover', objectPosition: 'center' };
};

export default function ProductImage({ product, alt, className }: ProductImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const preferredSource = getPreferredImageSource(product);
  const usingRealImage = Boolean(preferredSource) && !imageFailed;
  const src = usingRealImage ? preferredSource! : buildGeneratedProductImage(product);

  useEffect(() => {
    setImageFailed(false);
  }, [preferredSource, product.id, product.productId]);

  return (
    <img
      src={src}
      alt={alt || product.name || product.title || 'fashionNEST product'}
      className={className}
      style={getProductImageStyle(product, usingRealImage)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (usingRealImage) {
          setImageFailed(true);
        }
      }}
    />
  );
}

