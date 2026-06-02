import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiBarChart2,
  FiBookOpen,
  FiEdit2,
  FiGift,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { adminApi, authApi, clearSession, getSession } from '../services/api'
import '../styles/Admin.css'

const emptyContentForm = {
  title: '',
  type: 'GAME',
  status: 'PUBLISHED',
  description: '',
  mediaUrl: '',
  answerEmotions: 'JOY,SAD,ANGRY,CALM',
  correctEmotion: 'JOY',
  gameKind: 'CHOOSE_EMOTION',
  gameQuestion: '',
  gamePromptImageUrl: '',
  gamePromptPreviewUrl: '',
  gameOptions: [
    { label: 'Vui', emotion: 'JOY', value: 'JOY', imageUrl: '', src: '😊' },
    { label: 'Buồn', emotion: 'SAD', value: 'SAD', imageUrl: '', src: '😢' },
    { label: 'Tức giận', emotion: 'ANGRY', value: 'ANGRY', imageUrl: '', src: '😡' },
    { label: 'Ngạc nhiên', emotion: 'SURPRISED', value: 'SURPRISED', imageUrl: '', src: '😮' },
  ],
  gameCorrectIndex: 0,
  gameCorrectIndexes: [2],
  targetEmotion: 'JOY',
  timeLimitSeconds: 60,
  difficultyLevel: 1,
  unlockStarCost: 0,
}

const emptyPetForm = {
  name: '',
  description: '',
  imageUrl: '',
  animationUrl: '',
  unlockStarCost: 100,
  status: 'ACTIVE',
}

function getDefaultGameOptions(kind) {
  if (kind === 'CHOOSE_REACTION') {
    return [
      { label: 'Bỏ đi', emotion: 'CALM', value: 'LEAVE', imageUrl: '', src: '🚶' },
      { label: 'Cười', emotion: 'JOY', value: 'LAUGH', imageUrl: '', src: '😆' },
      { label: 'An ủi', emotion: 'CALM', value: 'COMFORT', imageUrl: '', src: '🤝' },
    ]
  }

  return [
    { label: 'Vui', emotion: 'JOY', value: 'JOY', imageUrl: '', src: '😊' },
    { label: 'Buồn', emotion: 'SAD', value: 'SAD', imageUrl: '', src: '😢' },
    { label: 'Tức giận', emotion: 'ANGRY', value: 'ANGRY', imageUrl: '', src: '😡' },
    { label: 'Ngạc nhiên', emotion: 'SURPRISED', value: 'SURPRISED', imageUrl: '', src: '😮' },
  ]
}

function normalizeGameKind(value) {
  if (value === 'CHOOSE_REACTION' || value === 'MATCH_EMOTION') return value
  return 'CHOOSE_EMOTION'
}

function normalizeGameOptions(kind, options) {
  const defaults = getDefaultGameOptions(kind)
  const source = Array.isArray(options) && options.length ? options : defaults
  const targetLength = kind === 'CHOOSE_REACTION' ? 3 : 4

  return Array.from({ length: targetLength }).map((_, index) => {
    const option = source[index] || defaults[index] || {}
    return {
      label: option.label || defaults[index]?.label || `Đáp án ${index + 1}`,
      emotion: option.emotion || option.value || defaults[index]?.emotion || 'CALM',
      value: option.value || option.emotion || defaults[index]?.value || `OPTION_${index + 1}`,
      imageUrl: option.imageUrl || '',
      previewUrl: option.previewUrl || option.resolvedImageUrl || '',
      src: option.src || defaults[index]?.src || '',
    }
  })
}

