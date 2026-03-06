import React, { useState, useEffect } from 'react';
import { Row, Col, Collapse } from 'antd';
import {
  ToolOutlined, ThunderboltOutlined, SettingOutlined, PhoneOutlined,
  EnvironmentOutlined, ClockCircleOutlined, MenuOutlined, CloseOutlined,
  SafetyCertificateOutlined, StarOutlined,
  DollarOutlined, CarOutlined, SendOutlined, LoadingOutlined, ArrowUpOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.ital-truck.com.ua/api';

const Y   = '#f5c518';   // yellow
const YD  = '#c9a100';   // yellow dim
const D0  = '#080808';   // deepest black
const D1  = '#0f0f0f';   // dark section
const D2  = '#131313';   // card bg
const D3  = '#0d0d0d';   // input bg

const PHONES = [
  { number: '+380955950777', operator: 'Vodafone' },
  { number: '+380675950777', operator: 'Kyivstar' },
  { number: '+380973950777', operator: 'Kyivstar' },
];

const SERVICES = [
  {
    icon: <ToolOutlined />,
    title: 'Технічне обслуговування',
    items: ['Планове ТО за регламентом виробника', 'Заміна моторного масла та фільтрів', 'Перевірка та регулювання гальм', 'Обслуговування трансмісії'],
  },
  {
    icon: <ThunderboltOutlined />,
    title: "Комп'ютерна діагностика",
    items: ['Повна діагностика автомобіля', 'Зчитування та скидання помилок', 'Перевірка всіх вузлів та агрегатів', 'Діагностика гідравліки та пневматики'],
  },
  {
    icon: <SettingOutlined />,
    title: 'Ремонт двигуна',
    items: ['Капітальний та поточний ремонт', 'Заміна ГРМ та прокладок', 'Заміна турбокомпресора'],
  },
];

const WHY_US = [
  { icon: <StarOutlined />, title: '10+ років досвіду', desc: 'Спеціалізуємося виключно на вантажній техніці Iveco — знаємо кожну деталь' },
  { icon: <SafetyCertificateOutlined />, title: 'Оригінальні запчастини', desc: 'Використовуємо тільки оригінальні та сертифіковані аналоги від перевірених постачальників' },
  { icon: <ThunderboltOutlined />, title: 'Швидка діагностика', desc: 'Сучасне діагностичне обладнання дозволяє точно та швидко виявити несправність' },
  { icon: <DollarOutlined />, title: 'Прозоре ціноутворення', desc: 'Без прихованих витрат. Погоджуємо вартість до початку робіт' },
  { icon: <CarOutlined />, title: 'Зручне розташування', desc: "смт. Запитів, Львівська обл. — зручний під'їзд для великовагової техніки" },
];

const FAQ_ITEMS = [
  { key: '1', label: 'Як часто потрібно робити ТО для Iveco?', children: 'Виробник рекомендує ТО кожні 20 000/45000/75000 км відповідно до типу двигуна або 1 раз на рік — залежно від умов експлуатації. Для важких умов (пил, короткі поїздки, гори) інтервал може бути скорочений. Наші майстри нададуть індивідуальну рекомендацію після діагностики.' },
  { key: '2', label: 'Які моделі Iveco ви обслуговуєте?', children: 'Ми обслуговуємо весь модельний ряд: Iveco Daily, Eurocargo, Stralis, Trakker, S-Way та інші. Маємо досвід роботи з усіма поколіннями та двигунами від Euro 3 до Euro 6.' },
  { key: '3', label: 'Як дізнатися вартість ремонту?', children: 'Зателефонуйте або залиште заявку на сайті — ми безкоштовно проконсультуємо та надамо орієнтовну вартість. Точна вартість визначається після діагностики.' },
  { key: '4', label: 'Чи можна записатися заздалегідь?', children: 'Так, і ми це рекомендуємо. Запишіться по телефону або через форму на сайті — це дозволить нам підготуватися та заощадить ваш час.' },
];

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

/* ── SVG truck silhouette (Iveco cab-over style) ── */
function TruckIcon({ width = 64 }) {
  const h = Math.round(width * 0.52);
  return (
    <svg width={width} height={h} viewBox="0 0 124 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="38" y="9" width="82" height="30" rx="2" fill={Y} />
      <line x1="38" y1="24" x2="120" y2="24" stroke={D0} strokeWidth="0.8" opacity="0.3" />
      <line x1="80" y1="9" x2="80" y2="39" stroke={D0} strokeWidth="0.8" opacity="0.25" />
      <rect x="35" y="17" width="4" height="14" rx="1" fill={YD} />
      <path d="M3 13 Q3 9 7 9 L37 9 L37 39 L3 39 Z" fill={Y} />
      <path d="M6 14 Q6 11 9 11 L22 11 L22 25 L6 25 Z" fill={D0} opacity="0.55" />
      <rect x="24" y="12" width="10" height="10" rx="1" fill={D0} opacity="0.45" />
      <rect x="33" y="20" width="2" height="3" rx="0.5" fill={YD} opacity="0.7" />
      <rect x="5" y="37" width="14" height="3" rx="0.5" fill={YD} opacity="0.6" />
      <rect x="3" y="26" width="5" height="7" rx="1" fill="#fffbe0" opacity="0.9" />
      <rect x="2" y="33" width="10" height="5" rx="1" fill={YD} />
      <rect x="31" y="1" width="3.5" height="10" rx="1.5" fill={YD} />
      <path d="M7 9 L7 6 L30 6 L37 9 Z" fill={YD} />
      <circle cx="16" cy="44" r="10" fill="#1a1a1a" />
      <circle cx="16" cy="44" r="6.5" fill="#252525" />
      <circle cx="16" cy="44" r="3" fill="#1a1a1a" />
      <circle cx="16" cy="44" r="1.2" fill={Y} opacity="0.5" />
      <circle cx="84" cy="44" r="10" fill="#1a1a1a" />
      <circle cx="84" cy="44" r="6.5" fill="#252525" />
      <circle cx="84" cy="44" r="3" fill="#1a1a1a" />
      <circle cx="84" cy="44" r="1.2" fill={Y} opacity="0.5" />
      <circle cx="100" cy="44" r="10" fill="#1a1a1a" />
      <circle cx="100" cy="44" r="6.5" fill="#252525" />
      <circle cx="100" cy="44" r="3" fill="#1a1a1a" />
      <circle cx="100" cy="44" r="1.2" fill={Y} opacity="0.5" />
    </svg>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ color: Y, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 14, textAlign: 'center' }}>
      &#9472; {text} &#9472;
    </div>
  );
}

