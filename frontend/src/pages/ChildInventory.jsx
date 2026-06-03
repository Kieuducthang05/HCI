import { useEffect, useMemo, useState } from 'react'
import { FiBox, FiCheckCircle, FiPackage } from 'react-icons/fi'
import { getSelectedChild, petsApi, resolveMediaUrl } from '../services/api'
import '../styles/Child.css'

function activePetStorageKey(childId) {
  return `hci.activePet.${childId}`
}

function normalizeChildPet(childPet) {
  const pet = childPet.pet || {}
  return {
    id: childPet.id,
    petId: childPet.pet_id,
    name: childPet.custom_name || pet.name || 'Vật phẩm',
    originalName: pet.name || 'Vật phẩm',
    description: pet.description || 'Vật phẩm bé đã đổi bằng sao.',
    imageUrl: resolveMediaUrl(pet.image_url),
    animationUrl: resolveMediaUrl(pet.animation_url),
    unlockedAt: childPet.unlocked_at,
    cost: pet.unlock_star_cost || 0,
  }
}

export default function ChildInventory() {
  const selectedChild = getSelectedChild()
  const [childPets, setChildPets] = useState([])
  const [activePetId, setActivePetId] = useState(() => (
    selectedChild?.id ? localStorage.getItem(activePetStorageKey(selectedChild.id)) || '' : ''
  ))
  const [loading, setLoading] = useState(Boolean(selectedChild?.id))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedChild?.id) {
      return
    }

    let mounted = true
    petsApi.listChildPets(selectedChild.id)
      .then((result) => {
        if (!mounted) return
        setChildPets(result.child_pets || [])
        setError('')
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không tải được kho vật phẩm.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedChild?.id])

  const inventory = useMemo(() => childPets.map(normalizeChildPet), [childPets])

  const filtered = inventory

  const handleUsePet = (item) => {
    if (!selectedChild?.id) return
    localStorage.setItem(activePetStorageKey(selectedChild.id), item.id)
    setActivePetId(item.id)
  }

  return (
    <div className="child-inventory shop-container" style={{ position: 'relative' }}>
      <div className="inventory-header shop-header">
        <div className="shop-title-section">
          <h2 className="shop-title">
            <FiPackage style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Kho vật phẩm của bé
          </h2>
          <p className="shop-description">Những pet và vật phẩm ba mẹ đã đổi sao cho bé.</p>
        </div>
      </div>

      <div className="inventory-stats-badge">
        <div className="stats-badge-content">
          <span className="stats-badge-label">Vật phẩm đã có:</span>
          <div className="stats-badge-value">
            <FiBox className="stats-badge-icon" />
            <span>{inventory.length}</span>
          </div>
        </div>
      </div>

      {error && <p className="inventory-error">{error}</p>}

      <div className="shop-items-grid">
        {loading && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <p>Đang tải kho vật phẩm...</p>
          </div>
        )}

        {!loading && filtered.length > 0 && filtered.map((item) => {
          const isActive = item.id === activePetId
          return (
            <div key={item.id} className={`shop-product-card inventory-item ${isActive ? 'active-pet' : ''}`}>
              <div className="product-category-tag">{isActive ? 'Đang sử dụng' : 'Thú cưng'}</div>
              
              <div className="product-image-area">
                {item.imageUrl ? (
                  <img className="product-image" src={item.imageUrl} alt={item.name} />
                ) : (
                  <div className="product-image" style={{ color: '#94a3b8' }}>
                    <FiPackage size={48} />
                  </div>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name">{item.name}</h3>
                <p className="product-description">{item.description}</p>
              </div>

              <div className="product-footer">
                <button 
                  className="buy-product-btn use-item-btn" 
                  onClick={() => handleUsePet(item)} 
                  disabled={isActive}
                  style={{ 
                    width: '100%', 
                    background: isActive ? '#10b981' : '#2f63b7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isActive ? (
                    <>
                      <FiCheckCircle /> Đang dùng
                    </>
                  ) : 'Dùng ngay'}
                </button>
              </div>
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <p>Bé chưa có vật phẩm nào.</p>
            <p className="empty-text">Ba mẹ có thể vào Cửa hàng sao để đổi pet cho bé.</p>
          </div>
        )}
      </div>
    </div>
  )
}
