import React, { useState, useEffect } from 'react';
import { Row, Col, Collapse } from 'antd';
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
  SafetyCertificateOutlined,
  StarOutlined,
  TeamOutlined,
  DollarOutlined,
  CarOutlined,
  SendOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.ital-truck.com.ua/api';

const PHONES = [
  { number: '+380955950777', operator: 'Vodafone' },
  { number: '+380675950777', operator: 'Kyivstar' },
  { number: '+380973950777', operator: 'Kyivstar' },
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
      'Повна діагностика автомобіля',
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
      'Заміна турбокомпресора',
    ],
  },
];

const WHY_US = [
  { icon: <StarOutlined />, title: '10+ років досвіду', desc: 'Спеціалізуємося виключно на вантажній техніці Iveco — знаємо кожну деталь' },
  { icon: <SafetyCertificateOutlined />, title: 'Оригінальні запчастини', desc: 'Використовуємо тільки оригінальні та сертифіковані аналоги від перевірених постачальників' },
  { icon: <ThunderboltOutlined />, title: 'Швидка діагностика', desc: 'Сучасне діагностичне обладнання дозволяє точно та швидко виявити несправність' },
  { icon: <DollarOutlined />, title: 'Прозоре ціноутворення', desc: 'Без прихованих витрат. Погоджуємо вартість до початку робіт' },
  { icon: <CarOutlined />, title: 'Зручне розташування', desc: 'смт. Запитів, Львівська обл. — зручний під\'їзд для великовагової техніки' },
];

const FAQ_ITEMS = [
  {
    key: '1',
    label: 'Як часто потрібно робити ТО для Iveco?',
    children: 'Виробник рекомендує ТО кожні 20 000/45000/75000 км відповідно до типу двигуна або 1 раз на рік — залежно від умов експлуатації. Для важких умов (пил, короткі поїздки, гори) інтервал може бути скорочений. Наші майстри нададуть індивідуальну рекомендацію після діагностики.',
  },
  {
    key: '2',
    label: 'Які моделі Iveco ви обслуговуєте?',
    children: 'Ми обслуговуємо весь модельний ряд: Iveco Daily, Eurocargo, Stralis, Trakker, S-Way та інші. Маємо досвід роботи з усіма поколіннями та двигунами від Euro 3 до Euro 6.',
  },
  {
    key: '3',
    label: 'Як дізнатися вартість ремонту?',
    children: 'Зателефонуйте або залиште заявку на сайті — ми безкоштовно проконсультуємо та надамо орієнтовну вартість. Точна вартість визначається після діагностики.',
  },
  {
    key: '4',
    label: 'Чи можна записатися заздалегідь?',
    children: 'Так, і ми це рекомендуємо. Запишіться по телефону або через форму на сайті — це дозволить нам підготуватися та заощадить ваш час.',
  },
];

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

