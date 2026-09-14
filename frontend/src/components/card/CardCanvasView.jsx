import CardElementRenderer from './CardElementRenderer';

// Read-only, absolutely-positioned card canvas at a given scale (1 = full
// resolution). Used by the public card page and by the hidden full-res
// snapshot the editor captures for PNG/PDF export.
export default function CardCanvasView({
  elements = [], canvasWidth, canvasHeight, backgroundColor, backgroundImageUrl, scale = 1, innerRef,
}) {
  return (
    <div
      ref={innerRef}
      style={{
        position: 'relative',
        width: canvasWidth * scale,
        height: canvasHeight * scale,
        background: backgroundImageUrl ? `url(${backgroundImageUrl}) center/cover no-repeat` : (backgroundColor || '#ffffff'),
        overflow: 'hidden',
      }}
    >
      {[...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x * scale,
            top: el.y * scale,
            width: el.width * scale,
            height: el.height * scale,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
        >
          <CardElementRenderer element={{ ...el, style: { ...el.style, fontSize: el.style?.fontSize ? el.style.fontSize * scale : undefined, borderRadius: el.style?.borderRadius ? el.style.borderRadius * scale : el.style?.borderRadius } }} />
        </div>
      ))}
    </div>
  );
}
