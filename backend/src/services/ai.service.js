'use strict';

const { GoogleGenAI, Type } = require('@google/genai');
const sharp = require('sharp');

let client = null;
const getClient = () => {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

const THEME_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'A short, elegant theme name (2-4 words).' },
    description: { type: Type.STRING, description: 'One sentence describing the mood and style.' },
    color_palette: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING, description: 'Hex color, e.g. #B8860B' },
        secondary: { type: Type.STRING, description: 'Hex color' },
        accent: { type: Type.STRING, description: 'Hex color' },
        background: { type: Type.STRING, description: 'Hex color' },
        text: { type: Type.STRING, description: 'Hex color - must contrast well against background' },
      },
      required: ['primary', 'secondary', 'accent', 'background', 'text'],
    },
    font_pair: {
      type: Type.OBJECT,
      properties: {
        heading: { type: Type.STRING, description: 'A Google Fonts font name suited to the heading style.' },
        body: { type: Type.STRING, description: 'A Google Fonts font name suited to body text, legible at small sizes.' },
      },
      required: ['heading', 'body'],
    },
    image_search_query: {
      type: Type.STRING,
      description: 'A short (2-4 word) stock-photo search query that would find a fitting wedding hero photo for this theme, e.g. "sunset beach wedding".',
    },
  },
  required: ['name', 'description', 'color_palette', 'font_pair', 'image_search_query'],
};

const DETECT_ELEMENTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: 'What this text represents, e.g. "Couple Names", "Wedding Date", "Venue".' },
          content: { type: Type.STRING, description: 'Suggested placeholder text for it, e.g. "Bride & Groom".' },
          x: { type: Type.NUMBER, description: 'Left edge as a fraction of the image width, 0 to 1.' },
          y: { type: Type.NUMBER, description: 'Top edge as a fraction of the image height, 0 to 1.' },
          width: { type: Type.NUMBER, description: 'Width as a fraction of the image width, 0 to 1.' },
          height: { type: Type.NUMBER, description: 'Height as a fraction of the image height, 0 to 1.' },
          fontSize: { type: Type.NUMBER, description: 'Suggested font size in px, assuming the image is rendered at 1080px wide.' },
          color: { type: Type.STRING, description: 'Hex color that will read clearly against the background at this spot.' },
          textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'] },
        },
        required: ['label', 'content', 'x', 'y', 'width', 'height', 'fontSize', 'color', 'textAlign'],
      },
    },
  },
  required: ['elements'],
};

/** Turns the SDK's raw provider-error JSON message into something an admin can act on. */
const mapGeminiError = (sdkErr) => {
  let code = null;
  try { code = JSON.parse(sdkErr.message)?.error?.code; } catch { /* not JSON */ }

  const err = new Error(
    code === 429
      ? 'The AI provider quota has been exceeded. Check its billing/plan, then try again.'
      : code === 503
      ? 'The AI model is temporarily overloaded on the provider side. Please try again in a moment.'
      : code === 404
      ? 'The configured AI model is no longer available from the provider.'
      : 'AI request failed. Please try again.'
  );
  err.statusCode = code === 429 ? 429 : code === 503 ? 503 : 502;
  return err;
};

/**
 * Free-tier Gemini keys have a very tight per-minute request limit - a 503
 * "model overloaded" here is usually that limit, not an actual outage, and
 * it clears within a few seconds. Retry a couple of times before surfacing
 * an error, so one admin click doesn't fail on ordinary rate-limit noise.
 */
