import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, RightOutlined } from '@ant-design/icons';
import { cabinetAPI } from '../../api/cabinet';

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

export default function CabinetTruckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cabinetAPI.getTrucks(),
      cabinetAPI.getOrders({ truck: id }),
    ]).then(([trucksRes, ordersRes]) => {
      const allTrucks = Array.isArray(trucksRes.data) ? trucksRes.data : (trucksRes.data.results || []);
      const t = allTrucks.find(x => String(x.id) === String(id));
      setTruck(t || null);
      const list = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
      setOrders(list);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>Завантаження...</div>;
  if (!truck) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ color: '#aaa', marginBottom: 16 }}>Автомобіль не знайдено</div>
      <button onClick={() => navigate('/cabinet/trucks')} style={{ background: Y, border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>
        До списку авто
      </button>
    </div>
  );

  const infoRows = [
    { label: 'Номерний знак', value: truck.license_plate },
    { label: 'VIN (останні 7)', value: '...' + truck.last_seven_vin },
    { label: 'Євростандарт', value: truck.euro_standard_display || '—' },
    { label: 'Останній пробіг', value: truck.latest_mileage > 0 ? `${truck.latest_mileage.toLocaleString('uk-UA')} км` : '—' },
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/cabinet/trucks')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: INK2, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeftOutlined /> Мої авто
      </button>

      {/* Truck header */}
      <div style={{ background: '#fff', borderTop: `4px solid ${Y}`, padding: '20px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: INK, marginBottom: 4 }}>
          {truck.specific_model_name}
        </div>
        {truck.base_model && (
          <div style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>{truck.base_model}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 24px' }}>
          {infoRows.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders for this truck */}
      <h2 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 14 }}>
        Історія обслуговування ({orders.length})
      </h2>

      {orders.length === 0 ? (
        <div style={{ background: '#fff', padding: '28px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          Замовлень для цього автомобіля поки немає.
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
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>№{order.order_number}</div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                  {new Date(order.created_at).toLocaleDateString('uk-UA')}
                </div>
                {order.problem_description && (
                  <div style={{ color: INK2, fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.problem_description}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                  fontSize: 12, fontWeight: 600,
                  background: STATUS_COLOR[order.status] + '20',
                  color: STATUS_COLOR[order.status],
                }}>{order.status_display}</span>
                {order.total_cost > 0 && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginTop: 4 }}>
                    {Number(order.total_cost).toLocaleString('uk-UA')} ₴
                  </div>
                )}
              </div>
              <RightOutlined style={{ color: '#ccc', fontSize: 14, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
