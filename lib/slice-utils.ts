/**
 * Slices a spritesheet image into individual frame Blobs using an off-screen canvas.
 * Returns an array of PNG Blobs in row-major order (left→right, top→bottom).
 */
export async function sliceToBlobs(
  imageSrc: string,
  cols: number,
  rows: number,
): Promise<Blob[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const fw = img.naturalWidth / cols
      const fh = img.naturalHeight / rows
      const blobs: Blob[] = []

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const offscreen = document.createElement('canvas')
          offscreen.width = fw
          offscreen.height = fh
          const ctx = offscreen.getContext('2d')
          if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
          ctx.drawImage(img, c * fw, r * fh, fw, fh, 0, 0, fw, fh)

          const blob = await new Promise<Blob | null>((res) =>
            offscreen.toBlob(res, 'image/png'),
          )
          if (!blob) { reject(new Error(`Failed to create blob for frame ${r * cols + c}`)); return }
          blobs.push(blob)
        }
      }
      resolve(blobs)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageSrc
  })
}

/**
 * Packages sliced frame Blobs into a client-side ZIP download via jszip.
 */
export async function downloadAsZip(blobs: Blob[], baseName: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const folder = zip.folder(baseName) ?? zip
  blobs.forEach((blob, i) => {
    folder.file(`frame_${String(i).padStart(3, '0')}.png`, blob)
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}_frames.zip`
  a.click()
  URL.revokeObjectURL(url)
}
