import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CarOutlined, RightOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';

const Y = '#f5c518';
const INK = '#1a1a1a';

export default function CabinetTrucksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cabinetAPI.getTrucks()
      .then(r => setTrucks(Array.isArray(r.data) ? r.data : (r.data.results || [])))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>{t('common.loading')}</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, marginBottom: 20 }}>{t('cabinet.trucks.title')}</h1>

      {trucks.length === 0 ? (
        <div style={{ background: '#fff', padding: '48px 24px', textAlign: 'center', color: '#aaa' }}>
          <CarOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>{t('cabinet.trucks.noCars')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trucks.map(truck => (
            <div
              key={truck.id}
              onClick={() => navigate(`/cabinet/trucks/${truck.id}`)}
              style={{
                background: '#fff', padding: '20px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${Y}`,
                cursor: 'pointer', transition: 'box-shadow 0.2s',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: INK }}>
                  {truck.specific_model_name}
                </div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                  {t('cabinet.trucks.plateNumber')} <strong>{truck.license_plate}</strong>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {truck.euro_standard_display && (
                    <span style={{ fontSize: 12, color: '#888' }}>{truck.euro_standard_display}</span>
                  )}
                  {truck.last_seven_vin && (
                    <span style={{ fontSize: 12, color: '#888' }}>VIN: ...{truck.last_seven_vin}</span>
                  )}
                  {truck.latest_mileage > 0 && (
                    <span style={{ fontSize: 12, color: '#888' }}>{t('cabinet.trucks.mileage')} {truck.latest_mileage.toLocaleString('uk-UA')} {t('common.km')}</span>
                  )}
                </div>
              </div>
              <RightOutlined style={{ color: '#ccc', fontSize: 18, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
