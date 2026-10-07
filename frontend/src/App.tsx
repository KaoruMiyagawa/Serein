import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import Pet from './Pet'

type AuthMode = 'login' | 'register'

// 后端登录成功后返回的用户信息类型。
type User = {
  id: number
  login: string
  nickname: string | null
}

type CoupleSpace = {
  id: number
  name: string | null
  invite_code: string
}

type TodayCheckIn = {
  check_in_date: string
  my_checked_in: boolean
  partner_checked_in: boolean
}

type Anniversary = {
  id: number
  title: string
  anniversary_date: string
}

type SpaceMessage = {
  id: number
  user_id: number
  content: string
  created_at: string
}

type Mood = {
  id: number
  user_id: number
  mood_date: string
  mood_type: string
  note: string | null
}

type Memory = {
  id: number
  user_id: number
  title: string
  content: string
  image_url: string | null
  memory_date: string
  created_at: string
}

// FastAPI 后端地址。React 通过 fetch 请求这个地址。
const API_BASE_URL = 'http://127.0.0.1:8000'
const TOKEN_STORAGE_KEY = 'chenlun_access_token'

function App() {
  // mode 决定当前显示“登录”还是“注册”页面。
  const [mode, setMode] = useState<AuthMode>('login')
  // user 有值时，表示登录成功，页面会显示欢迎内容。
  const [user, setUser] = useState<User | null>(null)
  const [space, setSpace] = useState<CoupleSpace | null>(null)
  const [todayCheckIn, setTodayCheckIn] = useState<TodayCheckIn | null>(null)
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [messages, setMessages] = useState<SpaceMessage[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [moods, setMoods] = useState<Mood[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [spaceLoading, setSpaceLoading] = useState(false)
  const [spaceMode, setSpaceMode] = useState<'create' | 'join'>('create')
  const [spaceName, setSpaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [anniversaryTitle, setAnniversaryTitle] = useState('')
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [moodType, setMoodType] = useState('')
  const [moodNote, setMoodNote] = useState('')
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryContent, setMemoryContent] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [memoryFile, setMemoryFile] = useState<File | null>(null)
  const [memoryPreview, setMemoryPreview] = useState('')
  const [nickname, setNickname] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'today' | 'records' | 'chat' | 'me'>('today')
  const [meSection, setMeSection] = useState<'none' | 'profile' | 'space' | 'password'>('none')
  // error 和 message 用于给用户显示请求结果。
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  // 页面重新打开时，用保存的令牌向后端确认登录状态。
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('登录状态已失效')
        const currentUser = await response.json()
        setUser(currentUser)
        setNickname(currentUser.nickname ?? '')
        await loadSpace(token)
        await loadTodayCheckIn(token)
        await loadAnniversaries(token)
        await loadMessages(token)
        await loadMoods(token)
        await loadMemories(token)
      })
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
  }, [])

  async function loadSpace(token: string) {
    setSpaceLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/spaces/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSpace(data)
        setSpaceName(data.name ?? '')
      } else setSpace(null)
    } finally {
      setSpaceLoading(false)
    }
  }

  async function loadTodayCheckIn(token: string) {
    const response = await fetch(`${API_BASE_URL}/checkins/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setTodayCheckIn(await response.json())
  }

  async function loadAnniversaries(token: string) {
    const response = await fetch(`${API_BASE_URL}/anniversaries/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setAnniversaries(await response.json())
  }

  async function loadMessages(token: string) {
    const response = await fetch(`${API_BASE_URL}/messages/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setMessages(await response.json())
  }

  // 聊天页之外，每 5 秒检查一次新留言；这是当前 MVP 的轻量实时方案。
  useEffect(() => {
    if (!user || !space) return
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return

    const refreshMessages = async () => {
      const response = await fetch(`${API_BASE_URL}/messages/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const latestMessages: SpaceMessage[] = await response.json()
      setMessages(latestMessages)
      if (activeTab !== 'chat') {
        const lastReadAt = localStorage.getItem(`chenlun_messages_read_${user.id}`) ?? ''
        setUnreadMessages(latestMessages.filter((item) => item.user_id !== user.id && item.created_at > lastReadAt).length)
      }
    }

    const timer = window.setInterval(refreshMessages, 5000)
    return () => window.clearInterval(timer)
  }, [user, space, activeTab])

  useEffect(() => {
    if (!user || activeTab !== 'chat') return
    localStorage.setItem(`chenlun_messages_read_${user.id}`, new Date().toISOString())
    setUnreadMessages(0)
  }, [user, activeTab, messages.length])

  async function loadMoods(token: string) {
    const response = await fetch(`${API_BASE_URL}/moods/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setMoods(await response.json())
  }

  async function loadMemories(token: string) {
    const response = await fetch(`${API_BASE_URL}/memories/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) setMemories(await response.json())
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 阻止浏览器默认刷新页面，改为用 JavaScript 请求后端。
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    // 从表单中读取用户输入的账号和密码。
    const formData = new FormData(event.currentTarget)
    const payload = {
      login: String(formData.get('login') ?? ''),
      password: String(formData.get('password') ?? ''),
    }
    // 注册时，先在前端检查两次密码是否一致。
    // 这一步属于表单校验，避免明显错误的数据发送到后端。
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (isRegister && payload.password !== confirmPassword) {
      setError('两次输入的密码不一致')
      setIsSubmitting(false)
      return
    }

    try {
      // 根据当前页面模式，请求注册接口或登录接口。
      const response = await fetch(`${API_BASE_URL}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '请求失败，请稍后再试')

      if (isRegister) {
        // 注册成功后回到登录模式，让用户继续登录。
        setMode('login')
        setMessage('注册成功，请登录')
      } else {
        // 登录成功后保存令牌，页面切换到欢迎状态。
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
        setUser(data.user)
        setNickname(data.user.nickname ?? '')
        await loadSpace(data.access_token)
        await loadTodayCheckIn(data.access_token)
        await loadAnniversaries(data.access_token)
        await loadMessages(data.access_token)
        await loadMoods(data.access_token)
        await loadMemories(data.access_token)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '请求失败，请检查后端是否运行')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSpaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setError('登录状态已失效，请重新登录')
      return
    }

    const endpoint = spaceMode === 'create' ? '/spaces' : '/spaces/join'
    const body = spaceMode === 'create'
      ? { name: spaceName.trim() || null }
      : { invite_code: inviteCode.trim().toUpperCase() }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '操作失败')
      setSpace(data)
      await loadTodayCheckIn(token)
      await loadAnniversaries(token)
      await loadMessages(token)
      await loadMoods(token)
      await loadMemories(token)
      setMessage(spaceMode === 'create' ? '空间创建成功，请把邀请码发给另一半' : '绑定成功')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleTodayCheckIn() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return

    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/checkins/today`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '打卡失败')
      setTodayCheckIn(data)
      setMessage('今天打卡完成')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '打卡失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAnniversarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !anniversaryTitle.trim() || !anniversaryDate) return

    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/anniversaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: anniversaryTitle.trim(), anniversary_date: anniversaryDate }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '纪念日保存失败')
      setAnniversaries((current) => [...current, data])
      setAnniversaryTitle('')
      setAnniversaryDate('')
      setMessage('纪念日已保存')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '纪念日保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  function getDaysFromAnniversary(value: string) {
    const start = new Date(`${value}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.floor((today.getTime() - start.getTime()) / 86400000)
  }

  async function handleMessageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !messageContent.trim()) return

    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: messageContent.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '留言发送失败')
      setMessages((current) => [data, ...current])
      setMessageContent('')
      setMessage('留言已发送')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '留言发送失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMoodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !moodType) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/moods/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mood_type: moodType, note: moodNote.trim() || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '心情保存失败')
      setMoods((current) => [...current.filter((item) => item.user_id !== data.user_id), data])
      setMoodNote('')
      setMessage('今天的心情已保存')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '心情保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMemorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !memoryTitle.trim() || !memoryContent.trim() || !memoryDate) return
    setIsSubmitting(true)
    try {
      let body: BodyInit
      const endpoint = memoryFile ? '/memories/upload' : '/memories'
      const headers: HeadersInit = { Authorization: `Bearer ${token}` }
      if (memoryFile) {
        const formData = new FormData()
        body = formData
        formData.append('title', memoryTitle.trim())
        formData.append('content', memoryContent.trim())
        formData.append('memory_date', memoryDate)
        formData.append('image', memoryFile)
      } else {
        body = JSON.stringify({ title: memoryTitle.trim(), content: memoryContent.trim(), memory_date: memoryDate })
        headers['Content-Type'] = 'application/json'
      }
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '回忆保存失败')
      setMemories((current) => [data, ...current])
      setMemoryTitle('')
      setMemoryContent('')
      setMemoryDate('')
      setMemoryFile(null)
      setMemoryPreview('')
      setMessage('回忆已保存')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '回忆保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !nickname.trim()) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '昵称保存失败')
      setUser(data)
      setMessage('昵称已保存')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '昵称保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSpaceSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !space) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/spaces/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: spaceName.trim() || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '空间名称保存失败')
      setSpace(data)
      setMessage('空间名称已保存')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '空间名称保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegenerateInvite() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/spaces/me/regenerate-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '邀请码更新失败')
      setSpace(data)
      setMessage('邀请码已更新，旧邀请码失效')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '邀请码更新失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token || !oldPassword || !newPassword) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? '密码修改失败')
      setOldPassword('')
      setNewPassword('')
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '密码修改失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user) {
    if (spaceLoading) {
      return <main className="auth-page"><section className="auth-card"><p className="subtitle">正在准备你们的空间…</p></section></main>
    }

    if (!space) {
      return (
        <main className="auth-page">
          <section className="auth-card space-card">
            <p className="eyebrow">沉沦</p>
            <h1>绑定</h1>
            <p className="subtitle">先创建你们的空间，或输入另一半的邀请码</p>
            <div className="space-tabs">
              <button className={spaceMode === 'create' ? 'active' : ''} onClick={() => setSpaceMode('create')} type="button">创建空间</button>
              <button className={spaceMode === 'join' ? 'active' : ''} onClick={() => setSpaceMode('join')} type="button">输入邀请码</button>
            </div>
            <form className="auth-form" onSubmit={handleSpaceSubmit}>
              {spaceMode === 'create' ? (
                <label><span>空间名称（可选）</span><input value={spaceName} onChange={(event) => setSpaceName(event.target.value)} placeholder="例如：我们的小屋" /></label>
              ) : (
                <label><span>6 位邀请码</span><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="输入邀请码" maxLength={6} /></label>
              )}
              <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? '处理中…' : spaceMode === 'create' ? '创建空间' : '确认绑定'}</button>
            </form>
            {message && <p className="form-message success-message">{message}</p>}
            {error && <p className="form-message error-message">{error}</p>}
          </section>
        </main>
      )
    }

    return (
      <main className="auth-page">
        <section className="auth-card welcome-card">
          <p className="eyebrow">沉沦</p>
          <h1>{activeTab === 'today' ? '今天' : activeTab === 'records' ? '记录' : activeTab === 'chat' ? '聊天' : '我'}</h1>
          <p className="subtitle">你好，{user.nickname ?? user.login}</p>
          {activeTab === 'today' && <>
            <h2 className="today-greeting">早安，{user.nickname || '你'}</h2>
            <p className="today-subtitle">今天也要温柔一点</p>
            <div className="today-status-card">
              <span>你们的今日状态</span>
              <strong>{(todayCheckIn?.my_checked_in ? 1 : 0) + (todayCheckIn?.partner_checked_in ? 1 : 0)} / 2</strong>
              <small>{todayCheckIn?.my_checked_in && todayCheckIn?.partner_checked_in ? '今天已经一起完成打卡' : '还差一点，等另一半一起完成'}</small>
              <button className="primary-button" type="button" onClick={handleTodayCheckIn} disabled={isSubmitting || todayCheckIn?.my_checked_in}>
                {todayCheckIn?.my_checked_in ? '今天已完成' : isSubmitting ? '提交中…' : '完成今日打卡'}
              </button>
            </div>
            <div className="today-mini-grid">
              <form className="today-mini-card mood-mini-card" onSubmit={handleMoodSubmit}>
                <span>我的心情</span>
                <select value={moodType} onChange={(event) => setMoodType(event.target.value)} required>
                  <option value="">选择心情</option>
                  <option value="开心">😊 开心</option>
                  <option value="平静">🌿 平静</option>
                  <option value="想你">💭 想你</option>
                  <option value="疲惫">🌙 疲惫</option>
                  <option value="难过">☁️ 难过</option>
                </select>
                <input value={moodNote} onChange={(event) => setMoodNote(event.target.value)} placeholder="写一点…" maxLength={200} />
                <small>{moods.find((item) => item.user_id !== user.id)?.mood_type ? `另一半：${moods.find((item) => item.user_id !== user.id)?.mood_type}` : '等另一半记录心情'}</small>
                <button className="text-button" type="submit" disabled={isSubmitting}>保存</button>
              </form>
              <button className="today-mini-card anniversary-mini-card" type="button" onClick={() => setActiveTab('records')}>
                <span>纪念日</span>
                <strong>{anniversaries[0] ? Math.max(0, getDaysFromAnniversary(anniversaries[0].anniversary_date)) : '—'}</strong>
                <small>{anniversaries[0] ? '相伴天数　›' : '去添加纪念日　›'}</small>
              </button>
            </div>
            <button className="recent-message-card" type="button" onClick={() => setActiveTab('chat')}>
              <span>最近留言</span>
              <strong>{messages[0]?.content || '还没有新的留言'}</strong>
              <small>去聊天　›</small>
            </button>
          </>}
          {message && <p className="form-message success-message">{message}</p>}
          {error && <p className="form-message error-message">{error}</p>}
          {activeTab === 'records' && <div className="records-page">
            <div className="anniversary-hero">
              <span>在一起</span>
              <strong>{anniversaries[0] ? `${Math.max(0, getDaysFromAnniversary(anniversaries[0].anniversary_date))} 天` : '还没有纪念日'}</strong>
            </div>
            <p className="records-label">最近回忆</p>
            <div className="anniversary-card">
            <p className="checkin-title">纪念日</p>
            {anniversaries.map((item) => {
              const days = getDaysFromAnniversary(item.anniversary_date)
              return <div className="anniversary-item" key={item.id}>
                <span>{item.title}</span>
                <strong>{days >= 0 ? `已经 ${days} 天` : `还有 ${Math.abs(days)} 天`}</strong>
              </div>
            })}
            <form className="anniversary-form" onSubmit={handleAnniversarySubmit}>
              <input value={anniversaryTitle} onChange={(event) => setAnniversaryTitle(event.target.value)} placeholder="例如：在一起" required />
              <input type="date" value={anniversaryDate} onChange={(event) => setAnniversaryDate(event.target.value)} required />
              <button className="text-button" type="submit" disabled={isSubmitting}>保存纪念日</button>
            </form>
            <p className="checkin-title memory-heading">回忆时间线</p>
            {memories.map((item) => (
              <article className="memory-item" key={item.id}>
                <small>{item.memory_date}</small>
                <h3>{item.title}</h3>
                {item.image_url && <img className="memory-image" src={`${API_BASE_URL}${item.image_url}`} alt={item.title} />}
                <p>{item.content}</p>
              </article>
            ))}
            <form className="memory-form" onSubmit={handleMemorySubmit}>
              <input value={memoryTitle} onChange={(event) => setMemoryTitle(event.target.value)} placeholder="回忆标题" required />
              <input type="date" value={memoryDate} onChange={(event) => setMemoryDate(event.target.value)} required />
              <textarea value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} placeholder="记录这一刻…" maxLength={1000} required />
              <label className="memory-upload-label">
                <span className="memory-upload-title">添加一张照片（可选）</span>
                <span className="memory-file-button">{memoryFile ? '已选择一张照片' : '选择照片'}</span>
                <small>支持 JPG、PNG、WEBP，最大 5MB</small>
                <input className="memory-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) {
                    setError('图片不能超过 5MB')
                    event.currentTarget.value = ''
                    return
                  }
                  setError('')
                  setMemoryFile(file)
                  setMemoryPreview(URL.createObjectURL(file))
                }} />
              </label>
              {memoryPreview && <img className="memory-preview" src={memoryPreview} alt="待保存的回忆预览" />}
              <button className="text-button" type="submit" disabled={isSubmitting}>保存回忆</button>
            </form>
            </div>
          </div>}
          {activeTab === 'chat' && <div className="message-card">
            <p className="checkin-title">只属于你们的对话</p>
            {messages.length === 0 && <small>写下想对另一半说的话</small>}
            {messages.map((item) => (
              <div className={`message-item ${item.user_id === user.id ? 'mine' : 'partner'}`} key={item.id}>
                <small>{item.user_id === user.id ? '我' : '另一半'}</small>
                <p>{item.content}</p>
              </div>
            ))}
            <form className="message-form" onSubmit={handleMessageSubmit}>
              <textarea value={messageContent} onChange={(event) => setMessageContent(event.target.value)} placeholder="写一句话…" maxLength={500} required />
              <button className="text-button" type="submit" disabled={isSubmitting}>发送留言</button>
            </form>
          </div>}
          {activeTab === 'me' && <div className="me-card me-list">
            <div className="me-identity">
              <div className="me-avatar">橘</div>
              <div><strong>{nickname || '还没有昵称'}</strong><small>{user.login}</small></div>
            </div>
            <button className="me-row" type="button" onClick={() => setMeSection(meSection === 'profile' ? 'none' : 'profile')}><span>昵称</span><span>{nickname || '设置昵称'}　›</span></button>
            {meSection === 'profile' && <form className="profile-form me-expanded-form" onSubmit={handleProfileSubmit}>
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="输入昵称" maxLength={80} required />
              <button className="text-button" type="submit" disabled={isSubmitting}>保存昵称</button>
            </form>}
            <button className="me-row" type="button" onClick={() => setMeSection(meSection === 'space' ? 'none' : 'space')}><span>情侣空间</span><span>{space.name || '你们的小屋'}　›</span></button>
            {meSection === 'space' && <div className="me-expanded-form">
              <form className="profile-form" onSubmit={handleSpaceSettingsSubmit}>
                <input value={spaceName} onChange={(event) => setSpaceName(event.target.value)} placeholder="你们的小屋" maxLength={80} />
                <button className="text-button" type="submit" disabled={isSubmitting}>保存空间名称</button>
              </form>
              <small className="invite-line">邀请码：{space.invite_code}</small>
              <button className="text-button" type="button" onClick={handleRegenerateInvite} disabled={isSubmitting}>重新生成邀请码</button>
            </div>}
            <button className="me-row" type="button" onClick={() => setMeSection(meSection === 'password' ? 'none' : 'password')}><span>修改密码</span><span>›</span></button>
            {meSection === 'password' && <form className="profile-form me-expanded-form" onSubmit={handlePasswordSubmit}>
              <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} placeholder="旧密码" minLength={8} required />
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="新密码" minLength={8} required />
              <button className="text-button" type="submit" disabled={isSubmitting}>保存新密码</button>
            </form>}
            <button className="logout-link" type="button" onClick={() => { localStorage.removeItem(TOKEN_STORAGE_KEY); setUser(null) }}>退出登录</button>
          </div>}
          <nav className="bottom-nav" aria-label="主导航">
            <button className={activeTab === 'today' ? 'active' : ''} onClick={() => setActiveTab('today')} type="button">今天</button>
            <button className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')} type="button">记录</button>
            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')} type="button">聊天{unreadMessages > 0 && <b className="unread-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</b>}</button>
            <button className={activeTab === 'me' ? 'active' : ''} onClick={() => setActiveTab('me')} type="button">我</button>
          </nav>
          <Pet />
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="沉沦账号入口">
        <div className="brand-copy">
          <p className="eyebrow">沉沦</p>
          <h1>{isRegister ? '注册' : '登录'}</h1>
          <p className="subtitle">只属于你们的日常空间</p>
        </div>
        {/* 提交表单时会执行 handleSubmit，而不是刷新浏览器。 */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label><span>手机号或邮箱</span><input name="login" type="text" placeholder="输入手机号或邮箱" autoComplete="username" required /></label>
          <label><span>{isRegister ? '设置密码' : '密码'}</span><input name="password" type="password" placeholder="输入密码" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required /></label>
          {isRegister && <label><span>确认密码</span><input name="confirmPassword" type="password" placeholder="再次输入密码" autoComplete="new-password" /></label>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? '处理中…' : isRegister ? '注册' : '登录'}</button>
        </form>
        {message && <p className="form-message success-message">{message}</p>}
        {error && <p className="form-message error-message">{error}</p>}
        {!isRegister && <button className="text-button forgot-button" type="button">忘记密码</button>}
        <div className="auth-switch">
          <span>{isRegister ? '已经有账号？' : '还没有账号？'}</span>
          <button className="text-button" type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>{isRegister ? '登录' : '注册账号'}</button>
        </div>
        <p className="future-login">微信 / QQ 登录将在后续版本加入</p>
      </section>
    </main>
  )
}

export default App
