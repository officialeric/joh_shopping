"use client";

import { RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Slider } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/client";
import { outputSize, type RenderOptions } from "@/lib/image-tools";
import { cn } from "@/lib/utils";

const ASPECTS = {
  square: 1,
  landscape: 4 / 3,
  portrait: 3 / 4,
  wide: 16 / 9,
  original: 0,
} as const;
type AspectKey = keyof typeof ASPECTS;
const SIZES = [800, 1200, 1600, 2000];

/** Rotate by a step, kept within -180…180 to match the slider. */
const turn = (deg: number, step: number) => ((((deg + step + 180) % 360) + 360) % 360) - 180;

export interface CropJob {
  id: string;
  /** Object URL of the photo being edited. */
  src: string;
  name: string;
  /** Position in the current batch (1-based) and its size, for "Photo 2 of 5". */
  position: number;
  total: number;
  /** Re-editing a saved photo: start from its own shape instead of square. */
  existing?: boolean;
}

/**
 * Crop, zoom, rotate and resize one photo. Zooming out below 100% pads the
 * photo with the chosen background, handy to fit a tall phone into a square.
 */
export function ImageCropDialog({
  job,
  busy,
  onSave,
  onUseOriginal,
  onCancel,
}: {
  job: CropJob | null;
  busy: boolean;
  onSave: (options: RenderOptions) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const m = t.admin.products.images;
  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{m.title}</DialogTitle>
          <DialogDescription className="truncate">
            {job && job.total > 1 ? `${m.progress.replace("{n}", String(job.position)).replace("{total}", String(job.total))} · ` : ""}
            {job?.name}
          </DialogDescription>
        </DialogHeader>
        {job && <CropEditor key={job.id} job={job} busy={busy} onSave={onSave} onUseOriginal={onUseOriginal} />}
      </DialogContent>
    </Dialog>
  );
}

function CropEditor({ job, busy, onSave, onUseOriginal }: { job: CropJob; busy: boolean; onSave: (options: RenderOptions) => void; onUseOriginal: () => void }) {
  const { t } = useT();
  const m = t.admin.products.images;
  const initialAspect: AspectKey = job.existing ? "original" : "square";
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<AspectKey>(initialAspect);
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [background, setBackground] = useState<RenderOptions["background"]>("white");
  const [maxSide, setMaxSide] = useState(1200);

  const quarterTurned = Math.abs(rotation % 180) === 90;
  const naturalAspect = natural ? (quarterTurned ? natural.height / natural.width : natural.width / natural.height) : 1;
  const aspect = aspectKey === "original" ? naturalAspect : ASPECTS[aspectKey];
  const out = area ? outputSize(area, maxSide) : null;

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectKey(initialAspect);
  };

  return (
    <>
      <div className="grid md:grid-cols-[1fr_260px]">
        <div
          className={cn(
            "relative h-72 sm:h-[440px] md:h-auto md:min-h-[440px]",
            background === "white" ? "bg-white" : "bg-[conic-gradient(#e5e5e5_25%,#fff_0_50%,#e5e5e5_0_75%,#fff_0)] bg-[length:20px_20px]",
          )}
        >
          <Cropper
            image={job.src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            minZoom={0.5}
            maxZoom={4}
            zoomSpeed={0.15}
            restrictPosition={false}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, pixels) => setArea(pixels)}
            onMediaLoaded={(size: MediaSize) =>
              setNatural({
                width: size.naturalWidth,
                height: size.naturalHeight,
              })
            }
            style={{
              cropAreaStyle: {
                border: "2px solid #fff",
                boxShadow: "0 0 0 9999em rgba(10,10,12,0.55)",
              },
            }}
          />
        </div>

        <div className="space-y-5 border-t border-border p-5 md:border-t-0 md:border-l">
          <Control label={m.aspect}>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
                <Chip key={key} active={aspectKey === key} onClick={() => setAspectKey(key)}>
                  {m.aspects[key]}
                </Chip>
              ))}
            </div>
          </Control>

          <Control label={`${m.zoom} · ${Math.round(zoom * 100)}%`}>
            <Slider value={[zoom]} min={0.5} max={4} step={0.01} onValueChange={([v]) => setZoom(v)} aria-label={m.zoom} />
          </Control>

          <Control label={`${m.rotation} · ${rotation}°`}>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setRotation((r) => turn(r, -90))} aria-label={m.rotateLeft}>
                <RotateCcw />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setRotation((r) => turn(r, 90))} aria-label={m.rotateRight}>
                <RotateCw />
              </Button>
              <Slider className="ml-1" value={[rotation]} min={-180} max={180} step={1} onValueChange={([v]) => setRotation(v)} aria-label={m.rotation} />
            </div>
          </Control>

          <Control label={m.background}>
            <div className="flex gap-1.5">
              <Chip active={background === "white"} onClick={() => setBackground("white")}>
                {m.white}
              </Chip>
              <Chip active={background === "transparent"} onClick={() => setBackground("transparent")}>
                {m.transparent}
              </Chip>
            </div>
          </Control>

          <Control label={m.size}>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((size) => (
                <Chip key={size} active={maxSide === size} onClick={() => setMaxSide(size)}>
                  {size}px
                </Chip>
              ))}
            </div>
            {out && <p className="mt-2 text-xs text-muted-foreground tabular-nums">{m.output.replace("{w}", String(out.width)).replace("{h}", String(out.height))}</p>}
          </Control>

          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{m.tip}</p>
        </div>
      </div>

      <DialogFooter className="items-center border-t border-border px-6 py-4">
        <Button type="button" variant="ghost" className="sm:mr-auto" onClick={reset} disabled={busy}>
          <Undo2 />
          {m.reset}
        </Button>
        <Button type="button" variant="outline" onClick={onUseOriginal} disabled={busy}>
          {m.useOriginal}
        </Button>
        <Button type="button" loading={busy} disabled={!area} onClick={() => area && onSave({ area, rotation, maxSide, background })}>
          {job.position < job.total ? m.saveNext : m.save}
        </Button>
      </DialogFooter>
    </>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/25")}
    >
      {children}
    </button>
  );
}
