/**
 * Canvas drawing utilities exported for library consumers.
 */

/** How an image is fitted into a bounding box. */
export type ImageFit = 'contain' | 'cover' | 'fill';

/**
 * Draw an image into a bounding box using contain / cover / fill semantics.
 * Centered when scaled (contain / cover).
 */
export function drawImageFit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  fit: ImageFit,
): void {
  const sw = image.naturalWidth  || image.width;
  const sh = image.naturalHeight || image.height;
  if (sw <= 0 || sh <= 0) return;
  if (fit === 'fill') { ctx.drawImage(image, x, y, w, h); return; }
  const scale = fit === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
  ctx.drawImage(
    image,
    x + (w - sw * scale) * 0.5,
    y + (h - sh * scale) * 0.5,
    sw * scale,
    sh * scale,
  );
}
