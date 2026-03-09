import React, { useEffect, useState } from 'react';
import { PhoneOutlined, UserOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';
import useCabinetAuthStore from '../../store/cabinetAuthStore';

const Y = '#f5c518';
const INK = '#1a1a1a';
const INK2 = '#555';
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://api.ital-truck.com.ua';
const MAPS_URL = 'https://maps.app.goo.gl/mw4fVkobK3tsrpQ88';

export default function CabinetProfilePage() {
  const { user } = useCabinetAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cabinetAPI.getMe().then(r => setProfile(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>Завантаження...</div>;

  const rows = [
    { icon: <UserOutlined />, label: "Ім'я", value: profile?.name },
    { icon: <PhoneOutlined />, label: 'Телефон', value: profile?.phone },
    { icon: <MailOutlined />, label: 'Email', value: profile?.email || '—' },
    { icon: <EnvironmentOutlined />, label: 'Адреса', value: profile?.address || '—' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, marginBottom: 24 }}>Мій профіль</h1>

      <div style={{ background: '#fff', borderTop: `4px solid ${Y}`, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, background: Y, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: INK,
          }}>
            {profile?.name?.[0]?.toUpperCase() || 'К'}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>{profile?.name}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Клієнт сервісного центру</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map(({ icon, label, value }, i) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 0', borderBottom: i < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <div style={{ width: 40, height: 40, background: '#fffbea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: INK, flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 15, color: INK2, marginTop: 2 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR-код сервісного центру */}
      <div style={{ background: '#fff', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
          Ми на карті
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            <img
              src={`${API_BASE}/static/qr_maps.png`}
              alt="QR-код сервісного центру"
              style={{ width: 120, height: 120, display: 'block', border: `2px solid ${Y}`, borderRadius: 4 }}
            />
          </a>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 6 }}>Сервісний центр Італ Трак</div>
            <div style={{ fontSize: 13, color: INK2, lineHeight: 1.7 }}>
              Відскануйте QR-код або натисніть на нього,<br />
              щоб відкрити нашу локацію в Google Maps.
            </div>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, color: INK, background: Y, padding: '6px 14px', textDecoration: 'none', borderRadius: 3 }}
            >
              Відкрити на картах
            </a>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Щоб змінити дані профілю або отримати Telegram-сповіщення про ремонт, зверніться до менеджера сервісного центру.
        </p>
      </div>
    </div>
  );
}
