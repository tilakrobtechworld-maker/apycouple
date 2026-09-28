import CardElementRenderer from './CardElementRenderer';

// Read-only, absolutely-positioned card canvas at a given scale (1 = full
// resolution). Used by the public card page and by the hidden full-res
// snapshot the editor captures for PNG/PDF export.
//
// When the template supplies customHtml, it fully replaces the
// elements-array rendering below - full design freedom instead of the
// drag-and-drop element system. customHtml/customCss are expected to
// already have any {{bride_name}}-style placeholders filled in by the
// caller (they vary per couple, this component doesn't know the couple).
export default function CardCanvasView({
  elements = [], canvasWidth, canvasHeight, backgroundColor, backgroundImageUrl, scale = 1, innerRef,
  customHtml, customCss,
}) {
  if (customHtml) {
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
        {/* Forces the admin's top-level element to fill the whole canvas
            even if their own CSS gave it a smaller fixed size - otherwise
            it renders at its natural size, stuck in the top-left corner of
            a mostly-empty box instead of covering the card. */}
        <style>{`
          .ac-custom-card-fill { width: 100%; height: 100%; }
          .ac-custom-card-fill > * { width: 100% !important; height: 100% !important; margin: 0 !important; box-sizing: border-box !important; }
        `}</style>
        {customCss && <style>{customCss}</style>}
        <div
          className="ac-custom-card-fill"
          style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: customHtml }}
        />
      </div>
    );
  }

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
