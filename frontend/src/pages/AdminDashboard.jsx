import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiBarChart2,
  FiBookOpen,
  FiEdit2,
  FiGift,
  FiLogOut,
  FiPlus,
  FiSave,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { adminApi, authApi, clearSession, getSession, resolveMediaUrl } from '../services/api'
import ConfirmationModal from '../components/ConfirmationModal'
import '../styles/Admin.css'

const emptyContentForm = {
  title: '',
  type: 'LECTURE',
  status: 'PUBLISHED',
  description: '',
  mediaUrl: '',
  mediaPreviewUrl: '',
  mediaMimeType: '',
  answerEmotions: 'JOY,NEUTRAL,FEAR,SAD,ANGRY',
  correctEmotion: 'JOY',
  gameKind: 'CHOOSE_EMOTION',
  gameQuestion: '',
  gamePromptImageUrl: '',
  gamePromptPreviewUrl: '',
  gameOptions: [
    { label: 'Vui', emotion: 'JOY', value: 'JOY', imageUrl: '', src: '😊' },
    { label: 'Buồn', emotion: 'SAD', value: 'SAD', imageUrl: '', src: '😢' },
    { label: 'Tức giận', emotion: 'ANGRY', value: 'ANGRY', imageUrl: '', src: '😡' },
    { label: 'Bình thường', emotion: 'NEUTRAL', value: 'NEUTRAL', imageUrl: '', src: '🙂' },
  ],
  gameCorrectIndex: 0,
  gameCorrectIndexes: [2],
  targetEmotion: 'JOY',
  timeLimitSeconds: 60,
  difficultyLevel: 1,
  unlockStarCost: 0,
  mediaFile: null,
  gamePromptFile: null,
}

const emptyPetForm = {
  name: '',
  description: '',
  imageUrl: '',
  animationUrl: '',
  unlockStarCost: 100,
  status: 'ACTIVE',
  imageFile: null,
  imagePreviewUrl: '',
}

const reactionOptionDetails = {
  LEAVE: { label: 'Bỏ đi', emotion: 'NEUTRAL', src: '🚶' },
  LAUGH: { label: 'Cười', emotion: 'JOY', src: '😆' },
  COMFORT: { label: 'An ủi', emotion: 'NEUTRAL', src: '🤝' },
}

function getDefaultGameOptions(kind) {
  if (kind === 'CHOOSE_REACTION') {
    return Object.entries(reactionOptionDetails).map(([value, detail]) => ({
      label: detail.label,
      emotion: detail.emotion,
      value,
      imageUrl: '',
      src: detail.src,
    }))
  }

  return [
    { label: 'Vui', emotion: 'JOY', value: 'JOY', imageUrl: '', src: '😊' },
    { label: 'Buồn', emotion: 'SAD', value: 'SAD', imageUrl: '', src: '😢' },
    { label: 'Tức giận', emotion: 'ANGRY', value: 'ANGRY', imageUrl: '', src: '😡' },
    { label: 'Bình thường', emotion: 'NEUTRAL', value: 'NEUTRAL', imageUrl: '', src: '🙂' },
  ]
}

function normalizeGameKind(value) {
  if (value === 'CHOOSE_REACTION') return value
  return 'CHOOSE_EMOTION'
}

function normalizeGameOptions(kind, options) {
  const defaults = getDefaultGameOptions(kind)
  const source = Array.isArray(options) && options.length ? options : defaults
  const targetLength = kind === 'CHOOSE_REACTION' ? 3 : 4

  return Array.from({ length: targetLength }).map((_, index) => {
    const option = source[index] || defaults[index] || {}
    if (kind === 'CHOOSE_REACTION') {
      const value = String(option.value || defaults[index]?.value || `OPTION_${index + 1}`).trim().toUpperCase()
      const reactionDetail = reactionOptionDetails[value] || {}
      return {
        label: option.label || reactionDetail.label || defaults[index]?.label || `Đáp án ${index + 1}`,
        emotion: reactionDetail.emotion || option.emotion || defaults[index]?.emotion || 'NEUTRAL',
        value,
        imageUrl: '',
        previewUrl: '',
        src: reactionDetail.src || option.src || defaults[index]?.src || '🙂',
      }
    }

    return {
      label: option.label || defaults[index]?.label || `Đáp án ${index + 1}`,
      emotion: option.emotion || option.value || defaults[index]?.emotion || 'CALM',
      value: option.value || option.emotion || defaults[index]?.value || `OPTION_${index + 1}`,
      imageUrl: option.imageUrl || '',
      imageFile: option.imageFile || null,
      previewUrl: option.previewUrl || option.resolvedImageUrl || '',
      src: option.src || defaults[index]?.src || '',
    }
  })
}

function buildGameConfig(form) {
  const kind = normalizeGameKind(form.gameKind)

  const options = normalizeGameOptions(kind, form.gameOptions).map((option) => ({
    label: option.label.trim(),
    emotion: option.emotion.trim().toUpperCase(),
    value: option.value.trim(),
    imageUrl: option.imageUrl.trim(),
    src: option.src.trim(),
  }))

  if (kind === 'CHOOSE_REACTION') {
    return {
      kind,
      question: form.gameQuestion.trim(),
      promptImageUrl: form.gamePromptImageUrl.trim(),
      options,
      correctIndexes: form.gameCorrectIndexes,
    }
  }

  return {
    kind,
    question: form.gameQuestion.trim(),
    description: form.description.trim(),
    options,
    correctIndex: Number(form.gameCorrectIndex) || 0,
  }
}

function getGameTargetEmotion(form) {
  return normalizeTargetEmotion(form.targetEmotion)
}

function buildContentPayload(form) {
  const base = {
    title: form.title.trim(),
    type: form.type,
    status: form.status,
  }

  if (form.type === 'LECTURE') {
    return {
      ...base,
      lecture: {
        mediaUrl: form.mediaUrl || undefined,
        description: form.description || null,
        difficultyLevel: Number(form.difficultyLevel),
        isDefault: false,
      },
    }
  }

  if (form.type === 'QUIZ') {
    const answerEmotions = getQuizAnswerEmotions(form.answerEmotions)
    const correctEmotion = normalizeTargetEmotion(form.correctEmotion)

    return {
      ...base,
      quiz: {
        mediaUrl: form.mediaUrl || undefined,
        description: form.description || null,
        difficultyLevel: Number(form.difficultyLevel),
        isDefault: false,
        answerEmotions,
        correctEmotion: answerEmotions.includes(correctEmotion) ? correctEmotion : answerEmotions[0],
      },
    }
  }

  return {
    ...base,
    game: {
      targetEmotion: getGameTargetEmotion(form),
      timeLimitSeconds: Number(form.timeLimitSeconds),
      difficultyLevel: Number(form.difficultyLevel),
      isDefault: false,
      unlockStarCost: Number(form.unlockStarCost),
      promptAssetType: form.gamePromptImageUrl || form.mediaUrl ? 'IMAGE' : null,
      promptAssetUrl: form.gamePromptImageUrl || form.mediaUrl || null,
      config: buildGameConfig(form),
    },
  }
}

function toContentForm(content) {
  const gameConfig = content.game?.config || {}
  const gameKind = normalizeGameKind(gameConfig.kind)
  const correctIndexes = Array.isArray(gameConfig.correctIndexes)
    ? gameConfig.correctIndexes.map((item) => Number(item)).filter((item) => Number.isInteger(item))
    : [2]
  const mediaUrl = content.lecture?.media_url || content.quiz?.media_url || content.game?.prompt_asset_url || ''

  return {
    title: content.title || '',
    type: content.type || 'GAME',
    status: content.status || 'PUBLISHED',
    description: content.lecture?.description || content.quiz?.description || '',
    mediaUrl,
    mediaPreviewUrl: mediaUrl,
    mediaMimeType: content.lecture?.media_mime_type || content.quiz?.media_mime_type || content.game?.prompt_asset_mime_type || '',
    answerEmotions: (content.quiz?.answer_emotions || targetEmotionOptions).map((item) => normalizeTargetEmotion(item)).join(','),
    correctEmotion: normalizeTargetEmotion(content.quiz?.correct_emotion),
    gameKind,
    gameQuestion: gameConfig.question || '',
    gamePromptImageUrl: gameConfig.promptImageUrl || content.game?.prompt_asset_url || '',
    gamePromptPreviewUrl: gameConfig.promptPreviewUrl || gameConfig.promptImageUrl || content.game?.prompt_asset_url || '',
    gameOptions: normalizeGameOptions(gameKind, gameConfig.options),
    gameCorrectIndex: Number.isInteger(gameConfig.correctIndex) ? gameConfig.correctIndex : 0,
    gameCorrectIndexes: correctIndexes,
    targetEmotion: normalizeTargetEmotion(content.game?.target_emotion),
    timeLimitSeconds: content.game?.time_limit_seconds || 60,
    difficultyLevel: getContentDifficulty(content),
    unlockStarCost: getContentUnlockCost(content) || 0,
    mediaFile: null,
    gamePromptFile: null,
  }
}

