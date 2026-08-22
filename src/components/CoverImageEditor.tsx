import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Props = {
  id: string;
  label: string;
  helperText: string;
  aspectLabel: string;
  actionLabel: string;
  outputSuffix: string;
  outputWidth: number;
  outputHeight: number;
  maxSizeKB: number;
  required?: boolean;
  initialImageUrl?: string | null;
  initialImageName?: string;
  onChange: (file: File | null) => void;
  onPendingChange?: (pending: boolean) => void;
};

type SourceImage = {
  file: File;
  url: string;
  width: number;
  height: number;
  isExisting?: boolean;
};

type EditedImage = {
  fileName: string;
  width: number;
  height: number;
  sizeKB: number;
  format: string;
};

const sliderClass = "w-full accent-blue-600";

function drawCoverCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  outputWidth: number,
  outputHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  rotation: number
) {
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.clearRect(0, 0, outputWidth, outputHeight);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedWidth = image.naturalWidth * cos + image.naturalHeight * sin;
  const rotatedHeight = image.naturalWidth * sin + image.naturalHeight * cos;
  const baseScale = Math.max(outputWidth / rotatedWidth, outputHeight / rotatedHeight);
  const scale = baseScale * zoom;
  const drawWidth = rotatedWidth * scale;
  const drawHeight = rotatedHeight * scale;
  const maxOffsetX = Math.max(0, (drawWidth - outputWidth) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - outputHeight) / 2);
  const dx = (offsetX / 100) * maxOffsetX;
  const dy = (offsetY / 100) * maxOffsetY;

  ctx.imageSmoothingQuality = "high";
  ctx.translate(outputWidth / 2 + dx, outputHeight / 2 + dy);
  ctx.rotate(radians);
  ctx.drawImage(
    image,
    (-image.naturalWidth * scale) / 2,
    (-image.naturalHeight * scale) / 2,
    image.naturalWidth * scale,
    image.naturalHeight * scale
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not export the edited image."));
        },
        type,
        quality
      );
    } catch {
      reject(
        new Error(
          "This existing image cannot be edited in the browser. Choose a new image to replace it."
        )
      );
    }
  });
}

function filenameFromUrl(url: string, fallback: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : fallback;
  } catch {
    return fallback;
  }
}

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  return "png";
}

function fileFromCanvasImage(
  name: string,
  type = "image/png"
) {
  return new File([], name, { type });
}

async function exportedCanvasFile(
  canvas: HTMLCanvasElement,
  filename: string,
  maxBytes: number,
  outputSuffix: string
): Promise<{ file: File; format: string }> {
  const safeBase = filename.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-");
  const baseName = `${safeBase || "cover"}-${outputSuffix}`;
  const pngBlob = await canvasToBlob(canvas, "image/png");

  if (pngBlob.size <= maxBytes) {
    return {
      file: new File([pngBlob], `${baseName}.png`, { type: "image/png" }),
      format: "PNG",
    };
  }

  const fallbackFormats = [
    {
      type: "image/webp",
      extension: "webp",
      label: "WebP",
      qualities: [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56],
    },
    {
      type: "image/jpeg",
      extension: "jpg",
      label: "JPG",
      qualities: [0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54],
    },
  ];

  for (const format of fallbackFormats) {
    for (const quality of format.qualities) {
      const blob = await canvasToBlob(canvas, format.type, quality);
      if (blob.size <= maxBytes) {
        return {
          file: new File([blob], `${baseName}.${format.extension}`, {
            type: format.type,
          }),
          format: format.label,
        };
      }
    }
  }

  throw new Error(
    `Edited image is ${(pngBlob.size / 1024).toFixed(
      0
    )}KB as PNG and could not be compressed under ${Math.round(
      maxBytes / 1024
    )}KB. Try less detail in the frame or a smaller source image.`
  );
}

