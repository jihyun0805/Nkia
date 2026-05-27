"use client"

import { getBackendApiBaseUrl } from "@/lib/api-base-url"
import { buildAuthHeaders } from "@/lib/auth-session"

type ApiResponse<T> = {
  result?: string
  data?: T | null
  errorCode?: string | null
  message?: string | null
}

export type BusinessCardOcrResult = {
  companyName: string | null
  contactName: string | null
  department: string | null
  role: string | null
  position: string | null
  address: string | null
  email: string | null
  mobile: string | null
  phone: string | null
  fax: string | null
  rawText: string | null
}

export const BUSINESS_CARD_IMAGE_MAX_BYTES = 50 * 1024 * 1024
export const BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL = "50MB"

const OCR_UPLOAD_TARGET_MAX_BYTES = 8 * 1024 * 1024
const OCR_IMAGE_MAX_SIDE = 1800
const OCR_IMAGE_MIN_QUALITY = 0.62

export function assertBusinessCardImageSize(file: File) {
  if (file.size > BUSINESS_CARD_IMAGE_MAX_BYTES) {
    throw new Error(`명함 이미지는 ${BUSINESS_CARD_IMAGE_MAX_SIZE_LABEL} 이하만 업로드할 수 있습니다.`)
  }
}

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage)
  }

  if (payload?.result !== "SUCCESS" || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload.data
}

async function prepareBusinessCardOcrFile(file: File) {
  assertBusinessCardImageSize(file)

  if (file.size <= OCR_UPLOAD_TARGET_MAX_BYTES) {
    return file
  }

  const image = await loadImage(file)
  const scale = Math.min(1, OCR_IMAGE_MAX_SIDE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("명함 이미지를 처리할 수 없습니다.")
  }

  context.drawImage(image, 0, 0, width, height)

  let quality = 0.86
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > OCR_UPLOAD_TARGET_MAX_BYTES && quality > OCR_IMAGE_MIN_QUALITY) {
    quality = Math.max(OCR_IMAGE_MIN_QUALITY, quality - 0.08)
    blob = await canvasToBlob(canvas, quality)
  }

  if (blob.size > OCR_UPLOAD_TARGET_MAX_BYTES) {
    throw new Error("명함 이미지를 OCR 처리 가능한 크기로 줄이지 못했습니다.")
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "business-card"
  return new File([blob], `${baseName}-ocr.jpg`, { type: "image/jpeg" })
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("명함 이미지를 읽을 수 없습니다."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("명함 이미지를 불러올 수 없습니다."))
      image.onload = () => resolve(image)
      image.src = String(reader.result ?? "")
    }
    reader.readAsDataURL(file)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error("명함 이미지를 압축할 수 없습니다."))
      },
      "image/jpeg",
      quality,
    )
  })
}

export async function analyzeBusinessCard(file: File) {
  const ocrFile = await prepareBusinessCardOcrFile(file)

  const formData = new FormData()
  formData.append("file", ocrFile)

  const response = await fetch(`${getBackendApiBaseUrl()}/business-card-ocr`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData,
  })

  return parseApiResponse<BusinessCardOcrResult>(response, "명함 OCR 처리에 실패했습니다.")
}
