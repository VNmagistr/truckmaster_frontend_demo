import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Collapse } from 'antd';
import SeoHead from '../../components/SeoHead';
import logoImg from '../../assets/logo.jpg';
import imgSway from '../../assets/trucks/sway.jpg';
import imgXway from '../../assets/trucks/xway.jpeg';
import imgEdaily from '../../assets/trucks/edaily.png';
import imgDaily4x4 from '../../assets/trucks/daily4x4.png';
import imgSwayElectric from '../../assets/trucks/sway-electric.png';
import {
  ToolOutlined, ThunderboltOutlined, SettingOutlined, PhoneOutlined,
  EnvironmentOutlined, ClockCircleOutlined, MenuOutlined, CloseOutlined,
  SafetyCertificateOutlined, StarOutlined, DollarOutlined, CarOutlined,
  SendOutlined, LoadingOutlined, ArrowUpOutlined, CheckOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.ital-truck.com.ua/api';

/* ── Design tokens ── */
const Y    = '#f5c518';   // yellow accent
const YD   = '#d4a800';   // yellow dark (hover)
const YL   = '#fffbea';   // yellow light (bg tint)
const INK  = '#1a1a1a';   // primary text
const INK2 = '#555555';   // secondary text
const INK3 = '#999999';   // tertiary text
const BG   = '#ffffff';   // main background
const BG2  = '#f7f7f7';   // section background

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
    items: ['Повна діагностика автомобіля', 'Читання та скидання помилок', 'Перевірка всіх вузлів та агрегатів', 'Діагностика гідравліки та пневматики'],
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
  { key: '2', label: 'Які моделі Iveco ви обслуговуєте?', children: 'Ми обслуговуємо весь модельний ряд: Iveco Daily, Eurocargo, Stralis, Trakker та інші. Маємо досвід роботи з усіма поколіннями та двигунами від Euro 3 до Euro 6.' },
  { key: '3', label: 'Як дізнатися вартість ремонту?', children: 'Зателефонуйте або залиште заявку на сайті — ми безкоштовно проконсультуємо та надамо орієнтовну вартість. Точна вартість визначається після діагностики.' },
  { key: '4', label: 'Чи можна записатися заздалегідь?', children: 'Так, і ми це рекомендуємо. Запишіться по телефону або через форму на сайті — це дозволить нам підготуватися та заощадить ваш час.' },
];

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

/* ── Logo mark ── */
function LogoMark({ size = 48 }) {
  return (
    <img src={logoImg} alt="Італ Трак" style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  );
}

/* ── Shared ── */
function Tag({ children }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ display: 'block', width: 32, height: 3, background: Y, borderRadius: 2 }} />
      <span style={{ color: Y, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>{children}</span>
    </div>
  );
}

function PrimaryBtn({ children, onClick, type = 'button', disabled, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '14px 32px', background: hov && !disabled ? YD : Y,
        border: 'none', color: INK, fontWeight: 700, fontSize: 15,
        cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: 0.3,
        transition: 'background 0.2s', borderRadius: 0,
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

/* ── Google Reviews ── */
function StarRating({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? Y : '#e0e0e0', fontSize: 16, lineHeight: 1 }}>★</span>
      ))}
    </span>
  );
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const text = review.text || '';
  const long = text.length > 200;
  const shown = expanded || !long ? text : text.slice(0, 200) + '…';

  return (
    <div style={{
      background: BG, padding: '24px 22px', flexShrink: 0,
      width: 300, border: '1px solid #ebebeb',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'all 0.25s', scrollSnapAlign: 'start',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.09)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {review.profile_photo_url ? (
          <img src={review.profile_photo_url} alt={review.author_name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: Y, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: INK, flexShrink: 0 }}>
            {review.author_name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: INK }}>{review.author_name}</div>
          <div style={{ fontSize: 11, color: INK3 }}>{review.relative_time_description}</div>
        </div>
      </div>
      <StarRating rating={review.rating} />
      <p style={{ fontSize: 14, color: INK2, lineHeight: 1.65, margin: 0 }}>{shown}</p>
      {long && (
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: Y, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          {expanded ? 'Згорнути' : 'Читати далі'}
        </button>
      )}
    </div>
  );
}

