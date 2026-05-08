import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cabinetAuthAPI } from '../../api/cabinet';
import useCabinetAuthStore from '../../store/cabinetAuthStore';
import logoImg from '../../assets/logo.jpg';

const Y = '#f5c518';
const YD = '#d4a800';
const INK = '#1a1a1a';

export default function CabinetLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useCabinetAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError(t('cabinet.login.subtitle'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await cabinetAuthAPI.login({
        username: form.username.replace(/[^\d+]/g, ''),
        password: form.password,
      });
      const { access, refresh, user } = res.data;
      setAuth(user, access, refresh);
      navigate('/cabinet');
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0];
      setError(detail || t('cabinet.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f7f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={logoImg} alt={t('brand.name')} style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, margin: 0 }}>{t('cabinet.login.title')}</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>{t('brand.serviceCenter')}</p>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${Y}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 24, marginTop: 0 }}>{t('cabinet.login.loginBtn')}</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: t('cabinet.login.phone'), key: 'username', placeholder: '+380 ___ ___ __ __', type: 'tel' },
              { label: t('cabinet.login.password'), key: 'password', placeholder: '••••••', type: 'password' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0',
                    fontSize: 15, outline: 'none', borderRadius: 4, color: INK,
                  }}
                  onFocus={e => e.target.style.borderColor = Y}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            ))}

            {error && (
              <div style={{ color: '#ef4444', fontSize: 13, background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: 4 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#ccc' : Y,
                border: 'none', color: INK, fontWeight: 800, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 4,
                marginTop: 4, transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = YD; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = Y; }}
            >
              {loading ? t('cabinet.login.loggingIn') : t('cabinet.login.loginBtn')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' }}>
            {t('cabinet.login.noAccount')}{' '}
            <Link to="/cabinet/register" style={{ color: INK, fontWeight: 700, textDecoration: 'none' }}>
              {t('cabinet.login.register')}
            </Link>
          </div>
        </div>

<div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ color: '#aaa', fontSize: 13, textDecoration: 'none' }}>
            {t('cabinet.login.backToSite')}
          </Link>
        </div>
      </div>
    </div>
  );
}