const Welcome = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [formState, setFormState] = useState('idle'); // idle | loading | success | error
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

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
      setFormError('Помилка з\'єднання. Спробуйте зателефонувати.');
    }
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: '#1a1a1a', overflowX: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10, 20, 40, 0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🚛</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>Італ Трак</span>
          </div>

          <nav style={{ display: 'flex', gap: 32 }} className="desktop-nav">
            {[['why', 'Про нас'], ['services', 'Послуги'], ['gallery', 'Галерея'], ['faq', 'FAQ'], ['contacts', 'Контакти']].map(([id, label]) => (
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

          <a href={`tel:${PHONES[0].number}`} style={{ color: '#3b82f6', fontWeight: 600, fontSize: 15, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }} className="desktop-nav">
            <PhoneOutlined />
            {formatPhone(PHONES[0].number)}
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4 }} className="mobile-burger">
            {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: 'rgba(10,20,40,0.98)', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[['why', 'Про нас'], ['services', 'Послуги'], ['gallery', 'Галерея'], ['faq', 'FAQ'], ['contacts', 'Контакти']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 17, fontWeight: 500, textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{label}</button>
            ))}
            <a href={`tel:${PHONES[0].number}`} style={{ color: '#3b82f6', fontWeight: 600, fontSize: 16, textDecoration: 'none', paddingTop: 4 }}>
              <PhoneOutlined style={{ marginRight: 8 }} />{formatPhone(PHONES[0].number)}
            </a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1428 0%, #0f2547 50%, #0a1428 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '100px 24px 60px',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ color: '#94a3b8', fontSize: 14 }}>Авторизований сервіс Iveco</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' }}>
            Сервісний центр{' '}
            <span style={{ background: 'linear-gradient(90deg, #3b82f6, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              вантажних авто
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', margin: '0 auto 48px', maxWidth: 560, lineHeight: 1.6 }}>
            Спеціалізуємося на обслуговуванні та ремонті вантажівок Iveco. Досвідчені майстри, оригінальні запчастини, гарантія якості.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
            {PHONES.map(({ number, operator }) => (
              <a key={number} href={`tel:${number}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 24px', textDecoration: 'none', color: '#fff', transition: 'all 0.2s' }}
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

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'center' }}>
            {[['10+', 'Років досвіду'], ['500+', 'Авто щороку'], ['3', 'Телефони підтримки']].map(([num, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{num}</div>
                <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ width: 24, height: 40, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <div style={{ width: 4, height: 8, background: '#3b82f6', borderRadius: 2, animation: 'scrollDot 2s infinite' }} />
          </div>
        </div>
      </section>

      {/* ── ЧОМУ МИ ── */}
      <section id="why" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Наші переваги</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>Чому обирають нас</h2>
            <p style={{ color: '#64748b', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>Ми розуміємо, що вантажівка — це ваш бізнес. Тому робимо все, щоб вона працювала надійно.</p>
          </div>
          <Row gutter={[32, 32]}>
            {WHY_US.map((item, i) => (
              <Col key={i} xs={24} sm={12} lg={8}>
                <div style={{ display: 'flex', gap: 16, padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0', height: '100%', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#3b82f6', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 }}>{item.title}</div>
                    <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── ПОСЛУГИ ── */}
      <section id="services" style={{ padding: '96px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Що ми робимо</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>Наші послуги</h2>
            <p style={{ color: '#64748b', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>Повний спектр технічного обслуговування та ремонту вантажної техніки Iveco</p>
          </div>
          <Row gutter={[32, 32]}>
            {SERVICES.map((service, i) => (
              <Col key={i} xs={24} md={8}>
                <div style={{ background: '#fff', borderRadius: 20, padding: 36, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(59,130,246,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', marginBottom: 24, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                    {service.icon}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>{service.title}</h3>
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

      {/* ── ГАЛЕРЕЯ ── */}
      <section id="gallery" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Наша робота</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>Галерея</h2>
            <p style={{ color: '#64748b', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>Фотографії нашого сервісу, команди та виконаних робіт</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ aspectRatio: '4/3', borderRadius: 16, background: `linear-gradient(135deg, ${['#e0e7ff,#dbeafe', '#dcfce7,#d1fae5', '#fef3c7,#fde68a', '#fce7f3,#fbcfe8', '#f3e8ff,#ede9fe', '#e0f2fe,#bae6fd'][i]})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                <span style={{ fontSize: 40, marginBottom: 12 }}>{['🚛', '🔧', '⚙️', '🛠️', '🚚', '🔩'][i]}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Фото незабаром</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '96px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Відповіді</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.5px' }}>Часті запитання</h2>
            <p style={{ color: '#64748b', fontSize: 17 }}>Не знайшли відповіді? Зателефонуйте — з радістю проконсультуємо.</p>
          </div>
          <Collapse
            items={FAQ_ITEMS}
            accordion
            size="large"
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}
          />
        </div>
      </section>

      {/* ── ФОРМА ЗВ'ЯЗКУ ── */}
      <section id="callback" style={{ padding: '96px 24px', background: 'linear-gradient(135deg, #0a1428 0%, #0f2547 100%)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Зворотний зв'язок</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px' }}>Залишити заявку</h2>
            <p style={{ color: '#94a3b8', fontSize: 16 }}>Заповніть форму — ми передзвонимо або напишемо на Viber/Telegram найближчим часом.</p>
          </div>

          {formState === 'success' ? (
            <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '48px 32px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ color: '#4ade80', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Заявку отримано!</div>
              <div style={{ color: '#86efac', fontSize: 16 }}>Ми зв'яжемося з Вами найближчим часом.</div>
              <button onClick={() => setFormState('idle')} style={{ marginTop: 24, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}>
                Надіслати ще одну
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Ваше ім'я *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Іван Петренко"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Телефон *</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+380 __ ___ __ __"
                  type="tel"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Повідомлення (необов'язково)</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Опишіть проблему або запитання..."
                  rows={4}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 16, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {formError && (
                <div style={{ color: '#f87171', fontSize: 14, background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'loading'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderRadius: 12, border: 'none', background: formState === 'loading' ? '#1e40af' : '#3b82f6', color: '#fff', fontSize: 16, fontWeight: 600, cursor: formState === 'loading' ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => { if (formState !== 'loading') e.currentTarget.style.background = '#2563eb'; }}
                onMouseLeave={e => { if (formState !== 'loading') e.currentTarget.style.background = '#3b82f6'; }}
              >
                {formState === 'loading' ? <><LoadingOutlined /> Надсилаємо...</> : <><SendOutlined /> Надіслати заявку</>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── КОНТАКТИ ── */}
      <section id="contacts" style={{ padding: '96px 24px', background: '#0a1428' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Як нас знайти</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px' }}>Контакти</h2>
          </div>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {[
                  { icon: <EnvironmentOutlined />, title: 'Адреса', content: <span style={{ color: '#e2e8f0', fontSize: 16, lineHeight: 1.5 }}>Львівська обл., смт. Запитів,<br />вул. Київська, 185</span> },
                  {
                    icon: <PhoneOutlined />, title: 'Телефони', content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {PHONES.map(({ number, operator }) => (
                          <a key={number} href={`tel:${number}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                            <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 500 }}>{formatPhone(number)}</span>
                            <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.08)' }}>{operator}</span>
                          </a>
                        ))}
                      </div>
                    )
                  },
                  {
                    icon: <ClockCircleOutlined />, title: 'Години роботи', content: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[['Пн – Пт', '08:00 – 18:00', false], ['Субота', '08:00 – 14:00', false], ['Неділя', 'Вихідний', true]].map(([day, hours, isOff]) => (
                          <div key={day} style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                            <span style={{ color: '#94a3b8', fontSize: 15 }}>{day}</span>
                            <span style={{ color: isOff ? '#ef4444' : '#e2e8f0', fontSize: 15, fontWeight: 500 }}>{hours}</span>
                          </div>
                        ))}
                      </div>
                    )
                  },
                ].map(({ icon, title, content }) => (
                  <div key={title} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#3b82f6', fontSize: 20 }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{title}</div>
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </Col>
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
      <footer style={{ background: '#06101f', padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🚛</span>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Італ Трак</span>
          </div>
          <span style={{ color: '#475569', fontSize: 14 }}>© {new Date().getFullYear()} Всі права захищено</span>
          <a href={`tel:${PHONES[0].number}`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            <PhoneOutlined style={{ marginRight: 6 }} />{formatPhone(PHONES[0].number)}
          </a>
        </div>
      </footer>

      <style>{`
        @keyframes scrollDot {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(12px); }
        }
        input::placeholder, textarea::placeholder { color: #475569; }
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