const withGeminiRetry = async (fn, attempts = 3, delayMs = 4000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (sdkErr) {
      let code = null;
      try { code = JSON.parse(sdkErr.message)?.error?.code; } catch { /* not JSON */ }
      const isLastAttempt = i === attempts - 1;
      if (code !== 503 || isLastAttempt) throw mapGeminiError(sdkErr);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Search Unsplash for a photo matching the query and return a hotlinkable
 * URL, or null if no key is configured or nothing is found.
 */
const searchUnsplashImage = async (query) => {
  if (!process.env.UNSPLASH_ACCESS_KEY) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    });
    if (!res.ok) {
      console.error('Unsplash search failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.urls?.regular || null;
  } catch (err) {
    console.error('Unsplash search error:', err.message);
    return null;
  }
};

/**
 * Generate a wedding website theme (name, description, color palette, font
 * pairing) from a free-text style prompt using Gemini. Does not persist
 * anything - the admin reviews/edits the result before saving as a Theme.
 * @param {string} prompt - e.g. "romantic sunset beach wedding, warm oranges and pinks"
 */
const generateTheme = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('AI theme generation is not configured (missing GEMINI_API_KEY).');
    err.statusCode = 503;
    throw err;
  }

  const response = await withGeminiRetry(() =>
    getClient().models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [{
            text:
              'You are a wedding website theme designer. Given a short style prompt from an admin, design one ' +
              'cohesive, elegant theme: a name, a one-sentence description, a 5-color hex palette (primary, ' +
              'secondary, accent, background, text) that is harmonious and has strong readable contrast between ' +
              'text and background, a heading/body font pairing using fonts commonly available on Google Fonts, ' +
              'and a short stock-photo search query that would find a fitting wedding hero photo.\n\n' +
              `Style prompt: ${prompt}`,
          }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: THEME_SCHEMA,
      },
    })
  );

  const text = response.text;
  if (!text) {
    const err = new Error('AI did not return a theme. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  let theme;
  try {
    theme = JSON.parse(text);
  } catch {
    const err = new Error('AI returned an unreadable response. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  const { image_search_query, ...rest } = theme;
  const preview_image_url = await searchUnsplashImage(image_search_query || prompt);
  return { ...rest, preview_image_url };
};

/**
 * Analyze an uploaded card design image with Gemini Vision and propose
 * editable text elements (couple names, date, venue, etc.) at the spots in
 * the image where personalized text belongs - either blank space left for
 * it, or sample placeholder text. Returns element positions as fractions of
 * the image (0-1); the caller converts those to pixel default_elements
 * against its own canvas_width/canvas_height. Nothing is saved - the admin
 * reviews/adjusts the detected elements before the template is saved.
 * @param {string} imageUrl - the uploaded design image's hosted URL
 */
const detectCardElements = async (imageUrl) => {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('AI element detection is not configured (missing GEMINI_API_KEY).');
    err.statusCode = 503;
    throw err;
  }

  let mimeType;
  let base64;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`status ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    // Downscale before sending - full-resolution card designs (2-3MB+) push
    // this past the free-tier vision quota and come back as a generic 503
    // "model overloaded" (misleading - it's the request, not the model).
    // 800px is plenty for the model to read text layout/positions from.
    const resized = await sharp(buffer).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    mimeType = 'image/jpeg';
    base64 = resized.toString('base64');
  } catch (fetchErr) {
    console.error('detectCardElements image fetch error:', fetchErr.message);
    const err = new Error('Could not download the design image to analyze.');
    err.statusCode = 400;
    throw err;
  }

  const response = await withGeminiRetry(() =>
    getClient().models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text:
                'This is a wedding invitation card design. Find every spot where personalized text belongs - ' +
                'either blank space clearly left for it, or existing sample/placeholder text (e.g. example names, ' +
                'a sample date) that a real couple would replace with their own. Typical spots: couple names, ' +
                'wedding date, venue/address, an RSVP note, a short quote. For each spot, return its label, a ' +
                'suggested placeholder to show until the couple edits it, its bounding box as fractions of the ' +
                'image width/height (0 to 1), a font size in px (assuming the image renders at 1080px wide), a ' +
                'hex color that stays readable against the background there, and text alignment. Return 2 to 8 ' +
                'elements - skip decorative-only areas with no text.',
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: DETECT_ELEMENTS_SCHEMA,
      },
    })
  );

  const text = response.text;
  if (!text) {
    const err = new Error('AI did not return any detected elements. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  try {
    return JSON.parse(text).elements || [];
  } catch {
    const err = new Error('AI returned an unreadable response. Please try again.');
    err.statusCode = 502;
    throw err;
  }
};

module.exports = { generateTheme, detectCardElements };