const sTitleStyle = {
  fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
  fontWeight: 900,
  color: '#fff',
  marginBottom: 16,
  letterSpacing: '-0.5px',
  textAlign: 'center',
  textTransform: 'uppercase',
};

const sSubStyle = {
  color: '#666',
  fontSize: 16,
  maxWidth: 520,
  margin: '0 auto',
  textAlign: 'center',
  lineHeight: 1.75,
};

const Welcome = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [formState, setFormState] = useState('idle');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Заповніть ім'я та телефон");
      return;
    }
    setFormError('');
    setFormState('loading');
    try {
      const res = await fetch(`${API_URL}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setFormState('success');
        setForm({ name: '', phone: '', message: '' });
      } else {
        setFormState('error');
        setFormError('Помилка надсилання. Спробуйте зателефонувати.');
      }
    } catch {
      setFormState('error');
      setFormError("Помилка з'єднання. Спробуйте зателефонувати.");
    }
  };

  const NAV = [['why', 'Про нас'], ['services', 'Послуги'], ['gallery', 'Галерея'], ['faq', 'FAQ'], ['contacts', 'Контакти']];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: '#fff', background: D0, overflowX: 'hidden' }}>

      {/* ══ HEADER ══ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(8,8,8,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,197,24,0.18)' : '1px solid transparent',
        transition: 'all 0.35s',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={scrollToTop}>
            <TruckIcon width={56} />
            <div>
              <div style={{ color: Y, fontWeight: 900, fontSize: 17, letterSpacing: 2, lineHeight: 1.1, textTransform: 'uppercase' }}>Італ Трак</div>
              <div style={{ color: '#444', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' }}>Сервісний центр Iveco</div>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: 28 }} className="desktop-nav">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', borderBottom: '2px solid transparent',
                color: '#666', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                letterSpacing: 0.8, padding: '4px 0', textTransform: 'uppercase', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.target.style.color = Y; e.target.style.borderBottomColor = Y; }}
                onMouseLeave={e => { e.target.style.color = '#666'; e.target.style.borderBottomColor = 'transparent'; }}
              >
                {label}
              </button>
            ))}
          </nav>

          <a href={`tel:${PHONES[0].number}`} style={{ color: Y, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }} className="desktop-nav">
            <PhoneOutlined />{formatPhone(PHONES[0].number)}
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: Y, fontSize: 22, cursor: 'pointer', padding: 4 }} className="mobile-burger">
            {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: '#050505', borderTop: '1px solid rgba(245,197,24,0.18)', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column' }}>
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#bbb', cursor: 'pointer', fontSize: 16, fontWeight: 600, textAlign: 'left', padding: '14px 0', textTransform: 'uppercase', letterSpacing: 1 }}>
                {label}
              </button>
            ))}
            <a href={`tel:${PHONES[0].number}`} style={{ color: Y, fontWeight: 700, fontSize: 16, textDecoration: 'none', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PhoneOutlined />{formatPhone(PHONES[0].number)}
            </a>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section style={{ minHeight: '100vh', background: D0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '110px 24px 70px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(245,197,24,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.05) 1px, transparent 1px)`, backgroundSize: '72px 72px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(245,197,24,0.07) 0%, transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${Y}, transparent)`, opacity: 0.4 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid rgba(245,197,24,0.3)`, padding: '6px 18px', marginBottom: 36, background: 'rgba(245,197,24,0.05)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ color: '#777', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 600 }}>Авторизований сервіс Iveco</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 5.2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.0, marginBottom: 8, letterSpacing: '-2px', textTransform: 'uppercase' }}>
            Сервісний центр
          </h1>
          <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 5.2rem)', fontWeight: 900, color: Y, lineHeight: 1.0, marginBottom: 28, letterSpacing: '-2px', textTransform: 'uppercase' }}>
            вантажних авто
          </h1>

          <p style={{ color: '#666', fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)', margin: '0 auto 52px', maxWidth: 520, lineHeight: 1.75 }}>
            Спеціалізуємося на обслуговуванні та ремонті вантажівок Iveco. Досвідчені майстри, оригінальні запчастини, гарантія якості.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 64 }}>
            {PHONES.map(({ number, operator }) => (
              <a key={number} href={`tel:${number}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,197,24,0.06)', border: `1px solid rgba(245,197,24,0.22)`, padding: '13px 22px', textDecoration: 'none', color: '#fff', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.14)'; e.currentTarget.style.borderColor = Y; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.22)'; }}
              >
                <PhoneOutlined style={{ color: Y, fontSize: 16 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{formatPhone(number)}</div>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{operator}</div>
                </div>
              </a>
            ))}
          </div>

          <div style={{ display: 'inline-flex', border: `1px solid rgba(245,197,24,0.18)`, overflow: 'hidden' }}>
            {[['10+', 'Років досвіду'], ['500+', 'Авто щороку'], ['3', 'Телефони підтримки']].map(([num, label], i) => (
              <div key={label} style={{ textAlign: 'center', padding: '18px 36px', borderRight: i < 2 ? '1px solid rgba(245,197,24,0.18)' : 'none', background: 'rgba(245,197,24,0.03)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: Y, lineHeight: 1, letterSpacing: '-1px' }}>{num}</div>
                <div style={{ color: '#444', fontSize: 10, marginTop: 7, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ width: 20, height: 36, border: `2px solid rgba(245,197,24,0.22)`, borderRadius: 10, display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
            <div style={{ width: 3, height: 6, background: Y, borderRadius: 2, animation: 'scrollDot 2s infinite' }} />
          </div>
        </div>
      </section>

      {/* ══ ЧОМУ МИ ══ */}
      <section id="why" style={{ padding: '96px 24px', background: D1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel text="Наші переваги" />
          <h2 style={sTitleStyle}>Чому обирають нас</h2>
          <p style={sSubStyle}>Ми розуміємо, що вантажівка — це ваш бізнес. Тому робимо все, щоб вона працювала надійно.</p>
          <Row gutter={[20, 20]} style={{ marginTop: 56 }}>
            {WHY_US.map((item, i) => (
              <Col key={i} xs={24} sm={12} lg={8}>
                <div style={{ display: 'flex', gap: 16, padding: '24px', background: D2, border: `1px solid rgba(245,197,24,0.1)`, height: '100%', transition: 'border-color 0.25s, box-shadow 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.45)'; e.currentTarget.style.boxShadow = `0 0 28px rgba(245,197,24,0.07)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 42, height: 42, background: 'rgba(245,197,24,0.1)', border: `1px solid rgba(245,197,24,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: Y, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{item.title}</div>
                    <div style={{ color: '#555', fontSize: 14, lineHeight: 1.65 }}>{item.desc}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══ ПОСЛУГИ ══ */}
      <section id="services" style={{ padding: '96px 24px', background: D0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel text="Що ми робимо" />
          <h2 style={sTitleStyle}>Наші послуги</h2>
          <p style={sSubStyle}>Повний спектр технічного обслуговування та ремонту вантажної техніки Iveco</p>
          <Row gutter={[20, 20]} style={{ marginTop: 56 }}>
            {SERVICES.map((service, i) => (
              <Col key={i} xs={24} md={8}>
                <div style={{ background: D2, border: `1px solid rgba(245,197,24,0.1)`, padding: '36px 32px', height: '100%', position: 'relative', overflow: 'hidden', transition: 'border-color 0.25s, box-shadow 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)'; e.currentTarget.style.boxShadow = `0 0 40px rgba(245,197,24,0.08)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: Y }} />
                  <div style={{ width: 52, height: 52, background: Y, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: D0, marginBottom: 24 }}>
                    {service.icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 20, letterSpacing: '-0.3px', textTransform: 'uppercase' }}>{service.title}</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {service.items.map((item, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#666', fontSize: 14, lineHeight: 1.5 }}>
                        <span style={{ color: Y, marginTop: 1, flexShrink: 0, fontSize: 12 }}>▸</span>
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

      {/* ══ ГАЛЕРЕЯ ══ */}
      <section id="gallery" style={{ padding: '96px 24px', background: D1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel text="Наша робота" />
          <h2 style={sTitleStyle}>Галерея</h2>
          <p style={sSubStyle}>Фотографії нашого сервісу, команди та виконаних робіт</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 56 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ aspectRatio: '4/3', background: D2, border: `1px dashed rgba(245,197,24,0.18)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                <span style={{ fontSize: 34, marginBottom: 12, opacity: 0.35 }}>{['🚛', '🔧', '⚙️', '🛠️', '🚚', '🔩'][i]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Фото незабаром</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" style={{ padding: '96px 24px', background: D0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <SectionLabel text="Відповіді" />
          <h2 style={sTitleStyle}>Часті запитання</h2>
          <p style={{ ...sSubStyle, marginBottom: 48 }}>Не знайшли відповіді? Зателефонуйте — з радістю проконсультуємо.</p>
          <Collapse
            items={FAQ_ITEMS}
            accordion
            size="large"
            style={{ background: D2, border: `1px solid rgba(245,197,24,0.15)`, borderRadius: 0 }}
          />
        </div>
      </section>

      {/* ══ ФОРМА ЗВ'ЯЗКУ ══ */}
      <section id="callback" style={{ padding: '96px 24px', background: D1 }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <SectionLabel text="Зворотний зв'язок" />
          <h2 style={sTitleStyle}>Залишити заявку</h2>
          <p style={{ ...sSubStyle, marginBottom: 48 }}>Заповніть форму — ми передзвонимо або напишемо на Viber/Telegram найближчим часом.</p>

          {formState === 'success' ? (
            <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', padding: '48px 32px' }}>
              <div style={{ fontSize: 46, marginBottom: 16 }}>✅</div>
              <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Заявку отримано!</div>
              <div style={{ color: '#444', fontSize: 15 }}>Ми зв'яжемося з Вами найближчим часом.</div>
              <button onClick={() => setFormState('idle')} style={{ marginTop: 24, background: 'none', border: '1px solid rgba(245,197,24,0.25)', color: '#666', padding: '10px 24px', cursor: 'pointer', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Надіслати ще одну
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={{ background: D2, border: `1px solid rgba(245,197,24,0.15)`, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: "Ваше ім'я *", key: 'name', placeholder: 'Іван Петренко', type: 'text' },
                { label: 'Телефон *', key: 'phone', placeholder: '+380 __ ___ __ __', type: 'tel' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ color: '#444', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} type={type}
                    style={{ width: '100%', padding: '13px 14px', border: `1px solid rgba(245,197,24,0.2)`, background: D3, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ color: '#444', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Повідомлення</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Опишіть проблему або запитання..." rows={4}
                  style={{ width: '100%', padding: '13px 14px', border: `1px solid rgba(245,197,24,0.2)`, background: D3, color: '#fff', fontSize: 15, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              {formError && (
                <div style={{ color: '#f87171', fontSize: 13, background: 'rgba(239,68,68,0.08)', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {formError}
                </div>
              )}

              <button type="submit" disabled={formState === 'loading'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', border: 'none', background: formState === 'loading' ? '#9a7a00' : Y, color: D0, fontSize: 14, fontWeight: 800, cursor: formState === 'loading' ? 'not-allowed' : 'pointer', letterSpacing: 1.5, textTransform: 'uppercase', transition: 'background 0.2s' }}
                onMouseEnter={e => { if (formState !== 'loading') e.currentTarget.style.background = YD; }}
                onMouseLeave={e => { if (formState !== 'loading') e.currentTarget.style.background = Y; }}
              >
                {formState === 'loading' ? <><LoadingOutlined /> Надсилаємо...</> : <><SendOutlined /> Надіслати заявку</>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ══ КОНТАКТИ ══ */}
      <section id="contacts" style={{ padding: '96px 24px', background: D0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel text="Як нас знайти" />
          <h2 style={sTitleStyle}>Контакти</h2>
          <Row gutter={[48, 48]} align="middle" style={{ marginTop: 56 }}>
            <Col xs={24} lg={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {[
                  {
                    icon: <EnvironmentOutlined />, title: 'Адреса',
                    content: <span style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>Львівська обл., смт. Запитів,<br />вул. Київська, 185</span>,
                  },
                  {
                    icon: <PhoneOutlined />, title: 'Телефони',
                    content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {PHONES.map(({ number, operator }) => (
                          <a key={number} href={`tel:${number}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                            <span style={{ color: '#ccc', fontSize: 15, fontWeight: 500 }}>{formatPhone(number)}</span>
                            <span style={{ fontSize: 9, color: '#444', background: 'rgba(245,197,24,0.07)', padding: '2px 8px', border: `1px solid rgba(245,197,24,0.2)`, letterSpacing: 1, textTransform: 'uppercase' }}>{operator}</span>
                          </a>
                        ))}
                      </div>
                    ),
                  },
                  {
                    icon: <ClockCircleOutlined />, title: 'Години роботи',
                    content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['Пн – Пт', '08:00 – 18:00', false], ['Субота', '08:00 – 14:00', false], ['Неділя', 'Вихідний', true]].map(([day, hours, isOff]) => (
                          <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                            <span style={{ color: '#444', fontSize: 14 }}>{day}</span>
                            <span style={{ color: isOff ? '#ef4444' : '#ccc', fontSize: 14, fontWeight: 600 }}>{hours}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ].map(({ icon, title, content }) => (
                  <div key={title} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(245,197,24,0.09)', border: `1px solid rgba(245,197,24,0.22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: Y, fontSize: 18 }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ color: '#444', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 10 }}>{title}</div>
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </Col>
            <Col xs={24} lg={14}>
              <div style={{ overflow: 'hidden', border: `1px solid rgba(245,197,24,0.18)` }}>
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

      {/* ══ FOOTER ══ */}
      <footer style={{ background: '#040404', borderTop: `1px solid rgba(245,197,24,0.12)`, padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={scrollToTop}>
            <TruckIcon width={44} />
            <span style={{ color: '#333', fontWeight: 800, letterSpacing: 2, fontSize: 13, textTransform: 'uppercase' }}>Італ Трак</span>
          </div>
          <span style={{ color: '#2a2a2a', fontSize: 12 }}>© {new Date().getFullYear()} Всі права захищено</span>
          <a href={`tel:${PHONES[0].number}`} style={{ color: Y, textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PhoneOutlined />{formatPhone(PHONES[0].number)}
          </a>
        </div>
      </footer>

      {/* ══ SCROLL TO TOP ══ */}
      <button
        onClick={scrollToTop}
        aria-label="Повернутись наверх"
        style={{
          position: 'fixed', bottom: 32, right: 32, width: 46, height: 46,
          background: Y, border: 'none', color: D0, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 24px rgba(245,197,24,0.35)`,
          transition: 'all 0.25s', zIndex: 200,
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? 'auto' : 'none',
          transform: showTop ? 'translateY(0)' : 'translateY(12px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = YD; e.currentTarget.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = Y; e.currentTarget.style.transform = showTop ? 'translateY(0)' : 'translateY(12px)'; }}
      >
        <ArrowUpOutlined />
      </button>

      <style>{`
        @keyframes scrollDot {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(12px); }
        }
        input::placeholder, textarea::placeholder { color: #2e2e2e; }
        input:focus, textarea:focus { border-color: rgba(245,197,24,0.55) !important; }
        .ant-collapse { border-radius: 0 !important; }
        .ant-collapse-item { border-color: rgba(245,197,24,0.14) !important; }
        .ant-collapse-header { color: #bbb !important; background: #131313 !important; }
        .ant-collapse-header:hover { color: #f5c518 !important; }
        .ant-collapse-content { background: #0f0f0f !important; border-top-color: rgba(245,197,24,0.12) !important; }
        .ant-collapse-content-box { color: #666 !important; line-height: 1.75 !important; }
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
