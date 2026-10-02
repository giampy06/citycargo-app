'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Angoli, Punto } from '@/lib/scanner/elabora';

type Props = {
  /** Anteprima della foto (stesse proporzioni dell'immagine di lavoro). */
  url: string;
  larghezza: number;
  altezza: number;
  angoli: Angoli;
  onChange: (angoli: Angoli) => void;
};

const ZOOM_LENTE = 2.5;
const LATO_LENTE = 100; // px

/**
 * Foto con i 4 angoli del foglio trascinabili (mouse o dito). Le coordinate sono
 * sempre in pixel dell'immagine di lavoro: l'SVG sopra la foto usa lo stesso
 * viewBox, quindi non servono conversioni tra schermo e immagine se non al tocco.
 * Si può afferrare un angolo anche toccando vicino, e durante il trascinamento una
 * lente ingrandisce la zona sotto il dito (che altrimenti coprirebbe l'angolo).
 */
export default function EditorAngoli({ url, larghezza, altezza, angoli, onChange }: Props) {
  const contenitoreRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensioni, setDimensioni] = useState({ w: 0, h: 0 });
  const [trascinato, setTrascinato] = useState<number | null>(null);
  const scarto = useRef<Punto>({ x: 0, y: 0 });

  // Adatta la foto allo spazio disponibile mantenendo le proporzioni.
  useLayoutEffect(() => {
    const el = contenitoreRef.current;
    if (!el) return;
    const aggiorna = () => {
      const scala = Math.min(el.clientWidth / larghezza, el.clientHeight / altezza);
      setDimensioni({ w: Math.floor(larghezza * scala), h: Math.floor(altezza * scala) });
    };
    aggiorna();
    const osservatore = new ResizeObserver(aggiorna);
    osservatore.observe(el);
    return () => osservatore.disconnect();
  }, [larghezza, altezza]);

  // Evita lo scroll/zoom della pagina mentre si trascina con il dito.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const blocca = (e: TouchEvent) => e.preventDefault();
    svg.addEventListener('touchmove', blocca, { passive: false });
    return () => svg.removeEventListener('touchmove', blocca);
  }, []);

  const puntoImmagine = (e: React.PointerEvent): Punto => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * larghezza,
      y: ((e.clientY - r.top) / r.height) * altezza,
    };
  };

  const inizia = (e: React.PointerEvent) => {
    const p = puntoImmagine(e);
    const distanze = angoli.map((a) => Math.hypot(a.x - p.x, a.y - p.y));
    const vicino = distanze.indexOf(Math.min(...distanze));
    // Si afferra l'angolo più vicino, se il tocco è ragionevolmente vicino.
    if (distanze[vicino] > Math.max(larghezza, altezza) * 0.15) return;
    svgRef.current!.setPointerCapture(e.pointerId);
    scarto.current = { x: angoli[vicino].x - p.x, y: angoli[vicino].y - p.y };
    setTrascinato(vicino);
  };

  const muovi = (e: React.PointerEvent) => {
    if (trascinato === null) return;
    const p = puntoImmagine(e);
    const nuovi = [...angoli] as Angoli;
    nuovi[trascinato] = {
      x: Math.min(larghezza, Math.max(0, p.x + scarto.current.x)),
      y: Math.min(altezza, Math.max(0, p.y + scarto.current.y)),
    };
    onChange(nuovi);
  };

  const termina = () => setTrascinato(null);

  const raggio = Math.max(larghezza, altezza) / 45;
  const angoloAttivo = trascinato !== null ? angoli[trascinato] : null;
  // La lente sta nell'angolo opposto a quello che si sta spostando, per non coprirlo.
  const lenteADestra = angoloAttivo ? angoloAttivo.x < larghezza / 2 : true;

  return (
    <div ref={contenitoreRef} className="relative w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: dimensioni.w, height: dimensioni.h }}>
        <img src={url} alt="Foto della bolla" className="absolute inset-0 w-full h-full select-none" draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${larghezza} ${altezza}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={inizia}
          onPointerMove={muovi}
          onPointerUp={termina}
          onPointerCancel={termina}
        >
          <polygon
            points={angoli.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(224, 83, 83, 0.18)"
            stroke="#E05353"
            strokeWidth={raggio / 3}
            strokeLinejoin="round"
          />
          {angoli.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={trascinato === i ? raggio * 1.3 : raggio}
              fill="white"
              fillOpacity={0.85}
              stroke="#E05353"
              strokeWidth={raggio / 3}
            />
          ))}
        </svg>

        {angoloAttivo && dimensioni.w > 0 && (
          <div
            className="absolute top-2 rounded-full border-4 border-white shadow-xl overflow-hidden pointer-events-none"
            style={{
              width: LATO_LENTE,
              height: LATO_LENTE,
              [lenteADestra ? 'right' : 'left']: 8,
              backgroundImage: `url(${url})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${dimensioni.w * ZOOM_LENTE}px ${dimensioni.h * ZOOM_LENTE}px`,
              backgroundPosition: `${LATO_LENTE / 2 - (angoloAttivo.x / larghezza) * dimensioni.w * ZOOM_LENTE}px ${LATO_LENTE / 2 - (angoloAttivo.y / altezza) * dimensioni.h * ZOOM_LENTE}px`,
            }}
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E05353]" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#E05353]" />
          </div>
        )}
      </div>
    </div>
  );
}