export default function CoverImageEditor({
  id,
  label,
  helperText,
  aspectLabel,
  actionLabel,
  outputSuffix,
  outputWidth,
  outputHeight,
  maxSizeKB,
  required = false,
  initialImageUrl,
  initialImageName,
  onChange,
  onPendingChange,
}: Props) {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [editedImage, setEditedImage] = useState<EditedImage | null>(null);
  const [editorEnabled, setEditorEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onPendingChangeRef = useRef(onPendingChange);
  const lastExportKeyRef = useRef<string | null>(null);
  const exportingKeyRef = useRef<string | null>(null);

  const aspectRatio = outputWidth / outputHeight;
  const maxBytes = maxSizeKB * 1024;

  const redrawPreview = useCallback(() => {
    if (!imageRef.current || !previewCanvasRef.current) return;
    drawCoverCrop(
      previewCanvasRef.current,
      imageRef.current,
      outputWidth,
      outputHeight,
      zoom,
      offsetX,
      offsetY,
      rotation
    );
  }, [offsetX, offsetY, outputHeight, outputWidth, rotation, zoom]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  }, [onPendingChange]);

  useEffect(() => {
    return () => {
      if (source?.url) URL.revokeObjectURL(source.url);
    };
  }, [source?.url]);

  useEffect(() => {
    if (!initialImageUrl) return;

    let cancelled = false;
    const fallbackName =
      initialImageName ||
      filenameFromUrl(initialImageUrl, `${outputSuffix}-current-cover.png`);

    const loadImage = (
      url: string,
      file: File,
      revokeUrlOnError = false,
      useCors = true
    ) => {
      const image = new Image();
      if (useCors) image.crossOrigin = "anonymous";
      image.onload = () => {
        if (cancelled) {
          if (revokeUrlOnError) URL.revokeObjectURL(url);
          return;
        }
        imageRef.current = image;
        setSource((prev) => {
          if (prev?.url && prev.url !== url) URL.revokeObjectURL(prev.url);
          return {
            file,
            url,
            width: image.naturalWidth,
            height: image.naturalHeight,
            isExisting: true,
          };
        });
        setEditedImage({
          fileName: file.name,
          width: outputWidth,
          height: outputHeight,
          sizeKB: Math.max(1, Math.ceil(file.size / 1024)),
          format: file.type === "image/png" ? "PNG" : file.type === "image/webp" ? "WebP" : "JPG",
        });
        setEditorEnabled(true);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setRotation(0);
        setError(null);
        lastExportKeyRef.current = [
          url,
          outputWidth,
          outputHeight,
          1,
          0,
          0,
          0,
        ].join("|");
        exportingKeyRef.current = null;
        onChangeRef.current(null);
        onPendingChangeRef.current?.(false);
        requestAnimationFrame(() => {
          if (!previewCanvasRef.current) return;
          drawCoverCrop(
            previewCanvasRef.current,
            image,
            outputWidth,
            outputHeight,
            1,
            0,
            0,
            0
          );
        });
      };
      image.onerror = () => {
        if (revokeUrlOnError) URL.revokeObjectURL(url);
        if (useCors && url === initialImageUrl) {
          loadImage(url, file, false, false);
          return;
        }
        if (!cancelled) {
          setError("Could not load the current cover. Choose a new image to replace it.");
          onPendingChangeRef.current?.(false);
        }
      };
      image.src = url;
    };

    const loadExistingImage = async () => {
      try {
        const response = await fetch(initialImageUrl, { mode: "cors" });
        if (!response.ok) throw new Error("Image request failed.");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("Current cover is not an image.");
        if (cancelled) return;
        const extension = extensionForType(blob.type);
        const baseName = fallbackName.replace(/\.[^.]+$/, "");
        const file = new File([blob], `${baseName || "current-cover"}.${extension}`, {
          type: blob.type,
        });
        const objectUrl = URL.createObjectURL(file);
        loadImage(objectUrl, file, true);
      } catch {
        if (cancelled) return;
        loadImage(initialImageUrl, fileFromCanvasImage(fallbackName), false);
      }
    };

    void loadExistingImage();

    return () => {
      cancelled = true;
    };
  }, [
    initialImageUrl,
    initialImageName,
    outputHeight,
    outputSuffix,
    outputWidth,
  ]);

  const clearSource = () => {
    if (source?.url) URL.revokeObjectURL(source.url);
    setSource(null);
    setEditedImage(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
    setEditorEnabled(false);
    setError(null);
    imageRef.current = null;
    lastExportKeyRef.current = null;
    exportingKeyRef.current = null;
    onChangeRef.current(null);
    onPendingChangeRef.current?.(false);
  };

  const markCoverDirty = () => {
    setSource((prev) => (prev?.isExisting ? { ...prev, isExisting: false } : prev));
  };

  const exportCurrentCover = useCallback(async (force = false) => {
    if (!source || !imageRef.current) {
      setError("Choose an image first.");
      return;
    }

    const exportKey = [
      source.url,
      outputWidth,
      outputHeight,
      zoom,
      offsetX,
      offsetY,
      rotation,
    ].join("|");
    if (!force && lastExportKeyRef.current === exportKey) return;
    if (exportingKeyRef.current === exportKey) return;

    exportingKeyRef.current = exportKey;
    setProcessing(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      drawCoverCrop(
        canvas,
        imageRef.current,
        outputWidth,
        outputHeight,
        zoom,
        offsetX,
        offsetY,
        rotation
      );
      const { file: edited, format } = await exportedCanvasFile(
        canvas,
        source.file.name,
        maxBytes,
        outputSuffix
      );
      setEditedImage({
        fileName: edited.name,
        width: outputWidth,
        height: outputHeight,
        sizeKB: Math.ceil(edited.size / 1024),
        format,
      });
      lastExportKeyRef.current = exportKey;
      onChangeRef.current(edited);
      onPendingChangeRef.current?.(false);
    } catch (err) {
      setEditedImage(null);
      setError(err instanceof Error ? err.message : "Could not edit this image.");
      onChangeRef.current(null);
      onPendingChangeRef.current?.(true);
    } finally {
      if (exportingKeyRef.current === exportKey) {
        exportingKeyRef.current = null;
      }
      setProcessing(false);
    }
  }, [
    maxBytes,
    offsetX,
    offsetY,
    outputHeight,
    outputWidth,
    outputSuffix,
    rotation,
    source,
    zoom,
  ]);

  useEffect(() => {
    if (!editorEnabled || !source) return;
    const timer = window.setTimeout(() => {
      void exportCurrentCover();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [editorEnabled, exportCurrentCover, source]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, or WebP image.");
      onChangeRef.current(null);
      onPendingChangeRef.current?.(false);
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (source?.url) URL.revokeObjectURL(source.url);
      imageRef.current = image;
      setSource({
        file,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setEditedImage(null);
      setEditorEnabled(false);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setError(null);
      lastExportKeyRef.current = null;
      exportingKeyRef.current = null;
      onChangeRef.current(null);
      onPendingChangeRef.current?.(true);
      requestAnimationFrame(redrawPreview);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Invalid image file.");
      onChangeRef.current(null);
      onPendingChangeRef.current?.(false);
    };
    image.src = url;
  };

  const handleMakeCover = async () => {
    setEditorEnabled(true);
    await exportCurrentCover(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#3a3028] dark:bg-[#18120f]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label
            htmlFor={id}
            className="block text-sm font-semibold text-slate-800 dark:text-stone-100"
          >
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-stone-400">
            {helperText}
          </p>
        </div>
        <label
          htmlFor={id}
          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#4b3d33] dark:bg-[#241d19] dark:text-stone-100 dark:hover:bg-[#2c231d]"
        >
          Choose image
        </label>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {source ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div>
            <div className="relative overflow-hidden rounded-xl border-2 border-blue-500 bg-white shadow-sm dark:bg-[#241d19]">
              <canvas
                ref={previewCanvasRef}
                className="w-full object-cover"
                style={{ aspectRatio }}
              />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-1/3 border-t border-white/80 shadow-[0_1px_0_rgba(15,23,42,0.45)]" />
                <div className="absolute inset-x-0 top-2/3 border-t border-white/80 shadow-[0_1px_0_rgba(15,23,42,0.45)]" />
                <div className="absolute inset-y-0 left-1/3 border-l border-white/80 shadow-[1px_0_0_rgba(15,23,42,0.45)]" />
                <div className="absolute inset-y-0 left-2/3 border-l border-white/80 shadow-[1px_0_0_rgba(15,23,42,0.45)]" />
                <div className="absolute left-2 top-2 rounded bg-slate-950/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {aspectLabel}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-stone-400">
              This frame is the exact cover that will be uploaded.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white p-3 text-xs text-slate-600 dark:bg-[#241d19] dark:text-stone-300">
              <p>
                Source: {source.isExisting ? "current cover" : source.file.name} ({source.width}x{source.height})
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Output ratio: {aspectLabel}
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Output size: {outputWidth}x{outputHeight}
                </div>
                <div
                  className={`rounded-lg border px-2 py-1.5 font-semibold ${
                    editedImage
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200"
                  }`}
                >
                  {editedImage
                    ? source.isExisting && !processing
                      ? `Current file: ${editedImage.sizeKB}KB`
                      : `Output file: ${editedImage.sizeKB}KB`
                    : `Limit: < ${maxSizeKB}KB`}
                </div>
              </div>
              {editedImage ? (
                <p className="mt-3 font-semibold text-emerald-700 dark:text-emerald-300">
                  {source.isExisting ? "Current cover ready" : "Ready"}: {editedImage.fileName} ({editedImage.width}x
                  {editedImage.height}, {editedImage.sizeKB}KB,{" "}
                  {editedImage.format})
                </p>
              ) : editorEnabled ? (
                <p className="mt-3 font-semibold text-amber-700 dark:text-amber-300">
                  {processing
                    ? "Updating the valid cover file..."
                    : "Move the sliders to choose what stays visible."}
                </p>
              ) : (
                <p className="mt-3 font-semibold text-amber-700 dark:text-amber-300">
                  Click the button below to make this image meet the cover requirements.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Rotate
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                disabled={!editorEnabled}
                onChange={(event) => {
                  setRotation(Number(event.target.value));
                  if (editorEnabled) setEditedImage(null);
                  markCoverDirty();
                  onChangeRef.current(null);
                  onPendingChangeRef.current?.(true);
                }}
                className={`${sliderClass} disabled:opacity-40`}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[-90, 0, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!editorEnabled}
                    onClick={() => {
                      setRotation(value);
                      if (editorEnabled) setEditedImage(null);
                      markCoverDirty();
                      onChangeRef.current(null);
                      onPendingChangeRef.current?.(true);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-[#4b3d33] dark:bg-[#241d19] dark:text-stone-100 dark:hover:bg-[#2c231d]"
                  >
                    {value === 0 ? "0 deg" : `${value} deg`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Zoom
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                disabled={!editorEnabled}
                onChange={(event) => {
                  setZoom(Number(event.target.value));
                  if (editorEnabled) setEditedImage(null);
                  markCoverDirty();
                  onChangeRef.current(null);
                  onPendingChangeRef.current?.(true);
                }}
                className={`${sliderClass} disabled:opacity-40`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Horizontal position
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={offsetX}
                disabled={!editorEnabled}
                onChange={(event) => {
                  setOffsetX(Number(event.target.value));
                  if (editorEnabled) setEditedImage(null);
                  markCoverDirty();
                  onChangeRef.current(null);
                  onPendingChangeRef.current?.(true);
                }}
                className={`${sliderClass} disabled:opacity-40`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Vertical position
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={offsetY}
                disabled={!editorEnabled}
                onChange={(event) => {
                  setOffsetY(Number(event.target.value));
                  if (editorEnabled) setEditedImage(null);
                  markCoverDirty();
                  onChangeRef.current(null);
                  onPendingChangeRef.current?.(true);
                }}
                className={`${sliderClass} disabled:opacity-40`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleMakeCover}
                disabled={processing || Boolean(editedImage)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {processing
                  ? "Making cover..."
                  : editedImage
                  ? "Cover ready"
                  : actionLabel}
              </button>
              <button
                type="button"
                onClick={clearSource}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#4b3d33] dark:bg-[#241d19] dark:text-stone-100 dark:hover:bg-[#2c231d]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
