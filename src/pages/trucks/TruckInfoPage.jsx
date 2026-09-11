import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import logoImg from '../../assets/logo.jpg';

const PHONES = [
  { number: '+380955950777', label: 'Vodafone' },
  { number: '+380973950777', label: 'Kyivstar' },
];

function formatPhone(phone) {
  const d = phone.replace('+', '');
  return `+${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

function TruckInfoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    navigate(`/trucks/${id}`, { replace: true });
    return null;
  }

  return (
    <div className="truck-info-page">
      <div className="truck-info-card">
        <img src={logoImg} alt="Італ Трак" className="truck-info-logo" />
        <h2 className="truck-info-title">Даний автомобіль обслуговується на сервісі</h2>
        <h1 className="truck-info-service-name">Італ Трак</h1>
        <p className="truck-info-subtitle">Сервісний центр вантажних автомобілів Iveco</p>

        <div className="truck-info-contacts">
          <p className="truck-info-contacts-title">Наші контакти:</p>
          {PHONES.map((p) => (
            <a key={p.number} href={`tel:${p.number}`} className="truck-info-phone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{formatPhone(p.number)}</span>
              <span className="truck-info-phone-label">{p.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TruckInfoPage;
