import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
  element?: HTMLElement;
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
  scale?: number;
}

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
