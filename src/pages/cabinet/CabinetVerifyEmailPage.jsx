import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import cabinetInstance from '../../api/cabinet';
import logoImg from '../../assets/logo.jpg';

const Y = '#f5c518';
const INK = '#1a1a1a';

export default function CabinetVerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('cabinet.verifyEmail.tokenMissing'));
      return;
    }

    cabinetInstance
      .get(`/verify-email/?token=${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.detail || t('cabinet.verifyEmail.success'));
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.detail || t('cabinet.verifyEmail.error'));
      });
  }, [searchParams]);

  const icon = status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌';
  const color = status === 'success' ? '#22c55e' : status === 'error' ? '#ef4444' : '#888';

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f7f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={logoImg} alt={t('brand.name')} style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, margin: 0 }}>{t('cabinet.verifyEmail.title')}</h1>
        </div>

        <div style={{ background: '#fff', padding: '40px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${Y}`, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>

          {status === 'loading' && (
            <p style={{ color: '#888', fontSize: 15 }}>{t('cabinet.verifyEmail.checking')}</p>
          )}

          {status === 'success' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: INK, margin: '0 0 12px' }}>{t('cabinet.verifyEmail.confirmed')}</h2>
              <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>{message}</p>
              <Link
                to="/cabinet"
                style={{
                  display: 'block', padding: '13px', background: Y,
                  color: INK, fontWeight: 800, fontSize: 15, textDecoration: 'none',
                  borderRadius: 4,
                }}
              >
                {t('cabinet.verifyEmail.toCabinet')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: INK, margin: '0 0 12px' }}>{t('cabinet.verifyEmail.errorTitle')}</h2>
              <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 24 }}>{message}</p>
              <Link
                to="/cabinet"
                style={{
                  display: 'block', padding: '13px', background: Y,
                  color: INK, fontWeight: 800, fontSize: 15, textDecoration: 'none',
                  borderRadius: 4, marginBottom: 12,
                }}
              >
                {t('cabinet.verifyEmail.toCabinet')}
              </Link>
              <Link
                to="/cabinet/login"
                style={{ color: '#888', fontSize: 13, textDecoration: 'none' }}
              >
                {t('cabinet.verifyEmail.loginAndResend')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
