import {
  Heart, Sparkles, Sparkle, Star, Flower2, Flower, Feather, Leaf, Sun, Moon,
  Music2, Bird, Crown, Gift, Cake, Wine, Camera, PartyPopper, Gem, Flame,
  Diamond, Ribbon,
} from 'lucide-react';

// Sticker/icon elements (added from the admin's Card Template "Design
// Elements" picker) store just the icon's name in `content` - keep this map
// in sync with admin/src/pages/CardTemplatesPage.jsx's DECOR_ICONS.
const DECOR_ICONS = {
  Heart, Sparkles, Sparkle, Star, Flower2, Flower, Feather, Leaf, Sun, Moon,
  Music2, Bird, Crown, Gift, Cake, Wine, Camera, PartyPopper, Gem, Flame,
  Diamond, Ribbon,
};

// Pure content renderer for one card element. Used by both the interactive
// editor (wrapped in a draggable/resizable box) and the read-only views
// (public card page, export snapshot) so text/image/shape rendering never
// drifts between what the couple edits and what guests actually see.
export default function CardElementRenderer({ element }) {
  const { type, content, style = {} } = element;

  if (type === 'icon') {
    const Icon = DECOR_ICONS[content] || Sparkles;
    return (
      <Icon
        style={{ width: '100%', height: '100%', opacity: style.opacity ?? 1 }}
        color={style.color || '#c0392b'}
        strokeWidth={style.strokeWidth || 1.5}
        fill={style.filled ? (style.color || '#c0392b') : 'none'}
      />
    );
  }

  if (type === 'text') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
          fontFamily: style.fontFamily || 'inherit',
          fontSize: style.fontSize ? `${style.fontSize}px` : '16px',
          fontWeight: style.fontWeight || 400,
          fontStyle: style.fontStyle || 'normal',
          color: style.color || '#1f2937',
          textAlign: style.textAlign || 'center',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {content || ''}
      </div>
    );
  }

  if (type === 'image') {
    return content ? (
      <img
        src={content}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'cover',
          borderRadius: style.borderRadius ? `${style.borderRadius}px` : 0,
          opacity: style.opacity ?? 1,
        }}
      />
    ) : (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af', fontSize: 12 }}>
        No image
      </div>
    );
  }

  // shape
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: style.background || '#f43f5e',
        borderRadius: style.shapeType === 'circle' ? '50%' : (style.borderRadius ? `${style.borderRadius}px` : 0),
        opacity: style.opacity ?? 1,
      }}
    />
  );
}
