import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cardApi } from '../../services/api';
import CardCanvasView from '../../components/card/CardCanvasView';
import { Loader2, Download, FileImage, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicCard() {
  const { slug } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    cardApi.getPublic(slug)
      .then((res) => setCard(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const download = async (format) => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { backgroundColor: null, scale: 1 });
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = 'wedding-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: card.canvas_height >= card.canvas_width ? 'portrait' : 'landscape', unit: 'px', format: [card.canvas_width, card.canvas_height] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, card.canvas_width, card.canvas_height);
        pdf.save('wedding-card.pdf');
      }
    } catch { toast.error('Download failed'); } finally { setExporting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50">
      <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
    </div>
  );

  if (notFound || !card) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 text-center p-6">
      <Heart className="w-10 h-10 text-primary-300 mb-4" />
      <h1 className="text-xl font-serif font-bold text-gray-800">Card not found</h1>
      <p className="text-sm text-gray-500 mt-2">This wedding card doesn't exist or hasn't been published yet.</p>
    </div>
  );

  const displayScale = Math.min(1, Math.min(420 / card.canvas_width, 640 / card.canvas_height));

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="shadow-xl rounded-lg overflow-hidden">
        <CardCanvasView
          elements={card.elements}
          canvasWidth={card.canvas_width}
          canvasHeight={card.canvas_height}
          backgroundColor={card.background_color}
          backgroundImageUrl={card.background_image_url}
          scale={displayScale}
        />
      </div>
      <div className="flex gap-3">
        <button onClick={() => download('png')} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
          <FileImage className="w-4 h-4" /> Download PNG
        </button>
        <button onClick={() => download('pdf')} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Hidden full-resolution snapshot used for PNG/PDF export */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }}>
        <CardCanvasView
          innerRef={exportRef}
          elements={card.elements}
          canvasWidth={card.canvas_width}
          canvasHeight={card.canvas_height}
          backgroundColor={card.background_color}
          backgroundImageUrl={card.background_image_url}
          scale={1}
        />
      </div>
    </div>
  );
}
