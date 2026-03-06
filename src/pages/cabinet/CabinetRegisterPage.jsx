import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cabinetAuthAPI } from '../../api/cabinet';

const Y = '#f5c518';
const YD = '#d4a800';
const INK = '#1a1a1a';

export default function CabinetRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) {
      setError("Заповніть усі обов'язкові поля");
      return;
    }
    if (form.password !== form.confirm) {
      setError('Паролі не збігаються');
      return;
    }
    if (form.password.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await cabinetAuthAPI.register({
        name: form.name,
        phone: form.phone,
        password: form.password,
      });
      navigate('/cabinet/login', { state: { registered: true } });
    } catch (err) {
      const data = err.response?.data;
      if (data?.phone) setError(Array.isArray(data.phone) ? data.phone[0] : data.phone);
      else if (data?.non_field_errors) setError(data.non_field_errors[0]);
      else setError('Помилка реєстрації. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "Ваше ім'я *", key: 'name', placeholder: 'Іван Петренко', type: 'text' },
    { label: 'Номер телефону *', key: 'phone', placeholder: '+380 ___ ___ __ __', type: 'tel' },
    { label: 'Пароль *', key: 'password', placeholder: 'Мінімум 6 символів', type: 'password' },
    { label: 'Підтвердження пароля *', key: 'confirm', placeholder: '••••••', type: 'password' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f7f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: Y, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 20, color: INK,
          }}>IT</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, margin: 0 }}>Особистий кабінет</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>Сервісний центр Італ Трак</p>
        </div>

        <div style={{ background: '#fff', padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${Y}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 24, marginTop: 0 }}>Реєстрація</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(({ label, key, placeholder, type }) => (
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
              {loading ? 'Реєстрація...' : 'Зареєструватися'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#888' }}>
            Вже є акаунт?{' '}
            <Link to="/cabinet/login" style={{ color: INK, fontWeight: 700, textDecoration: 'none' }}>
              Увійти
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ color: '#aaa', fontSize: 13, textDecoration: 'none' }}>
            ← Повернутись на сайт
          </Link>
        </div>
      </div>
    </div>
  );
}
