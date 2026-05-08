import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneOutlined, UserOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { cabinetAPI } from '../../api/cabinet';
import useCabinetAuthStore from '../../store/cabinetAuthStore';

const Y = '#f5c518';
const INK = '#1a1a1a';
const INK2 = '#555';
const MAPS_URL = 'https://maps.app.goo.gl/mw4fVkobK3tsrpQ88';

export default function CabinetProfilePage() {
  const { t } = useTranslation();
  const { user } = useCabinetAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cabinetAPI.getMe().then(r => setProfile(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>{t('common.loading')}</div>;

  const rows = [
    { icon: <UserOutlined />, label: t('cabinet.profile.nameLabel'), value: profile?.name },
    { icon: <PhoneOutlined />, label: t('cabinet.profile.phoneLabel'), value: profile?.phone },
    { icon: <MailOutlined />, label: t('cabinet.profile.emailLabel'), value: profile?.email || '—' },
    { icon: <EnvironmentOutlined />, label: t('cabinet.profile.addressLabel'), value: profile?.address || '—' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, marginBottom: 24 }}>{t('cabinet.profile.title')}</h1>

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
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{t('cabinet.profile.clientSubtitle')}</div>
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
          {t('cabinet.profile.mapTitle')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="QR-код сервісного центру"
            style={{ display: 'inline-block', padding: 8, background: '#fff', border: `2px solid ${Y}`, borderRadius: 4, lineHeight: 0 }}
          >
            <QRCodeCanvas
              value={MAPS_URL}
              size={120}
              level="H"
              bgColor="#ffffff"
              fgColor={INK}
              includeMargin={false}
            />
          </a>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 6 }}>{t('cabinet.profile.serviceCenter')}</div>
            <div style={{ fontSize: 13, color: INK2, lineHeight: 1.7 }}>
              {t('cabinet.profile.mapHint')}
            </div>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, color: INK, background: Y, padding: '6px 14px', textDecoration: 'none', borderRadius: 3 }}
            >
              {t('cabinet.profile.openMaps')}
            </a>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          {t('cabinet.profile.changeDataHint')}
        </p>
      </div>
    </div>
  );
}