function buildGameConfig(form) {
  const kind = normalizeGameKind(form.gameKind)

  if (kind === 'MATCH_EMOTION') {
    return { kind: 'MATCH_EMOTION' }
  }

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
  const kind = normalizeGameKind(form.gameKind)
  const options = normalizeGameOptions(kind, form.gameOptions)

  if (kind === 'CHOOSE_EMOTION') {
    const correctOption = options[Number(form.gameCorrectIndex) || 0]
    return (correctOption?.emotion || form.targetEmotion || 'JOY').trim().toUpperCase()
  }

  return (form.targetEmotion || 'CALM').trim().toUpperCase()
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
    return {
      ...base,
      quiz: {
        mediaUrl: form.mediaUrl || undefined,
        description: form.description || null,
        difficultyLevel: Number(form.difficultyLevel),
        isDefault: false,
        answerEmotions: form.answerEmotions.split(',').map((item) => item.trim()).filter(Boolean),
        correctEmotion: form.correctEmotion.trim().toUpperCase(),
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
      promptAssetUrl: form.mediaUrl || form.gamePromptImageUrl || null,
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

  return {
    title: content.title || '',
    type: content.type || 'GAME',
    status: content.status || 'PUBLISHED',
    description: content.lecture?.description || content.quiz?.description || '',
    mediaUrl: content.lecture?.media_url || content.quiz?.media_url || content.game?.prompt_asset_url || '',
    answerEmotions: (content.quiz?.answer_emotions || ['JOY', 'SAD', 'ANGRY', 'CALM']).join(','),
    correctEmotion: content.quiz?.correct_emotion || 'JOY',
    gameKind,
    gameQuestion: gameConfig.question || '',
    gamePromptImageUrl: gameConfig.promptImageUrl || content.game?.prompt_asset_url || '',
    gamePromptPreviewUrl: gameConfig.promptPreviewUrl || gameConfig.promptImageUrl || content.game?.prompt_asset_url || '',
    gameOptions: normalizeGameOptions(gameKind, gameConfig.options),
    gameCorrectIndex: Number.isInteger(gameConfig.correctIndex) ? gameConfig.correctIndex : 0,
    gameCorrectIndexes: correctIndexes,
    targetEmotion: content.game?.target_emotion || 'JOY',
    timeLimitSeconds: content.game?.time_limit_seconds || 60,
    difficultyLevel: content.difficulty_level || 1,
    unlockStarCost: content.unlock_star_cost || 0,
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
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)

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

  const filteredContents = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return contents
    return contents.filter((item) => item.title?.toLowerCase().includes(value) || item.type?.toLowerCase().includes(value))
  }, [contents, search])

  const filteredPets = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return pets
    return pets.filter((item) => item.name?.toLowerCase().includes(value))
  }, [pets, search])

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return users
    return users.filter((item) => (
      item.email?.toLowerCase().includes(value)
      || item.full_name?.toLowerCase().includes(value)
      || item.role?.toLowerCase().includes(value)
    ))
  }, [users, search])

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

  const handleContentSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      const payload = buildContentPayload(contentForm)
      if (editingContentId) {
        await adminApi.updateContent(editingContentId, payload)
        setMessage('Đã cập nhật nội dung.')
      } else {
        await adminApi.createContent(payload)
        setMessage('Đã tạo nội dung mới.')
      }
      setContentForm(emptyContentForm)
      setEditingContentId('')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được nội dung.')
    } finally {
      setLoading(false)
    }
  }

  const handleContentTypeChange = (type) => {
    setContentForm((form) => ({ ...form, type }))
  }

  const handleGameKindChange = (gameKind) => {
    const nextKind = normalizeGameKind(gameKind)
    setContentForm((form) => ({
      ...form,
      gameKind: nextKind,
      gameOptions: normalizeGameOptions(nextKind, form.gameOptions),
      gameCorrectIndex: 0,
      gameCorrectIndexes: nextKind === 'CHOOSE_REACTION' ? [2] : [],
      targetEmotion: nextKind === 'CHOOSE_REACTION' ? 'CALM' : 'JOY',
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

  const handleContentMediaUpload = async (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    try {
      setMediaUploading(true)
      setError('')
      const result = await adminApi.uploadMedia({
        file,
        purpose: getContentMediaPurpose(contentForm.type),
      })
      const mediaUrl = result.media_asset?.storage_key || result.media_asset?.url
      if (!mediaUrl) {
        throw new Error('Backend chưa trả về đường dẫn media.')
      }

      setContentForm((form) => ({ ...form, mediaUrl }))
      setMessage('Đã tải media lên và điền đường dẫn vào form.')
    } catch (err) {
      setError(err.message || 'Không tải media lên được.')
    } finally {
      setMediaUploading(false)
      input.value = ''
    }
  }

  const handleGameConfigImageUpload = async (event, target) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    try {
      setMediaUploading(true)
      setError('')
      const result = await adminApi.uploadMedia({
        file,
        purpose: 'game-media',
      })
      const storageKey = result.media_asset?.storage_key || result.media_asset?.url
      const previewUrl = result.media_asset?.url || storageKey
      if (!storageKey) {
        throw new Error('Backend chưa trả về đường dẫn media.')
      }

      if (target.type === 'prompt') {
        setContentForm((form) => ({ ...form, gamePromptImageUrl: storageKey, gamePromptPreviewUrl: previewUrl }))
      } else if (target.type === 'option') {
        updateGameOption(target.index, { imageUrl: storageKey, previewUrl })
      }
      setMessage('Đã tải ảnh game lên và điền vào form.')
    } catch (err) {
      setError(err.message || 'Không tải ảnh game lên được.')
    } finally {
      setMediaUploading(false)
      input.value = ''
    }
  }

  const handlePetSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      const payload = {
        name: petForm.name.trim(),
        description: petForm.description || null,
        image_url: petForm.imageUrl.trim(),
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
      setPetForm(emptyPetForm)
      setEditingPetId('')
      await loadAdminData()
    } catch (err) {
      setError(err.message || 'Không lưu được pet.')
    } finally {
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
            <span className="admin-kicker">Hệ thống HMI</span>
            <h1>Quản trị vận hành</h1>
            <p>Theo dõi người dùng, nội dung học tập, cửa hàng pet và cảnh báo chatbot.</p>
          </div>
          <div className="admin-actions">
            <label className="admin-search">
              <FiSearch aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." />
            </label>
            <button onClick={loadAdminData} disabled={loading}>
              <FiRefreshCw aria-hidden="true" />
              Làm mới
            </button>
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

            <div className="admin-panel">
              <div className="admin-panel-heading">
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
                {Object.keys(analytics?.emotions || {}).length === 0 && <p>Chưa có dữ liệu cảm xúc.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'contents' && (
          <section className="admin-section content-management">
            <form className="admin-form admin-content-form" onSubmit={handleContentSubmit}>
              <div className="admin-form-heading">
                <h2>{editingContentId ? 'Cập nhật nội dung' : 'Tạo nội dung mới'}</h2>
                <p>Quản lý bài học, câu hỏi và trò chơi AI cho trẻ.</p>
              </div>
              <AdminField label="Tiêu đề nội dung" hint="Tên sẽ hiển thị trong danh sách quản trị và các màn học/chơi của trẻ.">
                <input required placeholder="Ví dụ: Con thích ăn gì" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} />
              </AdminField>

              <div className="admin-form-row">
                <AdminField label="Loại nội dung" hint="Chọn đúng loại để hệ thống mở các trường dữ liệu phù hợp.">
                  <select value={contentForm.type} onChange={(e) => handleContentTypeChange(e.target.value)}>
                    <option value="GAME">Trò chơi</option>
                    <option value="QUIZ">Câu hỏi</option>
                    <option value="LECTURE">Bài học</option>
                  </select>
                </AdminField>
                <AdminField label="Trạng thái" hint="Bản nháp chưa hiển thị cho trẻ; đã xuất bản thì trẻ có thể thấy.">
                  <select value={contentForm.status} onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}>
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="DRAFT">Bản nháp</option>
                  </select>
                </AdminField>
              </div>

              <AdminField
                label={contentForm.type === 'QUIZ' ? 'Nội dung câu hỏi / mô tả' : 'Mô tả hiển thị'}
                hint={contentForm.type === 'GAME' ? 'Mô tả tình huống hoặc yêu cầu của trò chơi.' : 'Viết câu mô tả ngắn để trẻ hiểu nội dung cần làm.'}
              >
                <textarea placeholder="Ví dụ: Hãy chọn bạn đang vui" value={contentForm.description} onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} />
              </AdminField>

              <div className="admin-media-field">
                <AdminField
                  label={contentForm.type === 'GAME' ? 'Đường dẫn ảnh/video prompt' : 'Đường dẫn media'}
                  hint="Có thể nhập URL, storage key sau khi tải lên, hoặc để trống nếu nội dung không cần media."
                >
                  <input placeholder="Ví dụ: media/quiz-happy.png" value={contentForm.mediaUrl} onChange={(e) => setContentForm({ ...contentForm, mediaUrl: e.target.value })} />
                </AdminField>
                <AdminField label="Tải media từ máy" hint="Chọn ảnh hoặc video, hệ thống sẽ điền đường dẫn vào ô bên trái.">
                  <label className={`admin-upload-control ${mediaUploading ? 'disabled' : ''}`}>
                    <FiUpload aria-hidden="true" />
                    {mediaUploading ? 'Đang tải...' : 'Chọn video / Tải lên'}
                    <input
                      type="file"
                      accept="video/*,image/*"
                      disabled={mediaUploading}
                      onChange={handleContentMediaUpload}
                    />
                  </label>
                </AdminField>
              </div>

              <div className="admin-form-row">
                <AdminField label="Độ khó" hint="Nhập 1, 2 hoặc 3.">
                  <input type="number" min="1" max="3" value={contentForm.difficultyLevel} onChange={(e) => setContentForm({ ...contentForm, difficultyLevel: e.target.value })} />
                </AdminField>
                {contentForm.type === 'GAME' && (
                  <AdminField label="Sao mở khóa" hint="Số sao trẻ cần có để mở trò chơi này. Nhập 0 nếu miễn phí.">
                    <input type="number" min="0" value={contentForm.unlockStarCost} onChange={(e) => setContentForm({ ...contentForm, unlockStarCost: e.target.value })} />
                  </AdminField>
                )}
              </div>

              {contentForm.type === 'QUIZ' && (
                <div className="admin-form-group">
                  <div className="admin-form-group-title">Cấu hình câu hỏi</div>
                  <AdminField label="Các đáp án cảm xúc" hint="Nhập mã cảm xúc, cách nhau bằng dấu phẩy. Ví dụ: JOY,SAD,ANGRY,CALM.">
                    <input placeholder="JOY,SAD,ANGRY,CALM" value={contentForm.answerEmotions} onChange={(e) => setContentForm({ ...contentForm, answerEmotions: e.target.value })} />
                  </AdminField>
                  <AdminField label="Đáp án đúng" hint="Phải trùng với một mã trong danh sách đáp án phía trên.">
                    <input placeholder="Ví dụ: JOY" value={contentForm.correctEmotion} onChange={(e) => setContentForm({ ...contentForm, correctEmotion: e.target.value })} />
                  </AdminField>
                </div>
              )}

              {contentForm.type === 'GAME' && (
                <div className="admin-form-group">
                  <div className="admin-form-group-title">Cấu hình trò chơi AI</div>
                  <AdminField label="Loại game" hint="Game 1 dùng câu hỏi văn bản và ảnh đáp án; Game 2 dùng ảnh tình huống và ảnh đáp án.">
                    <select value={contentForm.gameKind} onChange={(e) => handleGameKindChange(e.target.value)}>
                      <option value="CHOOSE_EMOTION">Game 1 - Chọn cảm xúc đúng</option>
                      <option value="CHOOSE_REACTION">Game 2 - Chọn cách phản ứng</option>
                      <option value="MATCH_EMOTION">Game 3 - Biểu cảm đúng</option>
                    </select>
                  </AdminField>

                  {contentForm.gameKind !== 'MATCH_EMOTION' && (
                    <AdminField
                      label={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Câu hỏi / lời dẫn dưới ảnh' : 'Câu hỏi game 1'}
                      hint={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Ví dụ: Bạn bị ngã rồi. Con sẽ làm gì?' : 'Ví dụ: Ai đang BUỒN vậy con?'}
                    >
                      <input
                        placeholder={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Bạn bị ngã rồi. Con sẽ làm gì?' : 'Ai đang BUỒN vậy con?'}
                        value={contentForm.gameQuestion}
                        onChange={(e) => setContentForm({ ...contentForm, gameQuestion: e.target.value })}
                      />
                    </AdminField>
                  )}

                  {contentForm.gameKind === 'CHOOSE_REACTION' && (
                    <div className="admin-game-prompt-field">
                      <div className="admin-game-prompt-preview">
                        {contentForm.gamePromptPreviewUrl || contentForm.gamePromptImageUrl
                          ? <img src={contentForm.gamePromptPreviewUrl || contentForm.gamePromptImageUrl} alt="Ảnh câu hỏi Game 2" />
                          : <span>🖼️</span>}
                      </div>
                      <AdminField label="Ảnh câu hỏi / tình huống" hint="Ảnh lớn ở phía trên Game 2. Có thể nhập URL hoặc tải ảnh lên.">
                        <input
                          placeholder="Ví dụ: https://.../ban-bi-nga.png"
                          value={contentForm.gamePromptImageUrl}
                          onChange={(e) => setContentForm({ ...contentForm, gamePromptImageUrl: e.target.value, gamePromptPreviewUrl: e.target.value })}
                        />
                      </AdminField>
                      <AdminField label="Tải ảnh câu hỏi">
                        <label className={`admin-upload-control ${mediaUploading ? 'disabled' : ''}`}>
                          <FiUpload aria-hidden="true" />
                          Tải ảnh
                          <input
                            type="file"
                            accept="image/*"
                            disabled={mediaUploading}
                            onChange={(event) => handleGameConfigImageUpload(event, { type: 'prompt' })}
                          />
                        </label>
                      </AdminField>
                    </div>
                  )}

                  {contentForm.gameKind !== 'MATCH_EMOTION' && (
                    <div className="admin-game-options-editor">
                      <div className="admin-game-options-heading">
                        <strong>{contentForm.gameKind === 'CHOOSE_REACTION' ? 'Ảnh câu trả lời Game 2' : 'Ảnh minh họa đáp án Game 1'}</strong>
                        <span>{contentForm.gameKind === 'CHOOSE_REACTION' ? 'Chọn một hoặc nhiều đáp án đúng.' : 'Chọn một đáp án đúng.'}</span>
                      </div>
                      {normalizeGameOptions(contentForm.gameKind, contentForm.gameOptions).map((option, index) => (
                        <div className="admin-game-option-card" key={`${contentForm.gameKind}-${index}`}>
                          <div className="admin-game-option-preview">
                            {option.previewUrl || option.imageUrl
                              ? <img src={option.previewUrl || option.imageUrl} alt={option.label} />
                              : <span>{option.src || '🖼️'}</span>}
                          </div>
                          <div className="admin-game-option-fields">
                            <AdminField label={`Tên đáp án ${index + 1}`}>
                              <input value={option.label} onChange={(e) => updateGameOption(index, { label: e.target.value })} />
                            </AdminField>
                            <AdminField label={contentForm.gameKind === 'CHOOSE_REACTION' ? 'Mã phản ứng' : 'Mã cảm xúc'}>
                              <input
                                value={contentForm.gameKind === 'CHOOSE_REACTION' ? option.value : option.emotion}
                                onChange={(e) => updateGameOption(index, contentForm.gameKind === 'CHOOSE_REACTION'
                                  ? { value: e.target.value }
                                  : { emotion: e.target.value, value: e.target.value })}
                              />
                            </AdminField>
                            <AdminField label="URL ảnh">
                              <input value={option.imageUrl} placeholder="Dán URL ảnh minh họa" onChange={(e) => updateGameOption(index, { imageUrl: e.target.value, previewUrl: e.target.value })} />
                            </AdminField>
                            <AdminField label="Emoji dự phòng">
                              <input value={option.src} onChange={(e) => updateGameOption(index, { src: e.target.value })} />
                            </AdminField>
                          </div>
                          <div className="admin-game-option-actions">
                            <label className={`admin-upload-control ${mediaUploading ? 'disabled' : ''}`}>
                              <FiUpload aria-hidden="true" />
                              Tải ảnh
                              <input
                                type="file"
                                accept="image/*"
                                disabled={mediaUploading}
                                onChange={(event) => handleGameConfigImageUpload(event, { type: 'option', index })}
                              />
                            </label>
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
                      ))}
                    </div>
                  )}

                  <div className="admin-form-row">
                    <AdminField label="Cảm xúc mục tiêu" hint="Mã cảm xúc backend dùng để chấm. Ví dụ: JOY, SAD, ANGRY, CALM.">
                      <input placeholder="Ví dụ: JOY" value={contentForm.targetEmotion} onChange={(e) => setContentForm({ ...contentForm, targetEmotion: e.target.value })} />
                    </AdminField>
                    <AdminField label="Thời lượng giới hạn" hint="Số giây tối đa cho lượt chơi.">
                      <input type="number" min="1" value={contentForm.timeLimitSeconds} onChange={(e) => setContentForm({ ...contentForm, timeLimitSeconds: e.target.value })} />
                    </AdminField>
                  </div>
                </div>
              )}
              <div className="admin-form-actions">
                <button type="submit" disabled={loading || mediaUploading}>
                  {editingContentId ? <FiSave aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
                  {editingContentId ? 'Lưu thay đổi' : 'Tạo nội dung'}
                </button>
                {editingContentId && (
                  <button type="button" onClick={() => { setEditingContentId(''); setContentForm(emptyContentForm) }}>
                    <FiX aria-hidden="true" />
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="admin-table-card">
              <div className="admin-panel-heading">
                <div>
                  <h2>Danh sách nội dung</h2>
                  <p>{filteredContents.length} mục đang hiển thị</p>
                </div>
              </div>
              <div className="admin-table">
                {filteredContents.map((content) => (
                  <div className="admin-row" key={content.id}>
                    <div>
                      <strong>{content.title}</strong>
                      <span>{contentTypeLabels[content.type] || content.type} · {contentStatusLabels[content.status] || content.status}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => { setEditingContentId(content.id); setContentForm(toContentForm(content)) }}>
                        <FiEdit2 aria-hidden="true" />
                        Sửa
                      </button>
                      <button className="danger" onClick={() => handleDeleteContent(content.id)}>
                        <FiTrash2 aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {filteredContents.length === 0 && <p className="admin-empty">Chưa có nội dung phù hợp.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'pets' && (
          <section className="admin-section pet-management">
            <form className="admin-form admin-pet-form" onSubmit={handlePetSubmit}>
              <div className="admin-form-heading">
                <h2>{editingPetId ? 'Cập nhật pet' : 'Tạo pet mới'}</h2>
                <p>Cấu hình vật phẩm đổi sao trong cửa hàng.</p>
              </div>
              <input required placeholder="Tên pet" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} />
              <textarea placeholder="Mô tả" value={petForm.description} onChange={(e) => setPetForm({ ...petForm, description: e.target.value })} />
              <input required placeholder="Đường dẫn ảnh" value={petForm.imageUrl} onChange={(e) => setPetForm({ ...petForm, imageUrl: e.target.value })} />
              <input placeholder="Đường dẫn animation" value={petForm.animationUrl} onChange={(e) => setPetForm({ ...petForm, animationUrl: e.target.value })} />
              <div className="admin-form-row">
                <input type="number" min="0" value={petForm.unlockStarCost} onChange={(e) => setPetForm({ ...petForm, unlockStarCost: e.target.value })} />
                <select value={petForm.status} onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}>
                  <option value="ACTIVE">Đang bán</option>
                  <option value="HIDDEN">Đã ẩn</option>
                </select>
              </div>
              <div className="admin-form-actions">
                <button type="submit" disabled={loading}>
                  {editingPetId ? <FiSave aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
                  {editingPetId ? 'Lưu thay đổi' : 'Tạo pet'}
                </button>
                {editingPetId && (
                  <button type="button" onClick={() => { setEditingPetId(''); setPetForm(emptyPetForm) }}>
                    <FiX aria-hidden="true" />
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="admin-table-card">
              <div className="admin-panel-heading">
                <div>
                  <h2>Danh mục pet</h2>
                  <p>{filteredPets.length} pet đang hiển thị</p>
                </div>
              </div>
              <div className="admin-table">
                {filteredPets.map((pet) => (
                  <div className="admin-row" key={pet.id}>
                    <div>
                      <strong>{pet.name}</strong>
                      <span>{pet.unlock_star_cost} sao · {petStatusLabels[pet.status] || pet.status}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => { setEditingPetId(pet.id); setPetForm(toPetForm(pet)) }}>
                        <FiEdit2 aria-hidden="true" />
                        Sửa
                      </button>
                      <button className="danger" onClick={() => handleDeletePet(pet.id)}>
                        <FiTrash2 aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {filteredPets.length === 0 && <p className="admin-empty">Chưa có pet phù hợp.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="admin-section">
            <div className="admin-table-card">
              <div className="admin-panel-heading">
                <div>
                  <h2>Người dùng</h2>
                  <p>Quản lý vai trò và trạng thái tài khoản.</p>
                </div>
              </div>
              <div className="admin-table">
                {filteredUsers.map((user) => (
                  <div className="admin-row user" key={user.id}>
                    <div>
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
                    <button className="danger" onClick={() => adminApi.deleteUser(user.id, 'Xóa từ trang quản trị').then(loadAdminData).catch((err) => setError(err.message))}>
                      <FiTrash2 aria-hidden="true" />
                      Xóa
                    </button>
                  </div>
                ))}
                {filteredUsers.length === 0 && <p className="admin-empty">Không tìm thấy người dùng phù hợp.</p>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
