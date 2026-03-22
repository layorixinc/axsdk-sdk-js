import html2canvas from 'html2canvas';

/**
 * Options for screenshot capture functions.
 */
export interface ScreenshotOptions {
  /** The DOM element to capture. Defaults to `document.documentElement`. */
  element?: HTMLElement;
  /** MIME type for the output image. Defaults to `'image/png'`. */
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Image quality (0–1) for lossy formats like jpeg/webp. Defaults to `0.92`. */
  quality?: number;
  /** Device pixel ratio scale factor. Defaults to `window.devicePixelRatio` or `1`. */
  scale?: number;
}

/**
 * Captures the current browser viewport (or a specified element) as a
 * base64-encoded data URL string.
 *
 * @param options - Optional screenshot configuration.
 * @returns A `Promise<string>` that resolves to a base64 data URL (e.g. `data:image/png;base64,...`).
 *
 * @example
 * ```ts
 * const dataUrl = await captureScreenshot();
 * // dataUrl === 'data:image/png;base64,...'
 * ```
 */
export async function captureScreenshot(options?: ScreenshotOptions): Promise<string> {
  const {
    element = document.documentElement,
    type = 'image/png',
    quality = 0.92,
    scale = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
  } = options ?? {};

  if (typeof document === 'undefined') {
    throw new Error(
      '[axtools] captureScreenshot: This function must be called in a browser environment.'
    );
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
  } catch (err) {
    throw new Error(
      `[axtools] captureScreenshot: html2canvas failed to capture the element. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  try {
    return canvas.toDataURL(type, quality);
  } catch (err) {
    throw new Error(
      `[axtools] captureScreenshot: Failed to convert canvas to data URL. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Captures the current browser viewport (or a specified element) as a `Blob`.
 *
 * @param options - Optional screenshot configuration.
 * @returns A `Promise<Blob>` containing the image data.
 *
 * @example
 * ```ts
 * const blob = await captureScreenshotBlob({ type: 'image/jpeg', quality: 0.8 });
 * const url = URL.createObjectURL(blob);
 * ```
 */
export async function captureScreenshotBlob(options?: ScreenshotOptions): Promise<Blob> {
  const {
    element = document.documentElement,
    type = 'image/png',
    quality = 0.92,
    scale = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
  } = options ?? {};

  if (typeof document === 'undefined') {
    throw new Error(
      '[axtools] captureScreenshotBlob: This function must be called in a browser environment.'
    );
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
  } catch (err) {
    throw new Error(
      `[axtools] captureScreenshotBlob: html2canvas failed to capture the element. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error(
              '[axtools] captureScreenshotBlob: canvas.toBlob returned null — the canvas may be empty or tainted.'
            )
          );
        }
      },
      type,
      quality
    );
  });
}
