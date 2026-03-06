import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, CameraOutlined, ToolOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';

const Y = '#f5c518';
const INK = '#1a1a1a';
const INK2 = '#555';
const BG_API = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://api.ital-truck.com.ua';

const STATUS_COLOR = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  DONE: '#22c55e',
  CLOSED: '#6b7280',
  CANCELED: '#ef4444',
};

function StatusBadge({ status, label }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 14px', borderRadius: 12,
      fontSize: 13, fontWeight: 700,
      background: STATUS_COLOR[status] + '20',
      color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}40`,
    }}>{label}</span>
  );
}

export default function CabinetOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    cabinetAPI.getOrderById(id).then(r => setOrder(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>Завантаження...</div>;
  if (!order) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ color: '#aaa', marginBottom: 16 }}>Замовлення не знайдено</div>
      <button onClick={() => navigate('/cabinet/orders')} style={{ background: Y, border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>
        До замовлень
      </button>
    </div>
  );

  const totalWorks = order.works?.reduce((s, w) => s + Number(w.amount || 0), 0) || 0;
  const hasPhotos = order.photos?.length > 0;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: INK2, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeftOutlined /> Назад
      </button>

      {/* Order header */}
      <div style={{ background: '#fff', borderTop: `4px solid ${Y}`, padding: '20px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: INK }}>Замовлення №{order.order_number}</div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>
              {order.truck?.specific_model_name} · {order.truck?.license_plate}
            </div>
          </div>
          <StatusBadge status={order.status} label={order.status_display} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 24px', marginTop: 16 }}>
          {[
            { label: 'Дата', value: new Date(order.created_at).toLocaleDateString('uk-UA') },
            { label: 'Оновлено', value: new Date(order.updated_at).toLocaleDateString('uk-UA') },
            ...(order.current_mileage ? [{ label: 'Пробіг', value: `${order.current_mileage.toLocaleString('uk-UA')} км` }] : []),
            ...(order.total_cost > 0 ? [{ label: 'Вартість', value: `${Number(order.total_cost).toLocaleString('uk-UA')} ₴`, bold: true }] : []),
          ].map(({ label, value, bold }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: bold ? 800 : 600, color: bold ? INK : INK2 }}>{value}</div>
            </div>
          ))}
        </div>

        {order.problem_description && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>Опис проблеми</div>
            <div style={{ color: INK2, fontSize: 14, lineHeight: 1.65 }}>{order.problem_description}</div>
          </div>
        )}

        {order.recommendations && (
          <div style={{ marginTop: 14, padding: '14px 16px', background: '#fffbea', borderLeft: `3px solid ${Y}` }}>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>Рекомендації</div>
            <div style={{ color: INK2, fontSize: 14, lineHeight: 1.65 }}>{order.recommendations}</div>
          </div>
        )}
      </div>

      {/* Works */}
      {order.works?.length > 0 && (
        <div style={{ background: '#fff', padding: '20px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ToolOutlined style={{ color: Y, fontSize: 16 }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: INK, margin: 0 }}>Виконані роботи</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {order.works.map((work, i) => (
              <div key={work.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                padding: '12px 0', borderBottom: i < order.works.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{work.work_name || work.description}</div>
                  {work.work_name && work.description && (
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{work.description}</div>
                  )}
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                    {work.hours_spent} год × {Number(work.price_at_moment).toLocaleString('uk-UA')} ₴
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, flexShrink: 0 }}>
                  {Number(work.amount).toLocaleString('uk-UA')} ₴
                </div>
              </div>
            ))}
          </div>
          {totalWorks > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '2px solid #f0f0f0' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>
                Разом за роботи: {totalWorks.toLocaleString('uk-UA')} ₴
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <div style={{ background: '#fff', padding: '20px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CameraOutlined style={{ color: Y, fontSize: 16 }} />
          <h2 style={{ fontSize: 16, fontWeight: 800, color: INK, margin: 0 }}>
            Фото ремонту {hasPhotos ? `(${order.photos.length})` : ''}
          </h2>
        </div>
        {!hasPhotos ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#aaa', fontSize: 14 }}>
            Фотографій поки немає. Ви отримаєте сповіщення в Telegram, коли їх додадуть.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {order.photos.map(photo => {
              const src = photo.image.startsWith('http') ? photo.image : `${BG_API}${photo.image}`;
              return (
                <div
                  key={photo.id}
                  onClick={() => setLightboxSrc(src)}
                  style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer', background: '#f7f7f7' }}
                >
                  <img
                    src={src}
                    alt={photo.description || 'Фото ремонту'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.07)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16, cursor: 'zoom-out',
          }}
        >
          <img src={lightboxSrc} alt="Фото" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
