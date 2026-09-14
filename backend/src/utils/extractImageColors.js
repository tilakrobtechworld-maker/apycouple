'use strict';

const sharp = require('sharp');

const toHex = (n) => n.toString(16).padStart(2, '0');

/**
 * Downloads an image and returns its average color plus a readable
 * contrasting text color, so a pasted design image can auto-set a card
 * template's background/text colors instead of requiring manual picks.
 * @param {string} imageUrl
 * @returns {Promise<{ backgroundColor: string, textColor: string }>}
 */
const extractImageColors = async (imageUrl) => {
  let res;
  try {
    res = await fetch(imageUrl);
  } catch {
    throw new Error('Could not reach that URL. Check the link and try again.');
  }
  if (!res.ok) throw new Error(`That link returned an error (HTTP ${res.status}).`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(
      "That link isn't a direct image file — it looks like a web page, not a picture. " +
      'Use a direct link to an exported image (e.g. ending in .png/.jpg, or a "Download"/"copy image address" link), not an editor or share page URL.'
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());

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

  return { backgroundColor, textColor };
};

module.exports = { extractImageColors };
