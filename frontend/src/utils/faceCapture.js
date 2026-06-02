import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

const TASKS_VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'

let detectorPromise = null

function assertVideoReady(video) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('Camera chưa sẵn sàng để chụp ảnh.')
  }
}

async function createFaceDetector(delegate) {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)

  return FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL,
      delegate,
    },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  })
}

async function getFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = createFaceDetector('GPU').catch(() => createFaceDetector('CPU'))
  }

  return detectorPromise
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getDetectionScore(detection) {
  return Number(detection?.categories?.[0]?.score ?? detection?.score?.[0] ?? 0)
}

function getLargestFace(detections) {
  return detections
    .filter((detection) => detection?.boundingBox)
    .sort((a, b) => {
      const boxA = a.boundingBox
      const boxB = b.boundingBox
      return (boxB.width * boxB.height) - (boxA.width * boxA.height)
    })[0] || null
}

function getSquareCropBox(faceBox, frameWidth, frameHeight, margin) {
  const faceSize = Math.max(faceBox.width, faceBox.height)
  let side = faceSize * (1 + margin * 2)

  side = Math.min(side, frameWidth, frameHeight)

  const centerX = faceBox.originX + faceBox.width / 2
  const centerY = faceBox.originY + faceBox.height / 2
  const x = clamp(centerX - side / 2, 0, frameWidth - side)
  const y = clamp(centerY - side / 2, 0, frameHeight - side)

  return { x, y, side }
}

function canvasToJpegFile(canvas, filenamePrefix, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Không tạo được ảnh khuôn mặt từ camera.'))
        return
      }

      resolve(new File([blob], `${filenamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', quality)
  })
}

function exposeFaceCaptureDebug(payload) {
  if (typeof window === 'undefined') return

  if (window.__lastFaceCapture?.previewUrl) {
    URL.revokeObjectURL(window.__lastFaceCapture.previewUrl)
  }

  const previewUrl = URL.createObjectURL(payload.file)
  window.__lastFaceCapture = {
    ...payload,
    previewUrl,
    openedAt: new Date().toISOString(),
  }

  console.info('Ảnh khuôn mặt FE sẽ gửi lên model:', window.__lastFaceCapture)
  console.info('Mở ảnh crop bằng lệnh: window.open(window.__lastFaceCapture.previewUrl)')
}

export async function captureDetectedFace(video, options = {}) {
  const {
    filenamePrefix = 'face-expression',
    outputSize = 320,
    margin = 0.12,
    jpegQuality = 0.92,
  } = options

  assertVideoReady(video)

  const detector = await getFaceDetector()
  const result = detector.detect(video)
  const face = getLargestFace(result.detections || [])

  if (!face) {
    return {
      ok: false,
      reason: 'NO_FACE',
      message: 'Không thấy khuôn mặt. Con hãy đưa mặt vào khung camera rồi thử lại.',
    }
  }

  const cropBox = getSquareCropBox(face.boundingBox, video.videoWidth, video.videoHeight, margin)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh từ camera.')
  }

  context.drawImage(
    video,
    cropBox.x,
    cropBox.y,
    cropBox.side,
    cropBox.side,
    0,
    0,
    outputSize,
    outputSize,
  )

  const file = await canvasToJpegFile(canvas, filenamePrefix, jpegQuality)
  const faceBox = {
    x: face.boundingBox.originX,
    y: face.boundingBox.originY,
    width: face.boundingBox.width,
    height: face.boundingBox.height,
    score: getDetectionScore(face),
  }

  exposeFaceCaptureDebug({
    file,
    faceBox,
    cropBox,
    sourceSize: {
      width: video.videoWidth,
      height: video.videoHeight,
    },
    outputSize,
  })

  return {
    ok: true,
    file,
    faceBox,
    cropBox,
  }
}
