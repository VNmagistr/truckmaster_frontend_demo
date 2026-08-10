import React, { useState } from 'react';
import logoImg from '../../assets/logo.jpg';

const PHONES = [
  { number: '+380955950777', label: 'Vodafone' },
  { number: '+380675950777', label: 'Kyivstar' },
  { number: '+380973950777', label: 'Kyivstar' },
];

const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/C2eMuaMpGbNA6yGC7';
const SITE_URL = 'https://ital-truck.com.ua';

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronIcon({ up }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.3s', transform: up ? 'rotate(180deg)' : 'rotate(0)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function handleShare(url, text) {
  if (navigator.share) {
    navigator.share({ title: 'Італ Трак', text, url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url);
  }
}

function MenuCard({ icon, label, href, shareText }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="qr-card-link">
      <div className="qr-card-icon">{icon}</div>
      <span className="qr-card-label">{label}</span>
      <button
        className="qr-card-share"
        onClick={e => { e.preventDefault(); e.stopPropagation(); handleShare(href, shareText || label); }}
        aria-label="Поділитись"
      >
        <ShareIcon />
      </button>
    </a>
  );
}

const QrCardPage = () => {
  const [contactsOpen, setContactsOpen] = useState(false);
  const [phonesOpen, setPhonesOpen] = useState(false);

  return (
    <div className="qr-page">
      <div className="qr-container">
        {/* Logo */}
        <div className="qr-logo-wrap">
          <img src={logoImg} alt="Італ Трак" className="qr-logo" />
        </div>

        <h1 className="qr-title">Італ Трак</h1>
        <p className="qr-subtitle">Сервісний центр Iveco</p>
        <p className="qr-desc">Продаж, сервіс, ремонт, запчастини</p>

        {/* Menu cards */}
        <div className="qr-cards">
          <MenuCard
            icon={<MapIcon />}
            label="Як нас знайти. Маршрут"
            href={GOOGLE_MAPS_URL}
            shareText="Італ Трак — маршрут"
          />
          <MenuCard
            icon={<GlobeIcon />}
            label="Сайт. Про компанію"
            href={SITE_URL}
            shareText="Італ Трак — сайт"
          />
          <a href={`tel:${PHONES[0].number}`} className="qr-card-link" onClick={e => {
            if (PHONES.length > 1) { e.preventDefault(); setPhonesOpen(v => !v); }
          }}>
            <div className="qr-card-icon"><PhoneIcon /></div>
            <span className="qr-card-label">Зателефонувати</span>
            <div className="qr-card-share">
              <ChevronIcon up={phonesOpen} />
            </div>
          </a>
          {phonesOpen && (
            <div className="qr-phones-list">
              {PHONES.map(({ number, label }) => (
                <a key={number} href={`tel:${number}`} className="qr-phone-item">
                  <PhoneIcon />
                  <span>{formatPhone(number)}</span>
                  <span className="qr-phone-operator">{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="qr-contacts-section">
          <button className="qr-contacts-toggle" onClick={() => setContactsOpen(v => !v)}>
            <span>Контактні дані</span>
            <ChevronIcon up={contactsOpen} />
          </button>
          {contactsOpen && (
            <div className="qr-contacts-body">
              <div className="qr-contacts-name">Італ Трак</div>
              <div className="qr-contacts-schedule">Львівська обл., смт. Запитів, вул. Київська, 185</div>
              <div className="qr-contacts-row">
                <ClockIcon />
                <span>Пн – Пт: 09:30 – 18:00</span>
              </div>
              <div className="qr-contacts-row qr-contacts-weekend">
                <ClockIcon />
                <span>Сб – Нд: Вихідний</span>
              </div>
              <div className="qr-contacts-phones-label">Телефони:</div>
              {PHONES.map(({ number, label }) => (
                <a key={number} href={`tel:${number}`} className="qr-contacts-phone">
                  <PhoneIcon />
                  <span>{formatPhone(number)}</span>
                  <span className="qr-phone-operator">{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="qr-footer">
        &copy; {new Date().getFullYear()} Італ Трак
      </div>
    </div>
  );
};

export default QrCardPage;
