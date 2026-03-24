// src/lib/screenshot.ts

/**
 * Capture the R3F canvas and trigger a download (or native share on mobile).
 * REQUIRES: <Canvas gl={{ preserveDrawingBuffer: true }}> to work.
 */
export function captureScreenshot(canvas: HTMLCanvasElement): void {
  const dataURL = canvas.toDataURL("image/png");
  const filename = `semantic-galaxy-${Date.now()}.png`;

  // Try native share on mobile
  if (navigator.share && typeof navigator.canShare === "function") {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], filename, { type: "image/png" });
      try {
        await navigator.share({ files: [file], title: "Semantic Galaxy" });
        return;
      } catch {
        // Share cancelled or unsupported — fall through to download
      }
    });
    return;
  }

  // Fallback: download link
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  link.click();
}
