"use client";

import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DIcons } from "dicons";
import ModalOverlay, { ModalClose, ModalTitle, ModalSub } from "../ModalOverlay";

type ColorStop = { color: string; position: number };

const DEFAULT_STOPS: ColorStop[] = [
  { color: "#1a0a05", position: 0 },
  { color: "#000000", position: 100 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (css: string) => void;
  currentGradient?: string;
}

export default function ModalSfondo({ open, onClose, onApply, currentGradient }: Props) {
  const [colorStops, setColorStops] = useState<ColorStop[]>(DEFAULT_STOPS);
  const [isRadial, setIsRadial] = useState(true);
  const [angle, setAngle] = useState(90);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);

  const gradientString = colorStops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");

  const gradientCSS = isRadial
    ? `radial-gradient(ellipse at 50% 80%, ${gradientString})`
    : `linear-gradient(${angle}deg, ${gradientString})`;

  const gradientStyle = { background: gradientCSS };

  useEffect(() => {
    if (!open) return;
    updateCanvas();
  }, [colorStops, angle, isRadial, open]);

  function updateCanvas() {
    const canvas = canvasRef.current;
    const display = displayRef.current;
    if (!canvas || !display) return;
    const ctx = canvas.getContext("2d");
    const dCtx = display.getContext("2d");
    if (!ctx || !dCtx) return;

    let gradient;
    if (isRadial) {
      gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.8, 0,
        canvas.width / 2, canvas.height * 0.8, canvas.width / 2
      );
    } else {
      const rad = (angle * Math.PI) / 180;
      const x1 = canvas.width / 2 - Math.cos(rad) * canvas.width / 2;
      const y1 = canvas.height / 2 - Math.sin(rad) * canvas.height / 2;
      const x2 = canvas.width / 2 + Math.cos(rad) * canvas.width / 2;
      const y2 = canvas.height / 2 + Math.sin(rad) * canvas.height / 2;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    colorStops.forEach((s) => gradient.addColorStop(s.position / 100, s.color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    dCtx.drawImage(canvas, 0, 0, display.width, display.height);
  }

  function addStop() {
    if (colorStops.length >= 5) return;
    const mid = Math.round(
      (colorStops[0].position + colorStops[colorStops.length - 1].position) / 2
    );
    setColorStops([...colorStops, { color: "#333333", position: mid }].sort((a, b) => a.position - b.position));
  }

  function removeStop(i: number) {
    if (colorStops.length <= 2) return;
    setColorStops(colorStops.filter((_, idx) => idx !== i));
  }

  function updateStop(i: number, color: string, position: number) {
    const next = [...colorStops];
    next[i] = { color, position };
    setColorStops(next.sort((a, b) => a.position - b.position));
  }

  function handleApply() {
    onApply(gradientCSS);
    localStorage.setItem("norma-bg-gradient", gradientCSS);
    onClose();
  }

  function handleReset() {
    setColorStops(DEFAULT_STOPS);
    setIsRadial(true);
    setAngle(90);
  }

  return (
    <ModalOverlay open={open} onClose={onClose} wide>
      <div className="p-7">
        <ModalClose onClose={onClose} />
        <ModalTitle>Modifica sfondo</ModalTitle>
        <ModalSub>Personalizza il gradiente di sfondo della tua app</ModalSub>

        {/* Preview */}
        <div className="relative mt-4 rounded-xl overflow-hidden" style={{ height: 180 }}>
          <div className="absolute inset-0" style={gradientStyle} />
          <canvas ref={displayRef} width={560} height={180} className="absolute inset-0 w-full h-full mix-blend-overlay" />
          <div className="relative z-10 flex items-center justify-center h-full">
            <span className="font-serif text-[28px] text-white/80">
              Norma<span className="text-[#dc5028]">AI</span>
            </span>
          </div>
        </div>

        {/* Color Stops */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          {colorStops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative">
                <label htmlFor={`cs-${i}`}>
                  <div
                    className="w-9 h-9 rounded-full border-2 border-[#D5D0C8] cursor-pointer"
                    style={{ backgroundColor: stop.color }}
                  />
                </label>
                <input
                  type="color"
                  id={`cs-${i}`}
                  value={stop.color}
                  onChange={(e) => updateStop(i, e.target.value, stop.position)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) => updateStop(i, stop.color, Number(e.target.value))}
                className="w-16 h-9 bg-[#F5F3F0] border-[#E5E1D8] text-[#1a1a1a] text-[12px]"
              />
              {colorStops.length > 2 && (
                <button
                  onClick={() => removeStop(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[#D5D0C8] text-[#6B6763] hover:text-[#f44] bg-transparent cursor-pointer transition-colors text-[14px]"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {colorStops.length < 5 && (
            <button
              onClick={addStop}
              className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-dashed border-[#D5D0C8] text-[#6B6763] hover:text-[#1a1a1a] hover:border-accent bg-transparent cursor-pointer transition-colors text-[18px]"
            >
              +
            </button>
          )}
        </div>

        {/* Type Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <Label className={`text-[12px] ${!isRadial ? "text-[#1a1a1a]" : "text-[#6B6763]"}`}>Lineare</Label>
          <Switch
            checked={isRadial}
            onCheckedChange={setIsRadial}
          />
          <Label className={`text-[12px] ${isRadial ? "text-[#1a1a1a]" : "text-[#6B6763]"}`}>Radiale</Label>
        </div>

        {/* Angle (only linear) */}
        {!isRadial && (
          <div className="flex items-center gap-3 mt-3">
            <Label className="text-[12px] text-[#6B6763]">Angolo</Label>
            <Slider
              value={[angle]}
              min={0}
              max={360}
              className="flex-1"
              onValueChange={(v) => setAngle(v[0])}
            />
            <span className="text-[12px] text-[#6B6763] w-10 text-right">{angle}°</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleApply}
            className="flex-1 py-[11px] rounded-[9px] text-[13.5px] font-medium bg-accent text-white border-none cursor-pointer hover:bg-accent-hover transition-colors"
          >
            Applica sfondo
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-[11px] rounded-[9px] text-[13.5px] border border-[#E5E1D8] bg-transparent text-[#1a1a1a] cursor-pointer hover:border-[#C8C2BA] transition-colors"
          >
            Reset
          </button>
        </div>

        <canvas ref={canvasRef} width={500} height={500} style={{ display: "none" }} />
      </div>
    </ModalOverlay>
  );
}
