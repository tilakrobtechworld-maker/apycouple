'use strict';

const sharp = require('sharp');

const toHex = (n) => n.toString(16).padStart(2, '0');

const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:og:image|twitter:image)["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

/**
 * Share/editor pages (Canva share links, Google Images result pages, etc.)
 * serve HTML rather than the raw image - but that HTML almost always embeds
 * an og:image/twitter:image meta tag pointing at a real preview image, so
 * pull that out instead of forcing admins to hunt for a direct file link.
 */
const findOgImage = (html, baseUrl) => {
  for (const pattern of OG_IMAGE_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], baseUrl).toString();
      } catch {
        // malformed URL in the meta tag - keep trying other patterns
      }
    }
  }
  return null;
};

/**
 * Fetches a URL and resolves it to an actual image: follows an og:image
 * fallback one level deep if the URL itself serves an HTML share/editor
 * page instead of the image bytes.
 * @returns {Promise<{ url: string, buffer: Buffer }>}
 */
const fetchAsImage = async (url, { allowHtmlFallback = true } = {}) => {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Could not reach that URL. Check the link and try again.');
  }
  if (!res.ok) throw new Error(`That link returned an error (HTTP ${res.status}).`);

  const contentType = res.headers.get('content-type') || '';

  if (contentType.startsWith('image/')) {
    return { url, buffer: Buffer.from(await res.arrayBuffer()) };
  }

  if (allowHtmlFallback && contentType.includes('text/html')) {
    const html = await res.text();
    const ogImageUrl = findOgImage(html, url);
    if (ogImageUrl) {
      return fetchAsImage(ogImageUrl, { allowHtmlFallback: false });
    }
  }

  throw new Error(
    "That link isn't a direct image file — it looks like a web page, not a picture. " +
    'Use a direct link to an exported image (e.g. ending in .png/.jpg, or a "Download"/"copy image address" link), not an editor or share page URL.'
  );
};

/**
 * Resolves a pasted design link to an actual image URL, and returns its
 * average color plus a readable contrasting text color, so a pasted design
 * image can auto-set a card template's background/text colors instead of
 * requiring manual picks.
 * @param {string} imageUrl
 * @returns {Promise<{ resolvedUrl: string, backgroundColor: string, textColor: string }>}
 */
const extractImageColors = async (imageUrl) => {
  const { url: resolvedUrl, buffer } = await fetchAsImage(imageUrl);

  // Resizing to 1x1 with averaging interpolation gives the image's mean color.
  let data;
  try {
    ({ data } = await sharp(buffer)
      .resize(1, 1, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } catch {
    throw new Error("That link's content couldn't be read as an image.");
  }

  const [r, g, b] = data;
  const backgroundColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // YIQ perceived brightness — pick white text on dark backgrounds, dark text on light ones.
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? '#2c2c2c' : '#ffffff';

  return { resolvedUrl, backgroundColor, textColor };
};

module.exports = { extractImageColors };
