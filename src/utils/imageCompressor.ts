/**
 * Utility to resize and compress images client-side.
 * Resizes the image to have a maximum dimension of maxDim (default 1024px) while preserving aspect ratio,
 * and compresses it to a JPEG format with 85% quality.
 */
export function resizeImage(base64Str: string, maxDim: number = 1024): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    // If the input is empty or invalid, return it directly
    if (!base64Str || !base64Str.startsWith("data:")) {
      resolve({ base64: base64Str, mimeType: "image/jpeg" });
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if one of the dimensions exceeds maxDim
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      } else {
        // If image is already smaller than maxDim, still convert/compress to keep payload light
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ base64: base64Str, mimeType: "image/jpeg" });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Output as JPEG with 85% quality for excellent size-to-clarity ratio
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      
      resolve({
        base64: compressedDataUrl,
        mimeType: "image/jpeg"
      });
    };

    img.onerror = (err) => {
      reject(err);
    };

    img.src = base64Str;
  });
}
