/**
 * Compresses an uploaded image file using an offscreen canvas so multiple
 * high-clarity flower photos fit safely within Firestore document limits.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 960,
  maxBytesLength = 175000,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid image file type');
  }

  const image = await loadImageFromFile(file);
  const { width, height } = fitDimensions(image.width, image.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = '#FAFAF8';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (dataUrl.length > maxBytesLength && quality > 0.42) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > maxBytesLength) {
    const smaller = fitDimensions(width, height, 640);
    canvas.width = smaller.width;
    canvas.height = smaller.height;
    ctx.fillStyle = '#FAFAF8';
    ctx.fillRect(0, 0, smaller.width, smaller.height);
    ctx.drawImage(image, 0, 0, smaller.width, smaller.height);
    dataUrl = canvas.toDataURL('image/jpeg', 0.72);
  }

  return dataUrl;
}

function fitDimensions(
  srcW: number,
  srcH: number,
  maxDim: number,
): { width: number; height: number } {
  if (srcW <= maxDim && srcH <= maxDim) {
    return { width: srcW, height: srcH };
  }
  const scale = maxDim / Math.max(srcW, srcH);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };
    img.src = objectUrl;
  });
}
