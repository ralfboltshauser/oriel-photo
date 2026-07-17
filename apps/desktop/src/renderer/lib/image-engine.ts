import { DEFAULT_ADJUSTMENTS, type PhotoAdjustments } from '@oriel/domain';

interface RenderOptions {
  maxWidth: number;
  maxHeight: number;
  original?: boolean;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getCroppedDimensions(
  sourceWidth: number,
  sourceHeight: number,
  adjustments: PhotoAdjustments,
) {
  const { aspect, rotation } = adjustments.crop;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  const target =
    aspect === '1:1' ? 1 : aspect === '4:5' ? 4 / 5 : aspect === '16:9' ? 16 / 9 : 0;
  if (target > 0) {
    const sourceAspect = sourceWidth / sourceHeight;
    if (sourceAspect > target) cropWidth = sourceHeight * target;
    else cropHeight = sourceWidth / target;
  }
  const rotated = rotation === 90 || rotation === 270;
  return {
    sourceX: (sourceWidth - cropWidth) / 2,
    sourceY: (sourceHeight - cropHeight) / 2,
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    displayWidth: rotated ? cropHeight : cropWidth,
    displayHeight: rotated ? cropWidth : cropHeight,
  };
}

function applyPixels(data: Uint8ClampedArray, adjustments: PhotoAdjustments): void {
  const exposure = 2 ** adjustments.exposure;
  const contrast = 1 + adjustments.contrast / 100;
  const shadows = adjustments.shadows / 100;
  const highlights = adjustments.highlights / 100;
  const whites = adjustments.whites / 100;
  const blacks = adjustments.blacks / 100;
  const temperature = adjustments.temperature / 100;
  const tint = adjustments.tint / 100;
  const saturation = 1 + adjustments.saturation / 100;
  const vibrance = adjustments.vibrance / 100;

  for (let index = 0; index < data.length; index += 4) {
    let red = (data[index] ?? 0) / 255;
    let green = (data[index + 1] ?? 0) / 255;
    let blue = (data[index + 2] ?? 0) / 255;

    red *= exposure;
    green *= exposure;
    blue *= exposure;

    let luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const shadowMask = (1 - clamp(luminance)) ** 2;
    const highlightMask = clamp(luminance) ** 2;
    const shadowLift = shadows * shadowMask * 0.42;
    const highlightLift = highlights * highlightMask * 0.38;
    const whiteLift = whites * highlightMask * 0.22;
    const blackLift = blacks * shadowMask * 0.22;
    red += shadowLift + highlightLift + whiteLift + blackLift;
    green += shadowLift + highlightLift + whiteLift + blackLift;
    blue += shadowLift + highlightLift + whiteLift + blackLift;

    red = (red - 0.5) * contrast + 0.5;
    green = (green - 0.5) * contrast + 0.5;
    blue = (blue - 0.5) * contrast + 0.5;

    red += temperature * 0.11 + tint * 0.045;
    green -= tint * 0.075;
    blue -= temperature * 0.11 + tint * -0.045;

    luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const currentSaturation = maxChannel - minChannel;
    const vibranceFactor = 1 + vibrance * (1 - clamp(currentSaturation)) * 0.72;
    const saturationFactor = saturation * vibranceFactor;
    red = luminance + (red - luminance) * saturationFactor;
    green = luminance + (green - luminance) * saturationFactor;
    blue = luminance + (blue - luminance) * saturationFactor;

    if (adjustments.monochrome) {
      const mono = red * 0.25 + green * 0.68 + blue * 0.07;
      red = mono;
      green = mono;
      blue = mono;
    }

    data[index] = Math.round(clamp(red) * 255);
    data[index + 1] = Math.round(clamp(green) * 255);
    data[index + 2] = Math.round(clamp(blue) * 255);
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The original could not be decoded'));
    image.src = url;
  });
}

export function renderImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  adjustments: PhotoAdjustments,
  options: RenderOptions,
): void {
  const recipe = options.original ? DEFAULT_ADJUSTMENTS : adjustments;
  const crop = getCroppedDimensions(image.naturalWidth, image.naturalHeight, recipe);
  const scale = Math.min(
    options.maxWidth / crop.displayWidth,
    options.maxHeight / crop.displayHeight,
    1,
  );
  const width = Math.max(1, Math.round(crop.displayWidth * scale));
  const height = Math.max(1, Math.round(crop.displayHeight * scale));
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) throw new Error('Canvas rendering is unavailable');

  context.save();
  if (recipe.crop.rotation !== 0) {
    context.translate(width / 2, height / 2);
    context.rotate((recipe.crop.rotation * Math.PI) / 180);
    const rotated = recipe.crop.rotation === 90 || recipe.crop.rotation === 270;
    context.drawImage(
      image,
      crop.sourceX,
      crop.sourceY,
      crop.sourceWidth,
      crop.sourceHeight,
      (rotated ? -height : -width) / 2,
      (rotated ? -width : -height) / 2,
      rotated ? height : width,
      rotated ? width : height,
    );
  } else {
    context.drawImage(
      image,
      crop.sourceX,
      crop.sourceY,
      crop.sourceWidth,
      crop.sourceHeight,
      0,
      0,
      width,
      height,
    );
  }
  context.restore();

  if (!options.original) {
    const pixels = context.getImageData(0, 0, width, height);
    applyPixels(pixels.data, recipe);
    context.putImageData(pixels, 0, 0);
  }
}

export async function renderPhotoToJpeg(
  url: string,
  adjustments: PhotoAdjustments,
  longEdge: number | null,
  quality: number,
): Promise<Uint8Array> {
  const image = await loadImage(url);
  const canvas = document.createElement('canvas');
  const edge = longEdge ?? Math.max(image.naturalWidth, image.naturalHeight);
  renderImage(canvas, image, adjustments, { maxWidth: edge, maxHeight: edge });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}
