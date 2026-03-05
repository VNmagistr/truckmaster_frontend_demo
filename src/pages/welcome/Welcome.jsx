import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import {
  ToolOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const PHONES = [
  { number: '+380955950777', operator: 'Vodafone' },
  { number: '+380675950777', operator: 'Kyivstar' },
  { number: '+380973950777', operator: 'Lifecell' },
];

const SERVICES = [
  {
    icon: <ToolOutlined />,
    title: 'Технічне обслуговування',
    items: [
      'Планове ТО за регламентом виробника',
      'Заміна моторного масла та фільтрів',
      'Перевірка та регулювання гальм',
      'Обслуговування трансмісії',
    ],
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'Комп\'ютерна діагностика',
    items: [
      'Повна діагностика електронних систем',
      'Зчитування та скидання помилок',
      'Перевірка всіх вузлів та агрегатів',
      'Діагностика гідравліки та пневматики',
    ],
  },
  {
    icon: <SettingOutlined />,
    title: 'Ремонт двигуна',
    items: [
      'Капітальний та поточний ремонт',
      'Заміна ГРМ та прокладок',
      'Ремонт турбокомпресора',
      'Гарантія на виконані роботи',
    ],
  },
];

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

const Welcome = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: '#1a1a1a', overflowX: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10, 20, 40, 0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'default' }}>
            <span style={{ fontSize: 28 }}>🚛</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' }}>Італ Трак</span>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 32 }} className="desktop-nav">
            {[['services', 'Послуги'], ['gallery', 'Галерея'], ['contacts', 'Контакти']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer',
                fontSize: 15, fontWeight: 500, padding: 0, transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = '#cbd5e1'}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Phone in header (desktop) */}
          <a href={`tel:${PHONES[0].number}`} style={{
            color: '#3b82f6', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }} className="desktop-nav">
            <PhoneOutlined />
            {formatPhone(PHONES[0].number)}
          </a>

          {/* Burger (mobile) */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            display: 'none', background: 'none', border: 'none', color: '#fff',
            fontSize: 22, cursor: 'pointer', padding: 4,
          }} className="mobile-burger">
            {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{
            background: 'rgba(10,20,40,0.98)', padding: '16px 24px 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {[['services', 'Послуги'], ['gallery', 'Галерея'], ['contacts', 'Контакти']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer',
                fontSize: 17, fontWeight: 500, textAlign: 'left', padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>{label}</button>
            ))}
            <a href={`tel:${PHONES[0].number}`} style={{ color: '#3b82f6', fontWeight: 600, fontSize: 16, textDecoration: 'none', paddingTop: 4 }}>
              <PhoneOutlined style={{ marginRight: 8 }} />
              {formatPhone(PHONES[0].number)}
            </a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1428 0%, #0f2547 50%, #0a1428 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '100px 24px 60px',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)',
        }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, width: '100%', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 28,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ color: '#94a3b8', fontSize: 14 }}>Авторизований сервіс Iveco</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, color: '#fff',
            lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px',
          }}>
            Сервісний центр{' '}
            <span style={{ background: 'linear-gradient(90deg, #3b82f6, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              вантажних авто
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.6 }}>
            Спеціалізуємося на обслуговуванні та ремонті вантажівок Iveco. Досвідчені майстри, оригінальні запчастини, гарантія якості.
          </p>

          {/* Phone buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
            {PHONES.map(({ number, operator }) => (
              <a key={number} href={`tel:${number}`} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 24px', textDecoration: 'none',
                transition: 'all 0.2s', color: '#fff',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                <PhoneOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{formatPhone(number)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{operator}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'center' }}>
            {[['10+', 'Років досвіду'], ['500+', 'Авто щороку'], ['3', 'Телефони підтримки']].map(([num, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{num}</div>
                <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
          <div style={{ width: 24, height: 40, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <div style={{ width: 4, height: 8, background: '#3b82f6', borderRadius: 2, animation: 'scrollDot 2s infinite' }} />
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: '96px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Що ми робимо
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>
              Наші послуги
            </h2>
            <p style={{ color: '#64748b', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
              Повний спектр технічного обслуговування та ремонту вантажної техніки Iveco
            </p>
          </div>

          <Row gutter={[32, 32]}>
            {SERVICES.map((service, i) => (
              <Col key={i} xs={24} md={8}>
                <div style={{
                  background: '#fff', borderRadius: 20, padding: 36,
                  height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(59,130,246,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, color: '#fff', marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  }}>
                    {service.icon}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                    {service.title}
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {service.items.map((item, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#475569', fontSize: 15, lineHeight: 1.4 }}>
                        <CheckCircleOutlined style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="gallery" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Наша робота
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>
              Галерея
            </h2>
            <p style={{ color: '#64748b', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
              Фотографії нашого сервісу, команди та виконаних робіт
            </p>
          </div>

          {/* Placeholder grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                aspectRatio: '4/3', borderRadius: 16,
                background: `linear-gradient(135deg, ${['#e0e7ff,#dbeafe', '#dcfce7,#d1fae5', '#fef3c7,#fde68a', '#fce7f3,#fbcfe8', '#f3e8ff,#ede9fe', '#e0f2fe,#bae6fd'][i]})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed #e2e8f0', color: '#94a3b8',
              }}>
                <span style={{ fontSize: 40, marginBottom: 12 }}>
                  {['🚛', '🔧', '⚙️', '🛠️', '🚚', '🔩'][i]}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Фото незабаром</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTS ── */}
      <section id="contacts" style={{ padding: '96px 24px', background: '#0a1428' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Як нас знайти
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px' }}>
              Контакти
            </h2>
          </div>

          <Row gutter={[48, 48]} align="middle">
            {/* Info */}
            <Col xs={24} lg={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                {/* Address */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <EnvironmentOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Адреса</div>
                    <div style={{ color: '#e2e8f0', fontSize: 16, lineHeight: 1.5 }}>
                      Львівська обл., смт. Запитів,<br />вул. Київська, 185
                    </div>
                  </div>
                </div>

                {/* Phones */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <PhoneOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Телефони</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {PHONES.map(({ number, operator }) => (
                        <a key={number} href={`tel:${number}`} style={{
                          display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                        }}>
                          <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 500 }}>{formatPhone(number)}</span>
                          <span style={{
                            fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)',
                            padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)',
                          }}>{operator}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Години роботи</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                        <span style={{ color: '#94a3b8', fontSize: 15 }}>Пн – Пт</span>
                        <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 500 }}>08:00 – 18:00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                        <span style={{ color: '#94a3b8', fontSize: 15 }}>Субота</span>
                        <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 500 }}>08:00 – 14:00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                        <span style={{ color: '#94a3b8', fontSize: 15 }}>Неділя</span>
                        <span style={{ color: '#ef4444', fontSize: 15, fontWeight: 500 }}>Вихідний</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Map */}
            <Col xs={24} lg={14}>
              <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <iframe
                  title="Карта"
                  src="https://maps.google.com/maps?q=Запитів+вул+Київська+185+Львівська+область+Україна&output=embed&hl=uk&z=15"
                  width="100%"
                  height="380"
                  style={{ display: 'block', border: 'none' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#06101f', padding: '24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🚛</span>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Італ Трак</span>
          </div>
          <span style={{ color: '#475569', fontSize: 14 }}>
            © {new Date().getFullYear()} Всі права захищено
          </span>
          <a href={`tel:${PHONES[0].number}`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            <PhoneOutlined style={{ marginRight: 6 }} />
            {formatPhone(PHONES[0].number)}
          </a>
        </div>
      </footer>

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes scrollDot {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(12px); }
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-burger { display: none !important; }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default Welcome;