function toPetForm(pet) {
  return {
    name: pet.name || '',
    description: pet.description || '',
    imageUrl: pet.image_url || '',
    animationUrl: pet.animation_url || '',
    unlockStarCost: pet.unlock_star_cost || 0,
    status: pet.status || 'ACTIVE',
    imageFile: null,
    imagePreviewUrl: '',
  }
}

function getContentMediaPurpose(type) {
  if (type === 'LECTURE') return 'lecture-media'
  if (type === 'QUIZ') return 'quiz-media'
  return 'game-media'
}

const contentTypeLabels = {
  GAME: 'Trò chơi',
  QUIZ: 'Câu hỏi',
  LECTURE: 'Bài học',
}

const contentStatusLabels = {
  PUBLISHED: 'Đã xuất bản',
  DRAFT: 'Bản nháp',
}

const petStatusLabels = {
  ACTIVE: 'Đang bán',
  HIDDEN: 'Đã ẩn',
}

const roleLabels = {
  PARENT: 'Phụ huynh',
  ADMIN: 'Quản trị viên',
}

const userStatusLabels = {
  ACTIVE: 'Đang hoạt động',
  BANNED: 'Đã khóa',
}

const difficultyOptions = [
  { value: 1, label: 'Dễ' },
  { value: 2, label: 'Trung bình' },
  { value: 3, label: 'Khó' },
]

const targetEmotionOptions = ['JOY', 'NEUTRAL', 'FEAR', 'SAD', 'ANGRY']
const reactionCodeOptions = Object.keys(reactionOptionDetails)

function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

function normalizeTargetEmotion(value, fallback = 'JOY') {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'HAPPY') return 'JOY'
  if (normalized === 'CALM') return 'NEUTRAL'
  if (normalized === 'SCARED') return 'FEAR'
  return targetEmotionOptions.includes(normalized) ? normalized : fallback
}

function getQuizAnswerEmotions(value) {
  const emotions = String(value || '')
    .split(',')
    .map((item) => normalizeTargetEmotion(item, ''))
    .filter((item) => targetEmotionOptions.includes(item))

  return Array.from(new Set(emotions))
}

function isObjectUrl(value) {
  return String(value || '').startsWith('blob:')
}

