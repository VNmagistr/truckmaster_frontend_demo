import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CarOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';
import useCabinetAuthStore from '../../store/cabinetAuthStore';

const Y = '#f5c518';
const INK = '#1a1a1a';
const INK2 = '#555';

const STATUS_COLOR = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  DONE: '#22c55e',
  CLOSED: '#6b7280',
  CANCELED: '#ef4444',
};

function StatusBadge({ status, label }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 600,
      background: STATUS_COLOR[status] + '20',
      color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}40`,
    }}>{label}</span>
  );
}

export default function CabinetDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCabinetAuthStore();
  const [trucks, setTrucks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([cabinetAPI.getTrucks(), cabinetAPI.getOrders()])
      .then(([tr, o]) => {
        const truckList = Array.isArray(tr.data) ? tr.data : (tr.data.results || []);
        const orderList = Array.isArray(o.data) ? o.data : (o.data.results || []);
        setTrucks(truckList);
        setOrders(orderList.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>{t('common.loading')}</div>;

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900, color: INK, margin: 0 }}>
          {t('cabinet.dashboard.welcome')} {user?.name?.split(' ')[0]}!
        </h1>
        <p style={{ color: INK2, marginTop: 6, fontSize: 14 }}>
          {t('cabinet.dashboard.subtitle')}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: t('cabinet.dashboard.myCars'), value: trucks.length, icon: <CarOutlined />, color: Y },
          { label: t('cabinet.dashboard.myOrders'), value: orders.length, icon: <FileTextOutlined />, color: '#3b82f6' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: '#fff', padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 24, color, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: INK, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* My trucks */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: INK, margin: 0 }}>{t('cabinet.dashboard.myCarsTitle')}</h2>
          <button onClick={() => navigate('/cabinet/trucks')} style={{ background: 'none', border: 'none', color: Y, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {t('cabinet.dashboard.viewAll')} <RightOutlined />
          </button>
        </div>

        {trucks.length === 0 ? (
          <div style={{ background: '#fff', padding: '28px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            {t('cabinet.dashboard.noCars')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trucks.map(truck => (
              <div
                key={truck.id}
                onClick={() => navigate(`/cabinet/trucks/${truck.id}`)}
                style={{
                  background: '#fff', padding: '16px 18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
                  borderLeft: `3px solid ${Y}`, transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
              >
                <div>
                  <div style={{ fontWeight: 700, color: INK, fontSize: 15 }}>
                    {truck.specific_model_name}
                  </div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 3 }}>
                    {truck.license_plate}
                    {truck.euro_standard_display && ` · ${truck.euro_standard_display}`}
                  </div>
                </div>
                <RightOutlined style={{ color: '#ccc', fontSize: 16 }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: INK, margin: 0 }}>{t('cabinet.dashboard.recentOrders')}</h2>
          <button onClick={() => navigate('/cabinet/orders')} style={{ background: 'none', border: 'none', color: Y, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {t('cabinet.dashboard.viewAll')} <RightOutlined />
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', padding: '28px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            {t('cabinet.dashboard.noOrders')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => navigate(`/cabinet/orders/${order.id}`)}
                style={{
                  background: '#fff', padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>
                      №{order.order_number}
                    </div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                      {order.truck?.license_plate} · {new Date(order.created_at).toLocaleDateString('uk-UA')}
                    </div>
                    {order.problem_description && (
                      <div style={{ color: INK2, fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.problem_description}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={order.status} label={order.status_display} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK, textAlign: 'right', marginTop: 6 }}>
                      {order.total_cost > 0 ? `${Number(order.total_cost).toLocaleString('uk-UA')} ₴` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