function ReviewsSection({ apiUrl }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/places-reviews/`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.rating) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <section style={{ padding: '96px 32px', background: BG2, overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, gap: 24 }}>
          <div>
            <Tag>Відгуки клієнтів</Tag>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.5px' }}>
              Що кажуть наші клієнти
            </h2>
          </div>
          {/* Rating summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 900, color: INK, lineHeight: 1 }}>{data.rating}</div>
              <StarRating rating={data.rating} />
              <div style={{ fontSize: 12, color: INK3, marginTop: 4 }}>{data.user_ratings_total} відгуків</div>
            </div>
            <a
              href={data.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', background: BG, border: `2px solid ${Y}`,
                color: INK, textDecoration: 'none', fontWeight: 700, fontSize: 14,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = Y; }}
              onMouseLeave={e => { e.currentTarget.style.background = BG; }}
            >
              {/* Google G icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google відгуки
            </a>
          </div>
        </div>

        {/* Horizontal scroll on mobile, wrap on desktop */}
        <div style={{
          display: 'flex', gap: 16,
          overflowX: 'auto', paddingBottom: 8,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
        }}>
          {data.reviews.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════ */
const Welcome = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [formState, setFormState] = useState('idle');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
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
    if (!form.name.trim() || !form.phone.trim()) { setFormError("Заповніть ім'я та телефон"); return; }
    setFormError('');
    setFormState('loading');
    try {
      const res = await fetch(`${API_URL}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setFormState('success'); setForm({ name: '', phone: '', message: '' }); }
      else { setFormState('error'); setFormError('Помилка надсилання. Спробуйте зателефонувати.'); }
    } catch { setFormState('error'); setFormError("Помилка з'єднання. Спробуйте зателефонувати."); }
  };

  const NAV = [['why', 'Про нас'], ['services', 'Послуги'], ['gallery', 'Галерея'], ['faq', 'FAQ'], ['contacts', 'Контакти']];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: INK, background: BG, overflowX: 'hidden' }}>
      <SeoHead />

      {/* ══ HEADER ══ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.0)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
        borderBottom: scrolled ? '2px solid ' + Y : '2px solid transparent',
        transition: 'all 0.3s',
        padding: '0 32px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={scrollToTop}>
            <LogoMark size={76} />
            <div>
              <div style={{ color: scrolled ? INK : '#fff', fontWeight: 900, fontSize: 28, letterSpacing: 1, lineHeight: 1.1 }}>Італ Трак</div>
              <div style={{ color: scrolled ? INK3 : '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>Сервісний центр Iveco</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="desktop-nav">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', borderBottom: '2px solid transparent',
                color: scrolled ? INK2 : BG, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                padding: '4px 0', transition: 'all 0.2s', letterSpacing: 0.3,
              }}
                onMouseEnter={e => { e.target.style.color = Y; e.target.style.borderBottomColor = Y; }}
                onMouseLeave={e => { e.target.style.color = scrolled ? INK2 : BG; e.target.style.borderBottomColor = 'transparent'; }}
              >{label}</button>
            ))}
          </nav>

          {/* Cabinet link */}
          <button onClick={() => navigate('/cabinet')} className="desktop-nav"
            style={{ background: 'none', border: `1px solid rgba(255,255,255,0.3)`, color: scrolled ? INK2 : BG, fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.color = Y; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = scrolled ? INK2 : BG; }}
          >
            Кабінет
          </button>

          {/* Phone CTA */}
          <a href={`tel:${PHONES[0].number}`} className="desktop-nav"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: Y, color: INK, fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '10px 20px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = YD}
            onMouseLeave={e => e.currentTarget.style.background = Y}
          >
            <PhoneOutlined />{formatPhone(PHONES[0].number)}
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-burger"
            style={{ display: 'none', background: 'none', border: 'none', color: scrolled ? INK : BG, fontSize: 22, cursor: 'pointer', padding: 4 }}>
            {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: BG, borderTop: `3px solid ${Y}`, padding: '16px 32px 28px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: 'block', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', color: INK2, cursor: 'pointer', fontSize: 16, fontWeight: 600, textAlign: 'left', padding: '14px 0' }}>
                {label}
              </button>
            ))}
            <a href={`tel:${PHONES[0].number}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: INK, fontWeight: 700, fontSize: 16, textDecoration: 'none', background: Y, padding: '12px 20px' }}>
              <PhoneOutlined />{formatPhone(PHONES[0].number)}
            </a>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: '100vh',
        background: `linear-gradient(160deg, #1a1a1a 55%, #2d2d2d 100%)`,
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '120px 32px 80px',
      }}>
        {/* Yellow geometric accent — top-right corner block */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '48%', height: '100%', background: Y, clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0% 100%)', zIndex: 0 }} />
        {/* Truck photo */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '48%', height: '100%', clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0% 100%)', zIndex: 1, overflow: 'hidden' }}>
          <img src={imgSway} alt="Iveco S-Way" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ maxWidth: 620 }}>
            <Tag>Сервіс ремонту автомобілів Iveco</Tag>

            <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', fontWeight: 900, color: BG, lineHeight: 1.08, marginBottom: 24, letterSpacing: '-1px' }}>
              Сервісний центр<br />
              <span style={{ color: Y }}>вантажних авто</span>
            </h1>

            <p style={{ color: '#aaa', fontSize: 18, lineHeight: 1.7, marginBottom: 44, maxWidth: 500 }}>
              Спеціалізуємося на обслуговуванні та ремонті вантажівок Iveco. Досвідчені майстри, оригінальні запчастини, гарантія якості.
            </p>

            {/* CTA buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 56 }}>
              <PrimaryBtn onClick={() => scrollTo('callback')}>
                <SendOutlined /> Залишити заявку
              </PrimaryBtn>
              <a href={`tel:${PHONES[0].number}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', border: '2px solid rgba(255,255,255,0.25)',
                color: BG, fontWeight: 600, fontSize: 15, textDecoration: 'none',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.color = Y; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = BG; }}
              >
                <PhoneOutlined />{formatPhone(PHONES[0].number)}
              </a>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {[['10+', 'Років досвіду'], ['2000+', 'Авто щороку'], ['100%', 'Гарантія якості']].map(([num, label]) => (
                <div key={label}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: Y, lineHeight: 1 }}>{num}</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ color: '#555', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Гортай</div>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #555, transparent)', margin: '0 auto' }} />
        </div>
      </section>

      {/* ══ PHONE BAR ══ */}
      <section style={{ background: Y, padding: '0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
          {PHONES.map(({ number, operator }, i) => (
            <a key={number} href={`tel:${number}`} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '18px 36px', textDecoration: 'none', color: INK,
              borderRight: i < PHONES.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, fontSize: 15, transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <PhoneOutlined style={{ fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 700 }}>{formatPhone(number)}</div>
                <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 0.5 }}>{operator}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ══ ЧОМУ МИ ══ */}
      <section id="why" style={{ padding: '96px 32px', background: BG }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <Tag>Наші переваги</Tag>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.5px' }}>
                Чому обирають нас
              </h2>
            </div>
            <p style={{ color: INK2, fontSize: 16, maxWidth: 380, lineHeight: 1.7, margin: 0 }}>
              Ми розуміємо, що вантажівка — це ваш бізнес. Тому робимо все, щоб вона працювала надійно.
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {WHY_US.map((item, i) => (
              <Col key={i} xs={24} sm={12} lg={8}>
                <div style={{ padding: '32px 28px', background: BG, border: '1px solid #ebebeb', height: '100%', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Yellow left border accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: Y }} />
                  <div style={{ width: 48, height: 48, background: YL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: YD, marginBottom: 20 }}>
                    {item.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: INK, marginBottom: 10 }}>{item.title}</div>
                  <div style={{ color: INK2, fontSize: 14, lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══ ПОСЛУГИ ══ */}
      <section id="services" style={{ padding: '96px 32px', background: BG2 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag>Що ми робимо</Tag>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, letterSpacing: '-0.5px' }}>Наші послуги</h2>
            <p style={{ color: INK2, fontSize: 16, maxWidth: 480, margin: '16px auto 0', lineHeight: 1.7 }}>Повний спектр технічного обслуговування та ремонту вантажної техніки Iveco</p>
          </div>

          <Row gutter={[24, 24]}>
            {SERVICES.map((service, i) => (
              <Col key={i} xs={24} md={8}>
                <div style={{ background: BG, height: '100%', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Yellow header strip */}
                  <div style={{ background: Y, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: INK }}>
                      {service.icon}
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, margin: 0, lineHeight: 1.2 }}>{service.title}</h3>
                  </div>
                  {/* Items */}
                  <div style={{ padding: '28px 32px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {service.items.map((item, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: INK2, fontSize: 15, lineHeight: 1.45 }}>
                          <CheckOutlined style={{ color: Y, fontSize: 13, marginTop: 3, flexShrink: 0, background: YL, padding: 4 }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══ ГАЛЕРЕЯ ══ */}
      <section id="gallery" style={{ padding: '96px 32px', background: BG }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag>Наша робота</Tag>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, letterSpacing: '-0.5px' }}>Галерея</h2>
            <p style={{ color: INK2, fontSize: 16, maxWidth: 480, margin: '16px auto 0', lineHeight: 1.7 }}>Фотографії нашого сервісу, команди та виконаних робіт</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { src: imgSway, alt: 'Iveco S-Way', label: 'Iveco S-Way' },
              { src: imgXway, alt: 'Iveco X-Way', label: 'Iveco X-Way' },
              { src: imgSwayElectric, alt: 'Iveco S-Way Electric', label: 'Iveco S-Way Electric' },
              { src: imgDaily4x4, alt: 'Iveco Daily 4×4', label: 'Iveco Daily 4×4' },
              { src: imgEdaily, alt: 'Iveco eDaily', label: 'Iveco eDaily' },
            ].map(({ src, alt, label }) => (
              <div key={alt} style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: BG2 }}>
                <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)', padding: '20px 16px 12px' }}>
                  <span style={{ color: BG, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ВІДГУКИ ══ */}
      <ReviewsSection apiUrl={API_URL} />

      {/* ══ FAQ ══ */}
      <section id="faq" style={{ padding: '96px 32px', background: BG2 }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag>Відповіді</Tag>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, letterSpacing: '-0.5px' }}>Часті запитання</h2>
            <p style={{ color: INK2, fontSize: 16, marginTop: 16, lineHeight: 1.7 }}>Не знайшли відповіді? Зателефонуйте — з радістю проконсультуємо.</p>
          </div>
          <Collapse
            items={FAQ_ITEMS}
            accordion
            size="large"
            style={{ background: BG, border: '1px solid #e8e8e8', borderRadius: 0 }}
          />
        </div>
      </section>

      {/* ══ ФОРМА + CTA ══ */}
      <section id="callback" style={{ padding: '0', background: BG }}>
        {/* Top CTA banner */}
        <div style={{ background: Y, padding: '52px 32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: INK, marginBottom: 8, letterSpacing: '-0.5px' }}>
            Готові допомогти вашій вантажівці?
          </h2>
          <p style={{ color: 'rgba(0,0,0,0.55)', fontSize: 16, marginBottom: 28 }}>
            Зателефонуйте або залиште заявку — відповімо найближчим часом
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {PHONES.map(({ number, operator }) => (
              <a key={number} href={`tel:${number}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: INK, color: BG, padding: '12px 24px', textDecoration: 'none', fontWeight: 600, fontSize: 15, transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                onMouseLeave={e => e.currentTarget.style.background = INK}
              >
                <PhoneOutlined />{formatPhone(number)}
              </a>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '80px 32px', background: INK }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <Tag>Зворотний зв'язок</Tag>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: BG, marginBottom: 12, letterSpacing: '-0.5px' }}>Залишити заявку</h2>
            <p style={{ color: '#888', fontSize: 15, marginBottom: 40, lineHeight: 1.7 }}>Заповніть форму — ми передзвонимо або напишемо на Viber/Telegram найближчим часом.</p>

            {formState === 'success' ? (
              <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: '48px 32px' }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
                <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Заявку отримано!</div>
                <div style={{ color: '#666', fontSize: 15 }}>Ми зв'яжемося з Вами найближчим часом.</div>
                <button onClick={() => setFormState('idle')} style={{ marginTop: 24, background: 'none', border: `1px solid ${Y}`, color: Y, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                  Надіслати ще одну
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: "Ваше ім'я *", key: 'name', placeholder: 'Іван Петренко', type: 'text' },
                  { label: 'Телефон *', key: 'phone', placeholder: '+380 __ ___ __ __', type: 'tel' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ color: '#888', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</label>
                    <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} type={type}
                      style={{ width: '100%', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: BG, fontSize: 15, outline: 'none', boxSizing: 'border-box', borderRadius: 0 }} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#888', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>Повідомлення</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Опишіть проблему або запитання..." rows={4}
                    style={{ width: '100%', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: BG, fontSize: 15, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', borderRadius: 0 }} />
                </div>

                {formError && (
                  <div style={{ color: '#f87171', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {formError}
                  </div>
                )}

                <PrimaryBtn type="submit" disabled={formState === 'loading'}>
                  {formState === 'loading' ? <><LoadingOutlined /> Надсилаємо...</> : <><SendOutlined /> Надіслати заявку</>}
                </PrimaryBtn>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ══ КОНТАКТИ ══ */}
      <section id="contacts" style={{ padding: '96px 32px', background: BG }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Tag>Як нас знайти</Tag>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 900, color: INK, letterSpacing: '-0.5px' }}>Контакти</h2>
          </div>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                {[
                  {
                    icon: <EnvironmentOutlined />, title: 'Адреса',
                    content: <span style={{ color: INK, fontSize: 16, lineHeight: 1.7 }}>Львівська обл., смт. Запитів,<br />вул. Київська, 185</span>,
                  },
                  {
                    icon: <PhoneOutlined />, title: 'Телефони',
                    content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {PHONES.map(({ number, operator }) => (
                          <a key={number} href={`tel:${number}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                            <span style={{ color: INK, fontSize: 16, fontWeight: 600 }}>{formatPhone(number)}</span>
                            <span style={{ fontSize: 10, color: INK3, background: BG2, padding: '2px 8px', border: '1px solid #e0e0e0', letterSpacing: 0.5, textTransform: 'uppercase' }}>{operator}</span>
                          </a>
                        ))}
                      </div>
                    ),
                  },
                  {
                    icon: <ClockCircleOutlined />, title: 'Години роботи',
                    content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['Пн – Пт', '08:00 – 18:00', false], ['Субота – Неділя', 'Вихідний', true]].map(([day, hours, isOff]) => (
                          <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: 40, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ color: INK2, fontSize: 15 }}>{day}</span>
                            <span style={{ color: isOff ? '#ef4444' : INK, fontSize: 15, fontWeight: 600 }}>{hours}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ].map(({ icon, title, content }) => (
                  <div key={title} style={{ display: 'flex', gap: 20 }}>
                    <div style={{ width: 48, height: 48, background: Y, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: INK, fontSize: 20 }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ color: INK3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>{title}</div>
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </Col>
            <Col xs={24} lg={14}>
              <div style={{ overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.1)', border: `3px solid ${Y}` }}>
                <iframe
                  title="Карта"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d381.8849867079073!2d24.22635464372931!3d49.91746731963937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x473ac54acf95915b%3A0xdc293f6a56dd6cd5!2z0IbRgtCw0Lst0KLRgNCw0Lo!5e0!3m2!1suk!2sua!4v1772792246178!5m2!1suk!2sua"
                  width="100%"
                  height="400"
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
      <footer style={{ background: '#111', borderTop: `4px solid ${Y}`, padding: '40px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={scrollToTop}>
              <LogoMark size={44} />
              <div>
                <div style={{ color: BG, fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>Італ Трак</div>
                <div style={{ color: '#555', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase' }}>Сервісний центр Iveco</div>
              </div>
            </div>
            <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {NAV.map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = Y}
                  onMouseLeave={e => e.target.style.color = '#666'}
                >{label}</button>
              ))}
            </nav>
            <a href={`tel:${PHONES[0].number}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: Y, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              <PhoneOutlined />{formatPhone(PHONES[0].number)}
            </a>
          </div>
          <div style={{ borderTop: '1px solid #222', paddingTop: 24, textAlign: 'center' }}>
            <span style={{ color: '#444', fontSize: 13 }}>© {new Date().getFullYear()} Італ Трак — Сервісний центр вантажних авто Iveco. Всі права захищено.</span>
          </div>
        </div>
      </footer>

      {/* ══ SCROLL TO TOP ══ */}
      <button
        onClick={scrollToTop}
        aria-label="Повернутись наверх"
        style={{
          position: 'fixed', bottom: 32, right: 32, width: 48, height: 48,
          background: Y, border: 'none', color: INK, fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'all 0.25s', zIndex: 200,
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? 'auto' : 'none',
          transform: showTop ? 'translateY(0)' : 'translateY(10px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = YD; e.currentTarget.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = Y; e.currentTarget.style.transform = showTop ? 'translateY(0)' : 'translateY(10px)'; }}
      >
        <ArrowUpOutlined />
      </button>

      <style>{`
        input::placeholder, textarea::placeholder { color: #444; }
        input:focus, textarea:focus { border-color: ${Y} !important; outline: none; }
        .ant-collapse { border-radius: 0 !important; }
        .ant-collapse-item { border-color: #e8e8e8 !important; }
        .ant-collapse-header { color: ${INK} !important; background: ${BG} !important; font-weight: 600 !important; }
        .ant-collapse-header:hover { color: ${YD} !important; }
        .ant-collapse-content { background: ${BG2} !important; border-top-color: #f0f0f0 !important; }
        .ant-collapse-content-box { color: ${INK2} !important; line-height: 1.75 !important; }
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
