export type StoredFileAttachment = {
  id: string
  name: string
  size: number
  contentType: string
  dataUrl: string
  createdAt: string
}

export function readFileAsStoredAttachment(file: File) {
  return new Promise<StoredFileAttachment>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read attachment file."))
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        dataUrl: typeof reader.result === "string" ? reader.result : "",
        createdAt: new Date().toISOString().slice(0, 10),
      })
    }
    reader.readAsDataURL(file)
  })
}

export function formatAttachmentSize(size: number) {
  return `${Math.ceil(size / 1024).toLocaleString()}KB`
}