function getMediaKind(source, mimeType = '') {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase()
  if (normalizedMimeType.startsWith('video/')) return 'video'
  if (normalizedMimeType.startsWith('image/')) return 'image'

  const path = String(source || '').split(/[?#]/)[0].toLowerCase()
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(path)) return 'video'
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return 'image'

  return null
}

function getDropdownOptions(baseOptions, currentValue) {
  const normalizedCurrent = String(currentValue || '').trim().toUpperCase()
  if (!normalizedCurrent || baseOptions.includes(normalizedCurrent)) return baseOptions
  return [...baseOptions, normalizedCurrent]
}

function getContentDifficulty(content) {
  return content.difficulty_level || content.lecture?.difficulty_level || content.quiz?.difficulty_level || content.game?.difficulty_level || 1
}

function getContentUnlockCost(content) {
  if (content.type !== 'GAME') return null
  return content.unlock_star_cost ?? content.game?.unlock_star_cost ?? 0
}

const emotionLabels = {
  HAPPY: 'Vui vẻ',
  SAD: 'Buồn',
  ANGRY: 'Tức giận',
  STRESSED: 'Căng thẳng',
  CALM: 'Bình tĩnh',
  NEUTRAL: 'Trung tính',
  SCARED: 'Sợ hãi',
  SURPRISED: 'Ngạc nhiên',
}

function AdminField({ label, hint, children, className = '' }) {
  return (
    <div className={`admin-field ${className}`.trim()}>
      <span className="admin-field-label">{label}</span>
      {children}
      {hint && <small className="admin-field-hint">{hint}</small>}
    </div>
  )
}

function StatCard({ label, value, hint }) {
  return (
    <div className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function AdminContentMediaPreview({ source, mimeType, title, onClear }) {
  const [failedSource, setFailedSource] = useState('')
  const mediaKind = getMediaKind(source, mimeType)
  const fallbackVisible = failedSource === source

  if (!source) return null

  return (
    <div className="admin-content-media-preview">
      {fallbackVisible || !mediaKind ? (
        <a className="admin-content-media-fallback" href={source} target="_blank" rel="noreferrer">
          Media đã chọn
        </a>
      ) : mediaKind === 'video' ? (
        <video
          src={source}
          controls
          preload="metadata"
          playsInline
          aria-label={`Video ${title}`}
          onError={() => setFailedSource(source)}
        />
      ) : (
        <img src={source} alt={`Media ${title}`} onError={() => setFailedSource(source)} />
      )}
      <button
        type="button"
        className="admin-content-media-preview-remove"
        onClick={onClear}
        aria-label="Xóa media đã chọn"
        title="Xóa media đã chọn"
      >
        <FiX aria-hidden="true" />
      </button>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const session = getSession()
  const [activeTab, setActiveTab] = useState('analytics')
  const [analytics, setAnalytics] = useState(null)
  const [contents, setContents] = useState([])
  const [pets, setPets] = useState([])
  const [users, setUsers] = useState([])
  const [contentForm, setContentForm] = useState(emptyContentForm)
  const [petForm, setPetForm] = useState(emptyPetForm)
  const [editingContentId, setEditingContentId] = useState('')
  const [editingPetId, setEditingPetId] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editContentForm, setEditContentForm] = useState(emptyContentForm)
  const [isEditPetModalOpen, setIsEditPetModalOpen] = useState(false)
  const [editPetForm, setEditPetForm] = useState(emptyPetForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [petMediaUploading, setPetMediaUploading] = useState(false)

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const triggerDeleteConfirmation = ({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    })
  }

  const userName = session?.user?.full_name || session?.user?.email || 'Quản trị viên'
  const tabs = [
    { id: 'analytics', label: 'Tổng quan', icon: <FiBarChart2 aria-hidden="true" /> },
    { id: 'contents', label: 'Nội dung học', icon: <FiBookOpen aria-hidden="true" /> },
    { id: 'pets', label: 'Cửa hàng pet', icon: <FiGift aria-hidden="true" /> },
    { id: 'users', label: 'Người dùng', icon: <FiUsers aria-hidden="true" /> },
  ]

  const loadAdminData = async () => {
    try {
      setLoading(true)
      setError('')
      const [analyticsResult, contentResult, petResult, userResult] = await Promise.all([
        adminApi.analytics(),
        adminApi.listContents({ limit: 100 }),
        adminApi.listPets({ limit: 100 }),
        adminApi.listUsers({ limit: 100 }),
      ])

      setAnalytics(analyticsResult)
      setContents(contentResult.contents || [])
      setPets(petResult.pets || [])
      setUsers(userResult.users || [])
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError('')
        const [analyticsResult, contentResult, petResult, userResult] = await Promise.all([
          adminApi.analytics(),
          adminApi.listContents({ limit: 100 }),
          adminApi.listPets({ limit: 100 }),
          adminApi.listUsers({ limit: 100 }),
        ])

        if (!mounted) return
        setAnalytics(analyticsResult)
        setContents(contentResult.contents || [])
        setPets(petResult.pets || [])
        setUsers(userResult.users || [])
      } catch (err) {
        if (mounted) setError(err.message || 'Không tải được dữ liệu admin.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!message && !error) return undefined
    const timer = setTimeout(() => {
      setMessage('')
      setError('')
    }, 3500)
    return () => clearTimeout(timer)
  }, [message, error])

  useEffect(() => {
    const mediaPreviewUrl = contentForm.mediaPreviewUrl
    return () => {
      if (isObjectUrl(mediaPreviewUrl)) {
        URL.revokeObjectURL(mediaPreviewUrl)
      }
    }
  }, [contentForm.mediaPreviewUrl])

  useEffect(() => {
    const imagePreviewUrl = petForm.imagePreviewUrl
    return () => {
      if (isObjectUrl(imagePreviewUrl)) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [petForm.imagePreviewUrl])

  useEffect(() => {
    const imagePreviewUrl = editPetForm.imagePreviewUrl
    return () => {
      if (isObjectUrl(imagePreviewUrl)) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [editPetForm.imagePreviewUrl])

  useEffect(() => {
    const gamePromptPreviewUrl = contentForm.gamePromptPreviewUrl
    return () => {
      if (isObjectUrl(gamePromptPreviewUrl)) {
        URL.revokeObjectURL(gamePromptPreviewUrl)
      }
    }
  }, [contentForm.gamePromptPreviewUrl])

  useEffect(() => {
    const mediaPreviewUrl = editContentForm.mediaPreviewUrl
    return () => {
      if (isObjectUrl(mediaPreviewUrl)) {
        URL.revokeObjectURL(mediaPreviewUrl)
      }
    }
  }, [editContentForm.mediaPreviewUrl])

  useEffect(() => {
    const gamePromptPreviewUrl = editContentForm.gamePromptPreviewUrl
    return () => {
      if (isObjectUrl(gamePromptPreviewUrl)) {
        URL.revokeObjectURL(gamePromptPreviewUrl)
      }
    }
  }, [editContentForm.gamePromptPreviewUrl])

  const handleLogout = async () => {
    try {
      await authApi.signOut()
    } catch {
      // Local logout still clears the session if the server is unavailable.
    } finally {
      clearSession()
      navigate('/login')
    }
  }

  const resetContentForm = () => {
    if (isObjectUrl(contentForm.mediaPreviewUrl)) {
      URL.revokeObjectURL(contentForm.mediaPreviewUrl)
    }
    if (isObjectUrl(contentForm.gamePromptPreviewUrl)) {
      URL.revokeObjectURL(contentForm.gamePromptPreviewUrl)
    }
    normalizeGameOptions(contentForm.gameKind, contentForm.gameOptions).forEach((option) => {
      if (isObjectUrl(option.previewUrl)) {
        URL.revokeObjectURL(option.previewUrl)
      }
    })
    setContentForm(emptyContentForm)
    setEditingContentId('')
  }

  const handleContentSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      
      let mediaUrl = contentForm.mediaUrl
      if (contentForm.mediaFile) {
        setMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: contentForm.mediaFile,
          purpose: getContentMediaPurpose(contentForm.type),
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn media.')
        }
        mediaUrl = uploadedUrl
      }
      
      let gamePromptImageUrl = contentForm.gamePromptImageUrl
      if (contentForm.gamePromptFile) {
        setMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: contentForm.gamePromptFile,
          purpose: 'game-media',
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn ảnh game.')
        }
        gamePromptImageUrl = uploadedUrl
      }
      
      const updatedOptions = []
      const originalOptions = normalizeGameOptions(contentForm.gameKind, contentForm.gameOptions)
      for (let i = 0; i < originalOptions.length; i++) {
        const option = originalOptions[i]
        let imageUrl = option.imageUrl
        if (option.imageFile) {
          setMediaUploading(true)
          setError('')
          const result = await adminApi.uploadMedia({
            file: option.imageFile,
            purpose: 'game-media',
          })
          const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
          if (!uploadedUrl) {
            throw new Error(`Backend chưa trả về đường dẫn ảnh cho đáp án ${i + 1}.`)
          }
          imageUrl = uploadedUrl
        }
        updatedOptions.push({
          ...option,
          imageUrl,
        })
      }
      
      const tempForm = {
        ...contentForm,
        mediaUrl,
        gamePromptImageUrl,
        gameOptions: updatedOptions,
      }
      
      if (tempForm.type === 'GAME' && normalizeGameKind(tempForm.gameKind) === 'CHOOSE_EMOTION') {
        const missingImageOption = normalizeGameOptions(tempForm.gameKind, tempForm.gameOptions).find((option) => !option.imageUrl?.trim())
        if (missingImageOption) {
          throw new Error('Game 1 yêu cầu tải ảnh cho tất cả đáp án.')
        }
      }
      
      const payload = buildContentPayload(tempForm)
      if (editingContentId) {
        await adminApi.updateContent(editingContentId, payload)
        setMessage('Đã cập nhật nội dung.')
      } else {
        await adminApi.createContent(payload)
        setMessage('Đã tạo nội dung mới.')
      }
      
      resetContentForm()
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được nội dung.')
    } finally {
      setMediaUploading(false)
      setLoading(false)
    }
  }

  const handleContentTypeChange = (type) => {
    setContentForm((form) => ({
      ...form,
      type,
      mediaUrl: type === 'GAME' ? '' : form.mediaUrl,
      mediaPreviewUrl: type === 'GAME' ? '' : form.mediaPreviewUrl,
      mediaMimeType: type === 'GAME' ? '' : form.mediaMimeType,
    }))
  }

  const handleGameKindChange = (gameKind) => {
    const nextKind = normalizeGameKind(gameKind)
    setContentForm((form) => ({
      ...form,
      gameKind: nextKind,
      gameOptions: getDefaultGameOptions(nextKind),
      gameCorrectIndex: 0,
      gameCorrectIndexes: nextKind === 'CHOOSE_REACTION' ? [2] : [],
      targetEmotion: normalizeTargetEmotion(form.targetEmotion, nextKind === 'CHOOSE_EMOTION' ? 'JOY' : 'NEUTRAL'),
    }))
  }

  const updateGameOption = (index, patch) => {
    setContentForm((form) => ({
      ...form,
      gameOptions: normalizeGameOptions(form.gameKind, form.gameOptions).map((option, optionIndex) => (
        optionIndex === index ? { ...option, ...patch } : option
      )),
    }))
  }

  const toggleQuizAnswerEmotion = (emotion) => {
    setContentForm((form) => {
      const current = getQuizAnswerEmotions(form.answerEmotions)
      const exists = current.includes(emotion)
      const next = exists ? current.filter((item) => item !== emotion) : [...current, emotion]
      const answerEmotions = next.length ? next : current
      const correctEmotion = answerEmotions.includes(form.correctEmotion) ? form.correctEmotion : answerEmotions[0]

      return {
        ...form,
        answerEmotions: answerEmotions.join(','),
        correctEmotion,
      }
    })
  }

  const toggleGameCorrectIndex = (index) => {
    setContentForm((form) => {
      const current = Array.isArray(form.gameCorrectIndexes) ? form.gameCorrectIndexes : []
      const exists = current.includes(index)
      const next = exists ? current.filter((item) => item !== index) : [...current, index]
      return {
        ...form,
        gameCorrectIndexes: next.length ? next : [index],
      }
    })
  }

  const handleContentMediaUpload = (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (isObjectUrl(contentForm.mediaPreviewUrl)) {
      URL.revokeObjectURL(contentForm.mediaPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setContentForm((form) => ({
      ...form,
      mediaFile: file,
      mediaPreviewUrl: previewUrl,
      mediaMimeType: file.type || '',
    }))
    input.value = ''
  }

  const handleClearContentMedia = () => {
    if (isObjectUrl(contentForm.mediaPreviewUrl)) {
      URL.revokeObjectURL(contentForm.mediaPreviewUrl)
    }
    setContentForm((form) => ({
      ...form,
      mediaUrl: '',
      mediaPreviewUrl: '',
      mediaMimeType: '',
      mediaFile: null,
    }))
  }

  const handleGameConfigImageUpload = (event, target) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    if (target.type === 'prompt') {
      if (isObjectUrl(contentForm.gamePromptPreviewUrl)) {
        URL.revokeObjectURL(contentForm.gamePromptPreviewUrl)
      }
      setContentForm((form) => ({
        ...form,
        gamePromptFile: file,
        gamePromptPreviewUrl: previewUrl,
      }))
    } else if (target.type === 'option') {
      setContentForm((form) => {
        const nextOptions = normalizeGameOptions(form.gameKind, form.gameOptions).map((option, index) => {
          if (index !== target.index) return option
          if (isObjectUrl(option.previewUrl)) {
            URL.revokeObjectURL(option.previewUrl)
          }
          return {
            ...option,
            imageFile: file,
            previewUrl,
          }
        })
        return {
          ...form,
          gameOptions: nextOptions,
        }
      })
    }
    input.value = ''
  }

  const handleEditContentMediaUpload = (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (isObjectUrl(editContentForm.mediaPreviewUrl)) {
      URL.revokeObjectURL(editContentForm.mediaPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setEditContentForm((form) => ({
      ...form,
      mediaFile: file,
      mediaPreviewUrl: previewUrl,
      mediaMimeType: file.type || '',
    }))
    input.value = ''
  }

  const handleClearEditContentMedia = () => {
    if (isObjectUrl(editContentForm.mediaPreviewUrl)) {
      URL.revokeObjectURL(editContentForm.mediaPreviewUrl)
    }
    setEditContentForm((form) => ({
      ...form,
      mediaUrl: '',
      mediaPreviewUrl: '',
      mediaMimeType: '',
      mediaFile: null,
    }))
  }

  const handleEditGameConfigImageUpload = (event, target) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    if (target.type === 'prompt') {
      if (isObjectUrl(editContentForm.gamePromptPreviewUrl)) {
        URL.revokeObjectURL(editContentForm.gamePromptPreviewUrl)
      }
      setEditContentForm((form) => ({
        ...form,
        gamePromptFile: file,
        gamePromptPreviewUrl: previewUrl,
      }))
    } else if (target.type === 'option') {
      setEditContentForm((form) => {
        const nextOptions = normalizeGameOptions(form.gameKind, form.gameOptions).map((option, index) => {
          if (index !== target.index) return option
          if (isObjectUrl(option.previewUrl)) {
            URL.revokeObjectURL(option.previewUrl)
          }
          return {
            ...option,
            imageFile: file,
            previewUrl,
          }
        })
        return {
          ...form,
          gameOptions: nextOptions,
        }
      })
    }
    input.value = ''
  }

  const handleContentEditSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      
      let mediaUrl = editContentForm.mediaUrl
      if (editContentForm.mediaFile) {
        setMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: editContentForm.mediaFile,
          purpose: getContentMediaPurpose(editContentForm.type),
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn media.')
        }
        mediaUrl = uploadedUrl
      }
      
      let gamePromptImageUrl = editContentForm.gamePromptImageUrl
      if (editContentForm.gamePromptFile) {
        setMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: editContentForm.gamePromptFile,
          purpose: 'game-media',
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn ảnh game.')
        }
        gamePromptImageUrl = uploadedUrl
      }
      
      const updatedOptions = []
      const originalOptions = normalizeGameOptions(editContentForm.gameKind, editContentForm.gameOptions)
      for (let i = 0; i < originalOptions.length; i++) {
        const option = originalOptions[i]
        let imageUrl = option.imageUrl
        if (option.imageFile) {
          setMediaUploading(true)
          setError('')
          const result = await adminApi.uploadMedia({
            file: option.imageFile,
            purpose: 'game-media',
          })
          const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
          if (!uploadedUrl) {
            throw new Error(`Backend chưa trả về đường dẫn ảnh cho đáp án ${i + 1}.`)
          }
          imageUrl = uploadedUrl
        }
        updatedOptions.push({
          ...option,
          imageUrl,
        })
      }
      
      const tempForm = {
        ...editContentForm,
        mediaUrl,
        gamePromptImageUrl,
        gameOptions: updatedOptions,
      }
      
      if (tempForm.type === 'GAME' && normalizeGameKind(tempForm.gameKind) === 'CHOOSE_EMOTION') {
        const missingImageOption = normalizeGameOptions(tempForm.gameKind, tempForm.gameOptions).find((option) => !option.imageUrl?.trim())
        if (missingImageOption) {
          throw new Error('Game 1 yêu cầu tải ảnh cho tất cả đáp án.')
        }
      }
      
      const payload = buildContentPayload(tempForm)
      await adminApi.updateContent(editingContentId, payload)
      setMessage('Đã cập nhật nội dung.')
      
      setIsEditModalOpen(false)
      setEditingContentId('')
      setEditContentForm(emptyContentForm)
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được nội dung.')
    } finally {
      setMediaUploading(false)
      setLoading(false)
    }
  }

  const handlePetImageUpload = (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (isObjectUrl(petForm.imagePreviewUrl)) {
      URL.revokeObjectURL(petForm.imagePreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setPetForm((form) => ({
      ...form,
      imageFile: file,
      imagePreviewUrl: previewUrl,
    }))
    input.value = ''
  }

  const handleEditPetImageUpload = (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (isObjectUrl(editPetForm.imagePreviewUrl)) {
      URL.revokeObjectURL(editPetForm.imagePreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setEditPetForm((form) => ({
      ...form,
      imageFile: file,
      imagePreviewUrl: previewUrl,
    }))
    input.value = ''
  }

  const handlePetSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      
      let imageUrl = petForm.imageUrl.trim()
      
      if (petForm.imageFile) {
        setPetMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: petForm.imageFile,
          purpose: 'PET_IMAGE',
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn ảnh pet.')
        }
        imageUrl = uploadedUrl
      }
      
      if (!imageUrl) {
        throw new Error('Vui lòng chọn ảnh pet trước khi lưu.')
      }
      
      const payload = {
        name: petForm.name.trim(),
        description: petForm.description || null,
        image_url: imageUrl,
        animation_url: petForm.animationUrl || null,
        unlock_star_cost: Number(petForm.unlockStarCost),
        status: petForm.status,
      }
      if (editingPetId) {
        await adminApi.updatePet(editingPetId, payload)
        setMessage('Đã cập nhật pet.')
      } else {
        await adminApi.createPet(payload)
        setMessage('Đã tạo pet mới.')
      }
      
      if (isObjectUrl(petForm.imagePreviewUrl)) {
        URL.revokeObjectURL(petForm.imagePreviewUrl)
      }
      setPetForm(emptyPetForm)
      setEditingPetId('')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được pet.')
    } finally {
      setPetMediaUploading(false)
      setLoading(false)
    }
  }



  const handlePetEditSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      
      let imageUrl = editPetForm.imageUrl.trim()
      
      if (editPetForm.imageFile) {
        setPetMediaUploading(true)
        setError('')
        const result = await adminApi.uploadMedia({
          file: editPetForm.imageFile,
          purpose: 'PET_IMAGE',
        })
        const uploadedUrl = result.media_asset?.storage_key || result.media_asset?.url
        if (!uploadedUrl) {
          throw new Error('Backend chưa trả về đường dẫn ảnh pet.')
        }
        imageUrl = uploadedUrl
      }
      
      if (!imageUrl) {
        throw new Error('Vui lòng chọn ảnh pet trước khi lưu.')
      }
      
      const payload = {
        name: editPetForm.name.trim(),
        description: editPetForm.description || null,
        image_url: imageUrl,
        animation_url: editPetForm.animationUrl || null,
        unlock_star_cost: Number(editPetForm.unlockStarCost),
        status: editPetForm.status,
      }
      
      await adminApi.updatePet(editingPetId, payload)
      setMessage('Đã cập nhật pet.')
      
      if (isObjectUrl(editPetForm.imagePreviewUrl)) {
        URL.revokeObjectURL(editPetForm.imagePreviewUrl)
      }
      setIsEditPetModalOpen(false)
      setEditingPetId('')
      setEditPetForm(emptyPetForm)
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được pet.')
    } finally {
      setPetMediaUploading(false)
      setLoading(false)
    }
  }

  const handleDeleteContent = async (contentId) => {
    try {
      await adminApi.deleteContent(contentId)
      setMessage('Đã xóa nội dung.')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không xóa được nội dung.')
    }
  }

  const handleDeletePet = async (petId) => {
    try {
      await adminApi.deletePet(petId)
      setMessage('Đã xóa pet.')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không xóa được pet.')
    }
  }

  const handleUpdateUser = async (user, patch) => {
    try {
      await adminApi.updateUser(user.id, patch)
      setMessage('Đã cập nhật user.')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không cập nhật được user.')
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">HMI</div>
          <div>
            <strong>Bảng quản trị</strong>
            <span>{userName}</span>
          </div>
        </div>
        <nav className="admin-nav">
          {tabs.map(({ id, label, icon }) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              {icon}
              {label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={handleLogout}>
          <FiLogOut aria-hidden="true" />
          Đăng xuất
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>Hệ thống HMI - Quản trị vận hành</h1>
            <p>Theo dõi người dùng, nội dung học tập, cửa hàng pet và cảnh báo chatbot.</p>
          </div>
        </header>

        {message && <div className="admin-alert success">{message}</div>}
        {error && <div className="admin-alert error">{error}</div>}

        {activeTab === 'analytics' && (
          <section className="admin-section">
            <div className="admin-grid stats">
              <StatCard label="Tổng người dùng" value={analytics?.users?.total || 0} hint={`${analytics?.users?.active || 0} đang hoạt động`} />
              <StatCard label="Phụ huynh" value={analytics?.users?.parents || 0} />
              <StatCard label="Quản trị viên" value={analytics?.users?.admins || 0} />
              <StatCard label="Hồ sơ trẻ" value={analytics?.children?.total || 0} />
              <StatCard label="Phiên học" value={analytics?.learning?.totalSessions || 0} hint={`${analytics?.learning?.completionRate || 0}% hoàn thành`} />
              <StatCard label="Tỉ lệ quiz đúng" value={`${analytics?.learning?.quizSuccessRate || 0}%`} />
              <StatCard label="Cảnh báo chatbot" value={analytics?.alertsCount || 0} />
              <StatCard label="Tài khoản bị khóa" value={analytics?.users?.banned || 0} />
            </div>

            <div className="admin-panel admin-emotion-panel">
              <div className="admin-panel-heading admin-emotion-panel-heading">
                <div>
                  <h2>Nhật ký cảm xúc</h2>
                  <p>Phân bố cảm xúc được ghi nhận từ các hoạt động của trẻ.</p>
                </div>
              </div>
              <div className="admin-emotion-list">
                {Object.entries(analytics?.emotions || {}).map(([emotion, count]) => (
                  <div key={emotion}>
                    <span>{emotionLabels[emotion] || emotion || 'Không xác định'}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
                {Object.keys(analytics?.emotions || {}).length === 0 && (
                  <p className="admin-empty" style={{ textAlign: 'center' }}>
                    Chưa có dữ liệu cảm xúc
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'contents' && (
          <section className="admin-section content-management">
            <form className="admin-form admin-content-form" onSubmit={handleContentSubmit}>
              <div className="admin-form-heading">
                <h2>Tạo nội dung mới</h2>
                <p>Quản lý bài học, câu hỏi và trò chơi AI cho trẻ.</p>
              </div>
              <div className={`admin-content-primary-row ${contentForm.type === 'GAME' ? 'with-unlock' : 'without-unlock'}`}>
                <AdminField label="Tiêu đề nội dung" className="admin-content-title-field">
                  <input required placeholder="Ví dụ: Con thích ăn gì" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} />
                </AdminField>
                <AdminField label="Loại nội dung">
                  <select value={contentForm.type} onChange={(e) => handleContentTypeChange(e.target.value)}>
                    <option value="LECTURE">Bài học</option>
                    <option value="QUIZ">Câu hỏi</option>
                    <option value="GAME">Trò chơi</option>
                  </select>
                </AdminField>
                <AdminField label="Độ khó">
                  <select value={contentForm.difficultyLevel} onChange={(e) => setContentForm({ ...contentForm, difficultyLevel: Number(e.target.value) })}>
                    {difficultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </AdminField>
                {contentForm.type === 'GAME' && (
                  <AdminField label="Sao mở khóa">
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength="1"
                      value={contentForm.unlockStarCost}
                      onChange={(e) => setContentForm({ ...contentForm, unlockStarCost: digitsOnly(e.target.value) })}
                    />
                  </AdminField>
                )}
                <AdminField label="Trạng thái">
                  <select value={contentForm.status} onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}>
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="DRAFT">Bản nháp</option>
                  </select>
                </AdminField>
              </div>

              <AdminField
                label={contentForm.type === 'QUIZ' ? 'Nội dung câu hỏi / mô tả' : 'Mô tả hiển thị'}
                className="admin-field-full"
              >
                <textarea placeholder="Ví dụ: Hãy chọn bạn đang vui" value={contentForm.description} onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} />
              </AdminField>

              {contentForm.type !== 'GAME' && (
                <div className="admin-form-row">
                  <AdminField label="Tải media từ máy">
                    {contentForm.mediaPreviewUrl || contentForm.mediaUrl ? (
                      <AdminContentMediaPreview
                        source={contentForm.mediaPreviewUrl || contentForm.mediaUrl}
                        mimeType={contentForm.mediaMimeType}
                        title={contentForm.title || 'media'}
                        onClear={handleClearContentMedia}
                      />
                    ) : (
                      <label className={`admin-upload-control ${mediaUploading ? 'disabled' : ''}`}>
                        <FiUpload aria-hidden="true" />
                        {mediaUploading ? 'Đang tải...' : 'Chọn media'}
                        <input
                          type="file"
                          accept="video/*,image/*"
                          disabled={mediaUploading}
                          onChange={handleContentMediaUpload}
                        />
                      </label>
                    )}
                  </AdminField>
                </div>
              )}

              {contentForm.type === 'QUIZ' && (
                <div className="admin-form-group admin-quiz-config">
                  <div className="admin-form-group-title">Cấu hình câu hỏi</div>
                  <div className="admin-quiz-emotion-options">
                    <span className="admin-field-label">Các đáp án cảm xúc</span>
                    <div className="admin-quiz-emotion-grid">
                      {targetEmotionOptions.map((emotion) => (
                        <label className="admin-quiz-emotion-toggle" key={emotion}>
                          <input
                            type="checkbox"
                            checked={getQuizAnswerEmotions(contentForm.answerEmotions).includes(emotion)}
                            onChange={() => toggleQuizAnswerEmotion(emotion)}
                          />
                          {emotion}
                        </label>
                      ))}
                    </div>
                  </div>
                  <AdminField label="Đáp án đúng" className="admin-quiz-correct-field">
                    <select value={contentForm.correctEmotion} onChange={(e) => setContentForm({ ...contentForm, correctEmotion: e.target.value })}>
                      {getQuizAnswerEmotions(contentForm.answerEmotions).map((emotion) => (
                        <option key={emotion} value={emotion}>{emotion}</option>
                      ))}
                    </select>
                  </AdminField>
                </div>
              )}

              {contentForm.type === 'GAME' && (
                <div className="admin-form-group admin-game-config">
                  <div className="admin-form-group-title">Cấu hình trò chơi AI</div>
                  <div className="admin-form-row">
                    <AdminField label="Loại game">
                      <select value={contentForm.gameKind} onChange={(e) => handleGameKindChange(e.target.value)}>
                        <option value="CHOOSE_EMOTION">Game 1 - Chọn cảm xúc đúng</option>
                        <option value="CHOOSE_REACTION">Game 2 - Chọn cách phản ứng</option>
                      </select>
                    </AdminField>

                    <AdminField
                      label={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Câu hỏi / lời dẫn dưới ảnh' : 'Câu hỏi game 1'}
                    >
                      <input
                        placeholder={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Bạn bị ngã rồi. Con sẽ làm gì?' : 'Ai đang BUỒN vậy con?'}
                        value={contentForm.gameQuestion}
                        onChange={(e) => setContentForm({ ...contentForm, gameQuestion: e.target.value })}
                      />
                    </AdminField>
                  </div>

                  {contentForm.gameKind === 'CHOOSE_REACTION' && (
                    <div className="admin-game-prompt-field">
                      <div className="admin-game-prompt-upload">
                        <span className="admin-game-prompt-label">Ảnh câu hỏi/tình huống</span>
                        <label className={`admin-game-prompt-preview ${mediaUploading ? 'disabled' : ''}`}>
                          {contentForm.gamePromptPreviewUrl || contentForm.gamePromptImageUrl
                            ? <img src={contentForm.gamePromptPreviewUrl || resolveMediaUrl(contentForm.gamePromptImageUrl)} alt="Ảnh câu hỏi Game 2" />
                            : (
                              <span>
                                <FiUpload aria-hidden="true" />
                                {mediaUploading ? 'Đang tải...' : 'Ảnh'}
                              </span>
                            )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={mediaUploading}
                            onChange={(event) => handleGameConfigImageUpload(event, { type: 'prompt' })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="admin-game-options-editor">
                    <div className="admin-game-options-heading">
                      <strong>{contentForm.gameKind === 'CHOOSE_REACTION' ? 'Biểu tượng phản ứng Game 2' : 'Ảnh minh họa đáp án Game 1'}</strong>
                    </div>
                    <div className="admin-game-options-list">
                      {normalizeGameOptions(contentForm.gameKind, contentForm.gameOptions).map((option, index) => (
                        <div className="admin-game-option-card" key={`${contentForm.gameKind}-${index}`}>
                          {contentForm.gameKind === 'CHOOSE_EMOTION' ? (
                            <label className={`admin-game-option-preview admin-game-option-upload-preview ${mediaUploading ? 'disabled' : ''}`}>
                              {option.previewUrl || option.imageUrl
                                ? <img src={option.previewUrl || resolveMediaUrl(option.imageUrl)} alt={option.label} />
                                : (
                                  <span>
                                    <FiUpload aria-hidden="true" />
                                    {mediaUploading ? 'Đang tải...' : 'Tải ảnh'}
                                  </span>
                                )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={mediaUploading}
                                onChange={(event) => handleGameConfigImageUpload(event, { type: 'option', index })}
                              />
                            </label>
                          ) : (
                            <div className="admin-game-option-preview">
                              <span>{option.src}</span>
                            </div>
                          )}
                          <div className="admin-game-option-body">
                            <div className={`admin-game-option-fields ${contentForm.gameKind === 'CHOOSE_EMOTION' ? 'single' : ''}`}>
                              {contentForm.gameKind === 'CHOOSE_REACTION' && (
                                <AdminField label={`Tên đáp án ${index + 1}`}>
                                  <input value={option.label} onChange={(e) => updateGameOption(index, { label: e.target.value })} />
                                </AdminField>
                              )}
                              <AdminField label={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Mã phản ứng' : 'Mã cảm xúc'}>
                                <select
                                  value={contentForm.gameKind === 'CHOOSE_REACTION' ? option.value : option.emotion}
                                  onChange={(e) => {
                                    if (contentForm.gameKind === 'CHOOSE_REACTION') {
                                      const detail = reactionOptionDetails[e.target.value]
                                      updateGameOption(index, {
                                        value: e.target.value,
                                        label: detail?.label || option.label,
                                        emotion: detail?.emotion || option.emotion,
                                        src: detail?.src || option.src,
                                        imageUrl: '',
                                        previewUrl: '',
                                      })
                                      return
                                    }
                                    updateGameOption(index, { emotion: e.target.value, value: e.target.value })
                                  }}
                                >
                                  {getDropdownOptions(
                                    contentForm.gameKind === 'CHOOSE_REACTION' ? reactionCodeOptions : targetEmotionOptions,
                                    contentForm.gameKind === 'CHOOSE_REACTION' ? option.value : option.emotion,
                                  ).map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                              </AdminField>
                            </div>
                            <div className="admin-game-option-actions">
                              <label className="admin-game-correct-toggle">
                                <input
                                  type={contentForm.gameKind === 'CHOOSE_REACTION' ? 'checkbox' : 'radio'}
                                  name="game-correct-answer"
                                  checked={contentForm.gameKind === 'CHOOSE_REACTION'
                                    ? contentForm.gameCorrectIndexes.includes(index)
                                    : Number(contentForm.gameCorrectIndex) === index}
                                  onChange={() => {
                                    if (contentForm.gameKind === 'CHOOSE_REACTION') {
                                      toggleGameCorrectIndex(index)
                                    } else {
                                      setContentForm({ ...contentForm, gameCorrectIndex: index })
                                    }
                                  }}
                                />
                                Đáp án đúng
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
              <div className="admin-form-actions">
                <button type="submit" disabled={loading || mediaUploading}>
                  <FiPlus aria-hidden="true" />
                  Tạo nội dung
                </button>
              </div>
            </form>

            <div className="admin-table-card">
              <div className="admin-panel-heading">
                <div>
                  <h2>Danh sách nội dung</h2>
                  <p>{contents.length} mục đang hiển thị</p>
                </div>
              </div>
              <div className="admin-content-grid">
                {contents.map((content) => {
                  const unlockCost = getContentUnlockCost(content)

                  return (
                    <div className="admin-content-card" key={content.id}>
                      <div className="admin-content-card-main">
                        <span className="admin-content-type">{contentTypeLabels[content.type] || content.type}</span>
                        <strong>{content.title}</strong>
                        <span>{contentStatusLabels[content.status] || content.status}</span>
                      </div>
                      <div className="admin-content-meta">
                        <span>Độ khó {getContentDifficulty(content)}</span>
                        {unlockCost !== null && <span>{unlockCost} sao</span>}
                      </div>
                      <div className="row-actions">
                        <button onClick={() => {
                          setEditingContentId(content.id);
                          setEditContentForm(toContentForm(content));
                          setIsEditModalOpen(true);
                        }}>
                          <FiEdit2 aria-hidden="true" />
                          Sửa
                        </button>
                        <button
                          className="danger"
                          onClick={() =>
                            triggerDeleteConfirmation({
                              title: 'Xóa nội dung',
                              message: `Bạn có chắc chắn muốn xóa nội dung "${content.title}"?`,
                              onConfirm: () => handleDeleteContent(content.id),
                            })
                          }
                        >
                          <FiTrash2 aria-hidden="true" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  )
                })}
                {contents.length === 0 && <p className="admin-empty">Chưa có nội dung phù hợp.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'pets' && (
          <section className="admin-section pet-management">
            <form className="admin-form admin-pet-form" onSubmit={handlePetSubmit}>
              <div className="admin-form-heading">
                <h2>Tạo pet mới</h2>
                <p>Cấu hình vật phẩm đổi sao trong cửa hàng.</p>
              </div>
              <div className="admin-pet-top-row">
                <AdminField label="Tên pet">
                  <input required placeholder="Ví dụ: Mèo bình tĩnh" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} />
                </AdminField>
                <AdminField label="Giá theo sao">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={petForm.unlockStarCost}
                    onChange={(e) => setPetForm({ ...petForm, unlockStarCost: digitsOnly(e.target.value) })}
                  />
                </AdminField>
                <AdminField label="Trạng thái">
                  <select value={petForm.status} onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}>
                    <option value="ACTIVE">Đang bán</option>
                    <option value="HIDDEN">Đã ẩn</option>
                  </select>
                </AdminField>
                <AdminField label="Ảnh pet">
                  <div className="admin-pet-image-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(petForm.imagePreviewUrl || petForm.imageUrl) && (
                      <div className="admin-pet-image-preview">
                        <img 
                          src={petForm.imagePreviewUrl || resolveMediaUrl(petForm.imageUrl)} 
                          alt="Preview pet" 
                          style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }} 
                        />
                      </div>
                    )}
                    <label className={`admin-upload-control ${petMediaUploading ? 'disabled' : ''}`}>
                      <FiUpload aria-hidden="true" />
                      {petMediaUploading ? 'Đang tải...' : 'Tải ảnh'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={petMediaUploading}
                        onChange={handlePetImageUpload}
                      />
                    </label>
                  </div>
                </AdminField>
              </div>
              <AdminField label="Mô tả pet" className="admin-field-full">
                <textarea className="admin-pet-description" placeholder="Mô tả ngắn về pet" value={petForm.description} onChange={(e) => setPetForm({ ...petForm, description: e.target.value })} />
              </AdminField>
              <div className="admin-form-actions">
                <button type="submit" disabled={loading || petMediaUploading}>
                  <FiPlus aria-hidden="true" />
                  Tạo pet
                </button>
              </div>
            </form>

            <div className="admin-table-card">
              <div className="admin-panel-heading admin-pet-list-heading">
                <div>
                  <h2>Danh mục pet</h2>
                  <p>{pets.length} pet đang hiển thị</p>
                </div>
              </div>
              <div className="admin-pet-grid">
                {pets.map((pet) => (
                  <div className="admin-pet-item-card" key={pet.id}>
                    <div className="admin-pet-item-image">
                      {pet.image_url ? (
                        <img src={resolveMediaUrl(pet.image_url)} alt={pet.name} />
                      ) : (
                        <span style={{ fontSize: '32px' }}>🎁</span>
                      )}
                    </div>
                    <div className="admin-pet-item-details">
                      <strong>{pet.name}</strong>
                      <span>{pet.unlock_star_cost} sao · {petStatusLabels[pet.status] || pet.status}</span>
                      {pet.description && <p>{pet.description}</p>}
                    </div>
                    <div className="row-actions">
                      <button onClick={() => {
                        setEditingPetId(pet.id);
                        setEditPetForm(toPetForm(pet));
                        setIsEditPetModalOpen(true);
                      }}>
                        <FiEdit2 aria-hidden="true" />
                        Sửa
                      </button>
                      <button
                        className="danger"
                        onClick={() =>
                          triggerDeleteConfirmation({
                            title: 'Xóa pet',
                            message: `Bạn có chắc chắn muốn xóa pet "${pet.name}"?`,
                            onConfirm: () => handleDeletePet(pet.id),
                          })
                        }
                      >
                        <FiTrash2 aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {pets.length === 0 && <p className="admin-empty" style={{ gridColumn: '1 / -1' }}>Chưa có pet phù hợp.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="admin-section">
            <div className="admin-table-card">
              <div className="admin-panel-heading admin-users-heading">
                <div>
                  <h2>Quản lý vai trò và trạng thái các tài khoản</h2>
                </div>
              </div>
              <div className="admin-table">
                {users.map((user) => (
                  <div className="admin-row user" key={user.id}>
                    <div className="admin-user-identity">
                      <strong>{user.full_name || user.email}</strong>
                      <span>{user.email} · {user.auth_provider || 'local'}</span>
                    </div>
                    <select value={user.role} onChange={(e) => handleUpdateUser(user, { role: e.target.value })}>
                      <option value="PARENT">{roleLabels.PARENT}</option>
                      <option value="ADMIN">{roleLabels.ADMIN}</option>
                    </select>
                    <select value={user.status} onChange={(e) => handleUpdateUser(user, { status: e.target.value })}>
                      <option value="ACTIVE">{userStatusLabels.ACTIVE}</option>
                      <option value="BANNED">{userStatusLabels.BANNED}</option>
                    </select>
                    <button
                      className="danger"
                      onClick={() =>
                        triggerDeleteConfirmation({
                          title: 'Xóa người dùng',
                          message: `Bạn có chắc chắn muốn xóa người dùng "${user.full_name || user.email}"?`,
                          onConfirm: () =>
                            adminApi
                              .deleteUser(user.id, 'Xóa từ trang quản trị')
                              .then(loadAdminData)
                              .catch((err) => setError(err.message)),
                        })
                      }
                    >
                      <FiTrash2 aria-hidden="true" />
                      Xóa
                    </button>
                  </div>
                ))}
                {users.length === 0 && <p className="admin-empty">Không tìm thấy người dùng phù hợp.</p>}
              </div>
            </div>
          </section>
        )}
      </main>

      {isEditModalOpen && (
        <div className="admin-modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingContentId(''); setEditContentForm(emptyContentForm); }}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <form className="admin-form admin-content-form edit-modal-form" onSubmit={handleContentEditSubmit}>
              <div className="admin-form-heading">
                <h2>Cập nhật nội dung</h2>
                <p>Chỉnh sửa các thông số của nội dung học tập.</p>
              </div>
              <div className={`admin-content-primary-row ${editContentForm.type === 'GAME' ? 'with-unlock' : 'without-unlock'}`}>
                <AdminField label="Tiêu đề nội dung" className="admin-content-title-field">
                  <input
                    required
                    value={editContentForm.title}
                    placeholder={editContentForm.title || "Ví dụ: Con thích ăn gì"}
                    onChange={(e) => setEditContentForm({ ...editContentForm, title: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Loại nội dung">
                  <select
                    value={editContentForm.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setEditContentForm((form) => ({
                        ...form,
                        type,
                        mediaUrl: type === 'GAME' ? '' : form.mediaUrl,
                        mediaPreviewUrl: type === 'GAME' ? '' : form.mediaPreviewUrl,
                        mediaMimeType: type === 'GAME' ? '' : form.mediaMimeType,
                      }))
                    }}
                  >
                    <option value="LECTURE">Bài học</option>
                    <option value="QUIZ">Câu hỏi</option>
                    <option value="GAME">Trò chơi</option>
                  </select>
                </AdminField>
                <AdminField label="Độ khó">
                  <select value={editContentForm.difficultyLevel} onChange={(e) => setEditContentForm({ ...editContentForm, difficultyLevel: Number(e.target.value) })}>
                    {difficultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </AdminField>
                {editContentForm.type === 'GAME' && (
                  <AdminField label="Sao mở khóa">
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength="1"
                      value={editContentForm.unlockStarCost}
                      placeholder={String(editContentForm.unlockStarCost || 0)}
                      onChange={(e) => setEditContentForm({ ...editContentForm, unlockStarCost: digitsOnly(e.target.value) })}
                    />
                  </AdminField>
                )}
                <AdminField label="Trạng thái">
                  <select value={editContentForm.status} onChange={(e) => setEditContentForm({ ...editContentForm, status: e.target.value })}>
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="DRAFT">Bản nháp</option>
                  </select>
                </AdminField>
              </div>

              <AdminField
                label={editContentForm.type === 'QUIZ' ? 'Nội dung câu hỏi / mô tả' : 'Mô tả hiển thị'}
                className="admin-field-full"
              >
                <textarea
                  value={editContentForm.description}
                  placeholder={editContentForm.description || "Mô tả nội dung"}
                  onChange={(e) => setEditContentForm({ ...editContentForm, description: e.target.value })}
                />
              </AdminField>

              {editContentForm.type !== 'GAME' && (
                <div className="admin-form-row">
                  <AdminField label="Tải media từ máy">
                    {editContentForm.mediaPreviewUrl || editContentForm.mediaUrl ? (
                      <AdminContentMediaPreview
                        source={editContentForm.mediaPreviewUrl || editContentForm.mediaUrl}
                        mimeType={editContentForm.mediaMimeType}
                        title={editContentForm.title || 'media'}
                        onClear={handleClearEditContentMedia}
                      />
                    ) : (
                      <label className={`admin-upload-control ${mediaUploading ? 'disabled' : ''}`}>
                        <FiUpload aria-hidden="true" />
                        {mediaUploading ? 'Đang tải...' : 'Chọn media'}
                        <input
                          type="file"
                          accept="video/*,image/*"
                          disabled={mediaUploading}
                          onChange={handleEditContentMediaUpload}
                        />
                      </label>
                    )}
                  </AdminField>
                </div>
              )}

              {editContentForm.type === 'QUIZ' && (
                <div className="admin-form-group admin-quiz-config">
                  <div className="admin-form-group-title">Cấu hình câu hỏi</div>
                  <div className="admin-quiz-emotion-options">
                    <span className="admin-field-label">Các đáp án cảm xúc</span>
                    <div className="admin-quiz-emotion-grid">
                      {targetEmotionOptions.map((emotion) => (
                        <label className="admin-quiz-emotion-toggle" key={emotion}>
                          <input
                            type="checkbox"
                            checked={getQuizAnswerEmotions(editContentForm.answerEmotions).includes(emotion)}
                            onChange={() => {
                              const current = getQuizAnswerEmotions(editContentForm.answerEmotions)
                              const exists = current.includes(emotion)
                              const next = exists ? current.filter((item) => item !== emotion) : [...current, emotion]
                              const answerEmotions = next.length ? next : current
                              const correctEmotion = answerEmotions.includes(editContentForm.correctEmotion) ? editContentForm.correctEmotion : answerEmotions[0]
                              setEditContentForm({
                                ...editContentForm,
                                answerEmotions: answerEmotions.join(','),
                                correctEmotion,
                              })
                            }}
                          />
                          {emotion}
                        </label>
                      ))}
                    </div>
                  </div>
                  <AdminField label="Đáp án đúng" className="admin-quiz-correct-field">
                    <select value={editContentForm.correctEmotion} onChange={(e) => setEditContentForm({ ...editContentForm, correctEmotion: e.target.value })}>
                      {getQuizAnswerEmotions(editContentForm.answerEmotions).map((emotion) => (
                        <option key={emotion} value={emotion}>{emotion}</option>
                      ))}
                    </select>
                  </AdminField>
                </div>
              )}

              {editContentForm.type === 'GAME' && (
                <div className="admin-form-group admin-game-config">
                  <div className="admin-form-group-title">Cấu hình trò chơi AI</div>
                  <div className="admin-form-row">
                    <AdminField label="Loại game">
                      <select
                        value={editContentForm.gameKind}
                        onChange={(e) => {
                          const nextKind = normalizeGameKind(e.target.value)
                          setEditContentForm({
                            ...editContentForm,
                            gameKind: nextKind,
                            gameOptions: getDefaultGameOptions(nextKind),
                            gameCorrectIndex: 0,
                            gameCorrectIndexes: nextKind === 'CHOOSE_REACTION' ? [2] : [],
                            targetEmotion: normalizeTargetEmotion(editContentForm.targetEmotion, nextKind === 'CHOOSE_EMOTION' ? 'JOY' : 'NEUTRAL'),
                          })
                        }}
                      >
                        <option value="CHOOSE_EMOTION">Game 1 - Chọn cảm xúc đúng</option>
                        <option value="CHOOSE_REACTION">Game 2 - Chọn cách phản ứng</option>
                      </select>
                    </AdminField>

                    <AdminField
                      label={editContentForm.gameKind === 'CHOOSE_REACTION' ? 'Câu hỏi / lời dẫn dưới ảnh' : 'Câu hỏi game 1'}
                    >
                      <input
                        placeholder={editContentForm.gameQuestion || (editContentForm.gameKind === 'CHOOSE_REACTION' ? 'Bạn bị ngã rồi. Con sẽ làm gì?' : 'Ai đang BUỒN vậy con?')}
                        value={editContentForm.gameQuestion}
                        onChange={(e) => setEditContentForm({ ...editContentForm, gameQuestion: e.target.value })}
                      />
                    </AdminField>
                  </div>

                  {editContentForm.gameKind === 'CHOOSE_REACTION' && (
                    <div className="admin-game-prompt-field">
                      <div className="admin-game-prompt-upload">
                        <span className="admin-game-prompt-label">Ảnh câu hỏi/tình huống</span>
                        <label className={`admin-game-prompt-preview ${mediaUploading ? 'disabled' : ''}`}>
                          {editContentForm.gamePromptPreviewUrl || editContentForm.gamePromptImageUrl
                            ? <img src={editContentForm.gamePromptPreviewUrl || resolveMediaUrl(editContentForm.gamePromptImageUrl)} alt="Ảnh câu hỏi Game 2" />
                            : (
                              <span>
                                <FiUpload aria-hidden="true" />
                                {mediaUploading ? 'Đang tải...' : 'Ảnh'}
                              </span>
                            )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={mediaUploading}
                            onChange={(event) => handleEditGameConfigImageUpload(event, { type: 'prompt' })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="admin-game-options-editor">
                    <div className="admin-game-options-heading">
                      <strong>{editContentForm.gameKind === 'CHOOSE_REACTION' ? 'Biểu tượng phản ứng Game 2' : 'Ảnh minh họa đáp án Game 1'}</strong>
                    </div>
                    <div className="admin-game-options-list">
                      {normalizeGameOptions(editContentForm.gameKind, editContentForm.gameOptions).map((option, index) => (
                        <div className="admin-game-option-card" key={`${editContentForm.gameKind}-${index}`}>
                          {editContentForm.gameKind === 'CHOOSE_EMOTION' ? (
                            <label className={`admin-game-option-preview admin-game-option-upload-preview ${mediaUploading ? 'disabled' : ''}`}>
                              {option.previewUrl || option.imageUrl
                                ? <img src={option.previewUrl || resolveMediaUrl(option.imageUrl)} alt={option.label} />
                                : (
                                  <span>
                                    <FiUpload aria-hidden="true" />
                                    {mediaUploading ? 'Đang tải...' : 'Tải ảnh'}
                                  </span>
                                )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={mediaUploading}
                                onChange={(event) => handleEditGameConfigImageUpload(event, { type: 'option', index })}
                              />
                            </label>
                          ) : (
                            <div className="admin-game-option-preview">
                              <span>{option.src}</span>
                            </div>
                          )}
                          <div className="admin-game-option-body">
                            <div className={`admin-game-option-fields ${editContentForm.gameKind === 'CHOOSE_EMOTION' ? 'single' : ''}`}>
                              {editContentForm.gameKind === 'CHOOSE_REACTION' && (
                                <AdminField label={`Tên đáp án ${index + 1}`}>
                                  <input
                                    value={option.label}
                                    placeholder={option.label}
                                    onChange={(e) => {
                                      setEditContentForm((form) => ({
                                        ...form,
                                        gameOptions: normalizeGameOptions(form.gameKind, form.gameOptions).map((opt, optionIndex) => (
                                          optionIndex === index ? { ...opt, label: e.target.value } : opt
                                        )),
                                      }))
                                    }}
                                  />
                                </AdminField>
                              )}
                              <AdminField label={editContentForm.gameKind === 'CHOOSE_REACTION' ? 'Mã phản ứng' : 'Mã cảm xúc'}>
                                <select
                                  value={editContentForm.gameKind === 'CHOOSE_REACTION' ? option.value : option.emotion}
                                  onChange={(e) => {
                                    if (editContentForm.gameKind === 'CHOOSE_REACTION') {
                                      const detail = reactionOptionDetails[e.target.value]
                                      setEditContentForm((form) => ({
                                        ...form,
                                        gameOptions: normalizeGameOptions(form.gameKind, form.gameOptions).map((opt, optionIndex) => {
                                          if (optionIndex !== index) return opt
                                          return {
                                            ...opt,
                                            value: e.target.value,
                                            label: detail?.label || opt.label,
                                            emotion: detail?.emotion || opt.emotion,
                                            src: detail?.src || opt.src,
                                            imageUrl: '',
                                            previewUrl: '',
                                          }
                                        })
                                      }))
                                      return
                                    }
                                    setEditContentForm((form) => ({
                                      ...form,
                                      gameOptions: normalizeGameOptions(form.gameKind, form.gameOptions).map((opt, optionIndex) => (
                                        optionIndex === index ? { ...opt, emotion: e.target.value, value: e.target.value } : opt
                                      ))
                                    }))
                                  }}
                                >
                                  {getDropdownOptions(
                                    editContentForm.gameKind === 'CHOOSE_REACTION' ? reactionCodeOptions : targetEmotionOptions,
                                    editContentForm.gameKind === 'CHOOSE_REACTION' ? option.value : option.emotion,
                                  ).map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                              </AdminField>
                            </div>
                            <div className="admin-game-option-actions">
                              <label className="admin-game-correct-toggle">
                                <input
                                  type={editContentForm.gameKind === 'CHOOSE_REACTION' ? 'checkbox' : 'radio'}
                                  name="edit-game-correct-answer"
                                  checked={editContentForm.gameKind === 'CHOOSE_REACTION'
                                    ? editContentForm.gameCorrectIndexes.includes(index)
                                    : Number(editContentForm.gameCorrectIndex) === index}
                                  onChange={() => {
                                    if (editContentForm.gameKind === 'CHOOSE_REACTION') {
                                      const current = Array.isArray(editContentForm.gameCorrectIndexes) ? editContentForm.gameCorrectIndexes : []
                                      const exists = current.includes(index)
                                      const next = exists ? current.filter((item) => item !== index) : [...current, index]
                                      setEditContentForm({
                                        ...editContentForm,
                                        gameCorrectIndexes: next.length ? next : [index],
                                      })
                                    } else {
                                      setEditContentForm({ ...editContentForm, gameCorrectIndex: index })
                                    }
                                  }}
                                />
                                Đáp án đúng
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
              <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingContentId(''); setEditContentForm(emptyContentForm); }}>
                  Hủy
                </button>
                <button type="submit" disabled={loading || mediaUploading}>
                  <FiSave aria-hidden="true" />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditPetModalOpen && (
        <div className="admin-modal-overlay" onClick={() => { setIsEditPetModalOpen(false); setEditingPetId(''); setEditPetForm(emptyPetForm); }}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <form className="admin-form admin-pet-form edit-modal-form" onSubmit={handlePetEditSubmit}>
              <div className="admin-form-heading">
                <h2>Cập nhật pet</h2>
                <p>Cấu hình vật phẩm đổi sao trong cửa hàng.</p>
              </div>
              <div className="admin-pet-top-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
                <AdminField label="Tên pet">
                  <input
                    required
                    placeholder={editPetForm.name || "Ví dụ: Mèo bình tĩnh"}
                    value={editPetForm.name}
                    onChange={(e) => setEditPetForm({ ...editPetForm, name: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Giá theo sao">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editPetForm.unlockStarCost}
                    placeholder={String(editPetForm.unlockStarCost || 0)}
                    onChange={(e) => setEditPetForm({ ...editPetForm, unlockStarCost: digitsOnly(e.target.value) })}
                  />
                </AdminField>
                <AdminField label="Trạng thái">
                  <select value={editPetForm.status} onChange={(e) => setEditPetForm({ ...editPetForm, status: e.target.value })}>
                    <option value="ACTIVE">Đang bán</option>
                    <option value="HIDDEN">Đã ẩn</option>
                  </select>
                </AdminField>
                <AdminField label="Ảnh pet">
                  <div className="admin-pet-image-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(editPetForm.imagePreviewUrl || editPetForm.imageUrl) && (
                      <div className="admin-pet-image-preview">
                        <img
                          src={editPetForm.imagePreviewUrl || resolveMediaUrl(editPetForm.imageUrl)}
                          alt="Preview pet"
                          style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                    <label className={`admin-upload-control ${petMediaUploading ? 'disabled' : ''}`}>
                      <FiUpload aria-hidden="true" />
                      {petMediaUploading ? 'Đang tải...' : 'Tải ảnh'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={petMediaUploading}
                        onChange={handleEditPetImageUpload}
                      />
                    </label>
                  </div>
                </AdminField>
              </div>
              <AdminField label="Mô tả pet" className="admin-field-full">
                <textarea
                  className="admin-pet-description"
                  placeholder={editPetForm.description || "Mô tả ngắn về pet"}
                  value={editPetForm.description}
                  onChange={(e) => setEditPetForm({ ...editPetForm, description: e.target.value })}
                />
              </AdminField>
              <div className="admin-form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setIsEditPetModalOpen(false); setEditingPetId(''); setEditPetForm(emptyPetForm); }}>
                  Hủy
                </button>
                <button type="submit" disabled={loading || petMediaUploading}>
                  <FiSave aria-hidden="true" />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  )
}
