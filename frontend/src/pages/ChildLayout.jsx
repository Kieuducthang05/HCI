import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { FiHome, FiPackage, FiLogOut, FiHeart } from 'react-icons/fi'
import { childrenApi, getSelectedChild, setSelectedChild, petsApi, resolveMediaUrl } from '../services/api'
import { FaStar } from 'react-icons/fa'
import '../styles/Child.css'

function activePetStorageKey(childId) {
    return `hci.activePet.${childId}`
}

export default function ChildLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const selectedChild = getSelectedChild()
    const [userStars, setUserStars] = useState(selectedChild?.total_stars || 0)
    const [activePet, setActivePet] = useState(null)
    
    const activeMenu = location.pathname.split('/')[2] || 'home'
    const showTopbar = activeMenu !== 'chat'
    const isPlainChildPage = ['questions', 'games'].includes(activeMenu)
    const childDisplayName = selectedChild?.nickname || selectedChild?.name || 'bé'

    // Trang cho phép hiện pet: home, learn, games, questions, chat
    const showPetBox = useMemo(() => {
        const petPages = ['home', 'learn', 'games', 'questions', 'chat', 'emotion', 'calm-corner', 'emotion-recognition']
        return petPages.includes(activeMenu)
    }, [activeMenu])

    useEffect(() => {
        const child = getSelectedChild()
        if (!child?.id) return

        childrenApi.detail(child.id)
            .then((result) => {
                if (!result.child) return
                setSelectedChild(result.child)
                setUserStars(result.child.total_stars || 0)
            })
            .catch(() => {
                setUserStars(child.total_stars || 0)
            })
    }, [])

    // Tải thông tin pet đang dùng
    useEffect(() => {
        if (!selectedChild?.id || !showPetBox) {
            setActivePet(null)
            return
        }

        const activeId = localStorage.getItem(activePetStorageKey(selectedChild.id))
        if (!activeId) {
            setActivePet(null)
            return
        }

        petsApi.listChildPets(selectedChild.id)
            .then(result => {
                const found = result.child_pets?.find(p => p.id === activeId)
                if (found) {
                    const pet = found.pet || {}
                    setActivePet({
                        name: found.custom_name || pet.name || 'Bạn nhỏ',
                        imageUrl: resolveMediaUrl(pet.image_url),
                        animationUrl: resolveMediaUrl(pet.animation_url)
                    })
                } else {
                    setActivePet(null)
                }
            })
            .catch(() => setActivePet(null))
    }, [selectedChild?.id, location.pathname, showPetBox])

    const menuItems = [
        { id: 'home', label: 'Trang chủ', icon: <FiHome /> },
        { id: 'inventory', label: 'Kho', icon: <FiPackage /> }
    ]

    const handleMenuClick = (menuId) => {
        navigate(`/child/${menuId}`)
    }

    const handleLogout = () => {
        navigate('/select-user')
    }

    return (
        <div className={`child-container${isPlainChildPage ? ' child-container-plain' : ''}`}>
            {/* Top Bar with Stars */}
            {showTopbar && (
                <div className="child-topbar">
                    <nav className="child-top-nav">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                                onClick={() => handleMenuClick(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="child-topbar-title">
                        Không gian học tập của <b style={{ color: '#e5bc55' }}>{childDisplayName}</b>
                    </div>
                    <div className="topbar-right">
                        <div className="star-display">
                            <span className="star-icon"><FaStar /></span>
                            <span className="star-count">{userStars}</span>
                        </div>
                        <button className="logout-btn-child" onClick={handleLogout}>
                            <FiLogOut />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="child-main-content">
                {/* Truyền điểm số xuống cho các trang con sử dụng */}
                <Outlet context={{ userStars, setUserStars }} />
            </main>

            {/* Floating Active Pet */}
            {activePet && (
                <div className="active-pet-companion">
                    <img 
                        src={activePet.animationUrl || activePet.imageUrl} 
                        alt={activePet.name} 
                    />
                </div>
            )}

        </div>
    )
}
