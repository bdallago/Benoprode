import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Share2, Camera, MessageCircle, Download, Loader2, X, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";

interface SharePredictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  champion: string;
  topScorer: string;
  revelation: string;
  userName: string;
}

export function SharePredictionsModal({ isOpen, onClose, champion, topScorer, revelation, userName }: SharePredictionsModalProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [localChampion, setLocalChampion] = useState(champion || '');
  const [localTopScorer, setLocalTopScorer] = useState(topScorer || '');
  const [localRevelation, setLocalRevelation] = useState(revelation || '');

  useEffect(() => {
    if (isOpen) {
      setLocalChampion(champion || '');
      setLocalTopScorer(topScorer || '');
      setLocalRevelation(revelation || '');
    }
  }, [isOpen, champion, topScorer, revelation]);

  if (!isOpen) return null;

  const getShareText = () => {
    return `¡Ya armé mi Prode para el Mundial! 🏆\n\nMi candidato a campeón es: ${localChampion || '...'}\nGoleador: ${localTopScorer || '...'}\nRevelación: ${localRevelation || '...'}\n\n¡Sumate a jugar conmigo en El Prode de Beno!\nhttps://www.elprodedebeno.com.ar`;
  };

  const handleWhatsAppTextShare = () => {
    const text = getShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#1e1b4b', // match the dark theme background
      });
      
      const image = canvas.toDataURL("image/png");
      
      // 1. Always trigger download first
      const link = document.createElement('a');
      link.href = image;
      link.download = `prode-beno-${userName.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 2. Try to use Web Share API
      if (navigator.share) {
        try {
          const blob = await (await fetch(image)).blob();
          const file = new File([blob], 'predicciones.png', { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Mis Predicciones - Prode de Beno',
              text: getShareText(),
              files: [file]
            });
          } else {
            // Fallback to text share if file share not supported
            await navigator.share({
              title: 'Mis Predicciones - Prode de Beno',
              text: getShareText()
            });
          }
        } catch (shareError) {
          console.log("Web Share API failed or user cancelled", shareError);
        }
      }
      
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compartir Predicciones</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col md:flex-row gap-8 items-center md:items-start">
          
          {/* Left Column: Inputs and Buttons */}
          <div className="flex-1 w-full flex flex-col gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-200 mb-4">
                Completá o modificá tus candidatos antes de generar la imagen para compartir con tus amigos.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Campeón</label>
                  <input 
                    type="text" 
                    value={localChampion} 
                    onChange={e => setLocalChampion(e.target.value)} 
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    placeholder="Ej: Argentina" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Goleador</label>
                  <input 
                    type="text" 
                    value={localTopScorer} 
                    onChange={e => setLocalTopScorer(e.target.value)} 
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    placeholder="Ej: Lionel Messi" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Revelación</label>
                  <input 
                    type="text" 
                    value={localRevelation} 
                    onChange={e => setLocalRevelation(e.target.value)} 
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    placeholder="Ej: Marruecos" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4 border-t dark:border-gray-800">
              <Button 
                onClick={handleNativeShare}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 h-14 text-lg border-0 shadow-lg transition-colors"
              >
                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                {isGenerating ? 'Generando...' : 'Compartir Imagen'}
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-200 px-2">
                Abre el menú de tu celular para enviar la imagen a <strong>Instagram Stories</strong> o <strong>WhatsApp</strong>. En PC, descargará la imagen.
              </p>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              </div>

              <Button 
                onClick={handleWhatsAppTextShare}
                variant="outline"
                className="w-full border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center gap-2 h-12 text-base transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar solo texto por WhatsApp
              </Button>
            </div>
          </div>

          {/* Right Column: The Card to be captured */}
          <div className="flex justify-center shrink-0 bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
            <div 
              ref={cardRef}
              className="w-[300px] h-[533px] relative overflow-hidden rounded-xl flex flex-col items-center justify-between p-6 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 100%)',
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2) 0%, transparent 70%)'
              }}></div>
              
              <div className="z-10 text-center w-full mt-4">
                <h2 className="text-sm font-bold tracking-widest uppercase mb-1" style={{ color: '#bae6fd' }}>El Prode de Beno</h2>
                <h3 className="text-2xl font-black leading-tight" style={{ color: '#ffffff' }}>MIS CANDIDATOS<br/>AL MUNDIAL</h3>
              </div>

              <div className="z-10 w-full space-y-4 flex-1 flex flex-col justify-center">
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                  <p className="text-xs uppercase font-bold mb-1" style={{ color: '#e0f2fe' }}>Campeón</p>
                  <p className="text-xl font-bold" style={{ color: '#ffffff' }}>{localChampion || '?'}</p>
                </div>
                
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                  <p className="text-xs uppercase font-bold mb-1" style={{ color: '#e0f2fe' }}>Goleador</p>
                  <p className="text-lg font-bold" style={{ color: '#ffffff' }}>{localTopScorer || '?'}</p>
                </div>

                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                  <p className="text-xs uppercase font-bold mb-1" style={{ color: '#e0f2fe' }}>Revelación</p>
                  <p className="text-lg font-bold" style={{ color: '#ffffff' }}>{localRevelation || '?'}</p>
                </div>
              </div>

              <div className="z-10 text-center w-full mb-2">
                <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Predicciones de</p>
                <p className="text-lg font-bold" style={{ color: '#ffffff' }}>{userName}</p>
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                  <p className="text-xs font-bold" style={{ color: '#bae6fd' }}>www.elprodedebeno.com.ar</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
