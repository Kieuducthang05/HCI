import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      targetEmotion: form.targetEmotion.trim().toUpperCase(),
      timeLimitSeconds: Number(form.timeLimitSeconds),
      difficultyLevel: Number(form.difficultyLevel),
      isDefault: false,
      unlockStarCost: Number(form.unlockStarCost),
      promptAssetType: null,
      promptAssetUrl: form.mediaUrl || null,
    },
  }
}

function toContentForm(content) {
  return {
    title: content.title || '',
    type: content.type || 'GAME',
    status: content.status || 'PUBLISHED',
    description: content.lecture?.description || content.quiz?.description || '',
    mediaUrl: content.lecture?.media_url || content.quiz?.media_url || content.game?.prompt_asset_url || '',
    answerEmotions: (content.quiz?.answer_emotions || ['JOY', 'SAD', 'ANGRY', 'CALM']).join(','),
    correctEmotion: content.quiz?.correct_emotion || 'JOY',
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

  const userName = session?.user?.full_name || session?.user?.email || 'Admin'

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
          <strong>HMI Admin</strong>
          <span>{userName}</span>
        </div>
        <nav className="admin-nav">
          {[
            ['analytics', 'Analytics'],
            ['contents', 'Content'],
            ['pets', 'Pet Catalog'],
            ['users', 'Users'],
          ].map(([id, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={handleLogout}>Đăng xuất</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>Quản trị hệ thống</h1>
            <p>Nội dung học tập, pet, người dùng và chỉ số vận hành.</p>
          </div>
          <div className="admin-actions">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." />
            <button onClick={loadAdminData} disabled={loading}>Làm mới</button>
          </div>
        </header>

        {message && <div className="admin-alert success">{message}</div>}
        {error && <div className="admin-alert error">{error}</div>}

        {activeTab === 'analytics' && (
          <section className="admin-section">
            <div className="admin-grid stats">
              <StatCard label="Users" value={analytics?.users?.total || 0} hint={`${analytics?.users?.active || 0} active`} />
              <StatCard label="Parents" value={analytics?.users?.parents || 0} />
              <StatCard label="Admins" value={analytics?.users?.admins || 0} />
              <StatCard label="Children" value={analytics?.children?.total || 0} />
              <StatCard label="Sessions" value={analytics?.learning?.totalSessions || 0} hint={`${analytics?.learning?.completionRate || 0}% completed`} />
              <StatCard label="Quiz Success" value={`${analytics?.learning?.quizSuccessRate || 0}%`} />
              <StatCard label="Alerts" value={analytics?.alertsCount || 0} />
              <StatCard label="Banned" value={analytics?.users?.banned || 0} />
            </div>

            <div className="admin-panel">
              <h2>Emotion Logs</h2>
              <div className="admin-emotion-list">
                {Object.entries(analytics?.emotions || {}).map(([emotion, count]) => (
                  <div key={emotion}>
                    <span>{emotion || 'unknown'}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
                {Object.keys(analytics?.emotions || {}).length === 0 && <p>Chưa có dữ liệu cảm xúc.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'contents' && (
          <section className="admin-section split">
            <form className="admin-form" onSubmit={handleContentSubmit}>
              <h2>{editingContentId ? 'Sửa nội dung' : 'Tạo nội dung'}</h2>
              <input required placeholder="Tiêu đề" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} />
              <div className="admin-form-row">
                <select value={contentForm.type} onChange={(e) => setContentForm({ ...contentForm, type: e.target.value })}>
                  <option value="GAME">GAME</option>
                  <option value="QUIZ">QUIZ</option>
                  <option value="LECTURE">LECTURE</option>
                </select>
                <select value={contentForm.status} onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
              <textarea placeholder="Mô tả" value={contentForm.description} onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })} />
              <input placeholder="Media URL / Prompt URL" value={contentForm.mediaUrl} onChange={(e) => setContentForm({ ...contentForm, mediaUrl: e.target.value })} />
              <div className="admin-form-row">
                <input type="number" min="1" max="3" placeholder="Độ khó" value={contentForm.difficultyLevel} onChange={(e) => setContentForm({ ...contentForm, difficultyLevel: e.target.value })} />
                {contentForm.type === 'GAME' && (
                  <input type="number" min="0" placeholder="Sao mở khóa" value={contentForm.unlockStarCost} onChange={(e) => setContentForm({ ...contentForm, unlockStarCost: e.target.value })} />
                )}
              </div>
              {contentForm.type === 'QUIZ' && (
                <>
                  <input placeholder="Đáp án, cách nhau bởi dấu phẩy" value={contentForm.answerEmotions} onChange={(e) => setContentForm({ ...contentForm, answerEmotions: e.target.value })} />
                  <input placeholder="Đáp án đúng" value={contentForm.correctEmotion} onChange={(e) => setContentForm({ ...contentForm, correctEmotion: e.target.value })} />
                </>
              )}
              {contentForm.type === 'GAME' && (
                <div className="admin-form-row">
                  <input placeholder="Target emotion" value={contentForm.targetEmotion} onChange={(e) => setContentForm({ ...contentForm, targetEmotion: e.target.value })} />
                  <input type="number" min="1" placeholder="Time limit" value={contentForm.timeLimitSeconds} onChange={(e) => setContentForm({ ...contentForm, timeLimitSeconds: e.target.value })} />
                </div>
              )}
              <div className="admin-form-actions">
                <button type="submit" disabled={loading}>{editingContentId ? 'Lưu' : 'Tạo'}</button>
                {editingContentId && <button type="button" onClick={() => { setEditingContentId(''); setContentForm(emptyContentForm) }}>Hủy</button>}
              </div>
            </form>

            <div className="admin-table-card">
              <h2>Danh sách nội dung</h2>
              <div className="admin-table">
                {filteredContents.map((content) => (
                  <div className="admin-row" key={content.id}>
                    <div>
                      <strong>{content.title}</strong>
                      <span>{content.type} · {content.status}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => { setEditingContentId(content.id); setContentForm(toContentForm(content)) }}>Sửa</button>
                      <button className="danger" onClick={() => handleDeleteContent(content.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'pets' && (
          <section className="admin-section split">
            <form className="admin-form" onSubmit={handlePetSubmit}>
              <h2>{editingPetId ? 'Sửa pet' : 'Tạo pet'}</h2>
              <input required placeholder="Tên pet" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} />
              <textarea placeholder="Mô tả" value={petForm.description} onChange={(e) => setPetForm({ ...petForm, description: e.target.value })} />
              <input required placeholder="Image URL" value={petForm.imageUrl} onChange={(e) => setPetForm({ ...petForm, imageUrl: e.target.value })} />
              <input placeholder="Animation URL" value={petForm.animationUrl} onChange={(e) => setPetForm({ ...petForm, animationUrl: e.target.value })} />
              <div className="admin-form-row">
                <input type="number" min="0" value={petForm.unlockStarCost} onChange={(e) => setPetForm({ ...petForm, unlockStarCost: e.target.value })} />
                <select value={petForm.status} onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </div>
              <div className="admin-form-actions">
                <button type="submit" disabled={loading}>{editingPetId ? 'Lưu' : 'Tạo'}</button>
                {editingPetId && <button type="button" onClick={() => { setEditingPetId(''); setPetForm(emptyPetForm) }}>Hủy</button>}
              </div>
            </form>

            <div className="admin-table-card">
              <h2>Pet Catalog</h2>
              <div className="admin-table">
                {filteredPets.map((pet) => (
                  <div className="admin-row" key={pet.id}>
                    <div>
                      <strong>{pet.name}</strong>
                      <span>{pet.unlock_star_cost} sao · {pet.status}</span>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => { setEditingPetId(pet.id); setPetForm(toPetForm(pet)) }}>Sửa</button>
                      <button className="danger" onClick={() => handleDeletePet(pet.id)}>Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="admin-section">
            <div className="admin-table-card">
              <h2>Người dùng</h2>
              <div className="admin-table">
                {filteredUsers.map((user) => (
                  <div className="admin-row user" key={user.id}>
                    <div>
                      <strong>{user.full_name || user.email}</strong>
                      <span>{user.email} · {user.auth_provider}</span>
                    </div>
                    <select value={user.role} onChange={(e) => handleUpdateUser(user, { role: e.target.value })}>
                      <option value="PARENT">PARENT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <select value={user.status} onChange={(e) => handleUpdateUser(user, { status: e.target.value })}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="BANNED">BANNED</option>
                    </select>
                    <button className="danger" onClick={() => adminApi.deleteUser(user.id, 'Deleted from admin UI').then(loadAdminData).catch((err) => setError(err.message))}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
