"use client";

import { ChevronLeft, ChevronRight, Crop, GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageCropDialog, type CropJob } from "@/components/admin/image-crop-dialog";
import { Badge } from "@/components/ui/primitives";
import { fetchUploadedImage, uploadImage } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/client";
import { blobToFile, prepareOriginal, renderImage, UPLOAD_MAX_BYTES, type RenderOptions } from "@/lib/image-tools";
import { cn } from "@/lib/utils";

type Folder = "products" | "banners" | "brands";

interface QueueEntry {
  id: string;
  file: File;
  src: string;
  /** URL of the saved photo this edit replaces. */
  replaces?: string;
}

interface Pending {
  id: string;
  src: string;
  replaces?: string;
}

let seq = 0;
const nextId = () => `img-${++seq}`;

/**
 * Product photo gallery: pick or drop several files, crop/rotate/resize each
 * one, then it uploads in the background while you edit the next. Drag to
 * reorder; the first photo is the cover.
 */
export function ImageManager({ images, onChange, folder = "products" }: { images: string[]; onChange: (update: (current: string[]) => string[]) => void; folder?: Folder }) {
  const { t } = useT();
  const m = t.admin.products.images;
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [batch, setBatch] = useState({ done: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const current = queue[0];
  const job: CropJob | null = current
    ? {
        id: current.id,
        src: current.src,
        name: current.file.name,
        position: batch.done + 1,
        total: batch.total,
        existing: !!current.replaces,
      }
    : null;

  const enqueue = (entries: QueueEntry[]) => {
    if (!entries.length) return;
    setBatch((b) => (queue.length ? { ...b, total: b.total + entries.length } : { done: 0, total: entries.length }));
    setQueue((q) => [...q, ...entries]);
  };

  const addFiles = (files: FileList | File[] | null) => {
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    enqueue(
      picked.map((file) => ({
        id: nextId(),
        file,
        src: URL.createObjectURL(file),
      })),
    );
  };

  const editExisting = async (url: string) => {
    try {
      const blob = await fetchUploadedImage(url);
      const file = new File([blob], url.split("/").pop() ?? "photo", {
        type: blob.type,
      });
      enqueue([{ id: nextId(), file, src: URL.createObjectURL(blob), replaces: url }]);
    } catch {
      toast.error(m.loadFailed);
    }
  };

  /** Finish the photo on screen and move to the next one. */
  const advance = () => {
    setQueue((q) => q.slice(1));
    setBatch((b) => ({ ...b, done: b.done + 1 }));
  };

  const cancel = () => {
    queue.forEach((e) => URL.revokeObjectURL(e.src));
    setQueue([]);
    setBatch({ done: 0, total: 0 });
  };

  const upload = async (entry: QueueEntry, file: File) => {
    const preview = URL.createObjectURL(file);
    URL.revokeObjectURL(entry.src);
    if (file.size > UPLOAD_MAX_BYTES) {
      toast.error(m.tooLarge.replace("{name}", entry.file.name));
      URL.revokeObjectURL(preview);
      return;
    }
    setPending((p) => [...p, { id: entry.id, src: preview, replaces: entry.replaces }]);
    try {
      const url = await uploadImage(file, folder);
      onChange((cur) => (entry.replaces && cur.includes(entry.replaces) ? cur.map((x) => (x === entry.replaces ? url : x)) : [...cur, url]));
    } catch (err) {
      toast.error(apiErrorMessage(err, t));
    } finally {
      setPending((p) => p.filter((x) => x.id !== entry.id));
      URL.revokeObjectURL(preview);
    }
  };

  const finish = async (make: (entry: QueueEntry) => Promise<File>) => {
    if (!current) return;
    setBusy(true);
    try {
      const file = await make(current);
      advance();
      void upload(current, file);
    } catch {
      toast.error(m.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const save = (options: RenderOptions) => finish(async (e) => blobToFile(await renderImage(e.src, options), e.file.name));
  const keepOriginal = () => finish((e) => prepareOriginal(e.file, e.src));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    onChange((cur) => {
      const next = [...cur];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");
  const newUploads = pending.filter((p) => !p.replaces);

  return (
    <div
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        setFileOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileOver(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        setFileOver(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn("rounded-2xl transition", fileOver && "ring-2 ring-primary ring-offset-4 ring-offset-card")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {images.length === 0 && newUploads.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-14 text-center transition hover:border-primary/50 hover:bg-primary-soft/20"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ImagePlus className="size-7" />
          </span>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{t.admin.products.mediaHint}</p>
        </button>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {images.map((src, i) => {
              const replacing = pending.some((p) => p.replaces === src);
              return (
                <li
                  key={src}
                  draggable
                  onDragStart={(e) => {
                    setDragFrom(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (dragFrom === null || isFileDrag(e)) return;
                    e.preventDefault();
                    if (dragFrom !== i) {
                      move(dragFrom, i);
                      setDragFrom(i);
                    }
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className={cn(
                    "group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-border bg-white active:cursor-grabbing",
                    i === 0 && "col-span-2 row-span-2",
                    dragFrom === i && "opacity-40",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo served from the API's storage */}
                  <img src={src} alt="" draggable={false} className="size-full object-contain" />
                  {i === 0 && (
                    <Badge className="absolute top-2 left-2 gap-1">
                      <Star className="size-3 fill-current" />
                      {m.cover}
                    </Badge>
                  )}
                  <GripVertical className="absolute top-2 right-2 size-4 text-neutral-400 opacity-0 transition group-hover:opacity-100" />
                  {replacing && <Spinner />}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-linear-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                    <TileButton label={m.edit} onClick={() => editExisting(src)} disabled={replacing}>
                      <Crop />
                    </TileButton>
                    {i > 0 && (
                      <TileButton label={m.makeCover} onClick={() => move(i, 0)}>
                        <Star />
                      </TileButton>
                    )}
                    <TileButton label={m.moveLeft} onClick={() => move(i, i - 1)} disabled={i === 0}>
                      <ChevronLeft />
                    </TileButton>
                    <TileButton label={m.moveRight} onClick={() => move(i, i + 1)} disabled={i === images.length - 1}>
                      <ChevronRight />
                    </TileButton>
                    <TileButton label={t.admin.common.delete} onClick={() => onChange((cur) => cur.filter((x) => x !== src))} danger>
                      <Trash2 />
                    </TileButton>
                  </div>
                </li>
              );
            })}
            {newUploads.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview while uploading */}
                <img src={p.src} alt="" className="size-full object-contain opacity-60" />
                <Spinner label={m.uploading} />
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                <ImagePlus className="size-6" />
                {m.add}
              </button>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{m.reorderHint}</p>
        </>
      )}

      <ImageCropDialog job={job} busy={busy} onSave={save} onUseOriginal={keepOriginal} onCancel={cancel} />
    </div>
  );
}

function TileButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-full bg-white/95 text-neutral-900 shadow-sm transition hover:scale-105 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        danger && "hover:bg-destructive hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/50 dark:bg-black/40">
      <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
        <Loader2 className="size-3.5 animate-spin" />
        {label}
      </span>
    </div>
  );
}
