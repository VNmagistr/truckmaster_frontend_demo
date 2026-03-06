import React, { useEffect, useState } from 'react';
import { PhoneOutlined, UserOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';
import useCabinetAuthStore from '../../store/cabinetAuthStore';

const Y = '#f5c518';
const INK = '#1a1a1a';
const INK2 = '#555';

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

      <div style={{ background: '#fff', borderTop: `4px solid ${Y}`, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        {/* Avatar placeholder */}
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

      <div style={{ background: '#fff', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Щоб змінити дані профілю або отримати Telegram-сповіщення про ремонт, зверніться до менеджера сервісного центру.
        </p>
      </div>
    </div>
  );
}
