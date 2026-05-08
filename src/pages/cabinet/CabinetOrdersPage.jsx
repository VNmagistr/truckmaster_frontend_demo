import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileTextOutlined, RightOutlined } from '@ant-design/icons';
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

export default function CabinetOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const ALL_STATUSES = [
    { value: '', label: t('cabinet.orders.filterAll') },
    { value: 'OPEN', label: t('cabinet.orders.filterOpen') },
    { value: 'IN_PROGRESS', label: t('cabinet.orders.filterInProgress') },
    { value: 'DONE', label: t('cabinet.orders.filterDone') },
    { value: 'CLOSED', label: t('cabinet.orders.filterClosed') },
  ];

  useEffect(() => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    setLoading(true);
    cabinetAPI.getOrders(params)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.results || []);
        setOrders(list);
      })
      .finally(() => setLoading(false));
  }, [filterStatus]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, marginBottom: 16 }}>{t('cabinet.orders.title')}</h1>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {ALL_STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            style={{
              padding: '6px 14px', border: '1px solid',
              borderColor: filterStatus === value ? INK : '#e0e0e0',
              background: filterStatus === value ? INK : '#fff',
              color: filterStatus === value ? '#fff' : '#666',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', borderRadius: 20,
              transition: 'all 0.2s',
            }}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>{t('common.loading')}</div>
      ) : orders.length === 0 ? (
        <div style={{ background: '#fff', padding: '48px 24px', textAlign: 'center', color: '#aaa' }}>
          <FileTextOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>{t('cabinet.orders.noOrders')}</div>
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
                  <div style={{ fontWeight: 700, color: INK, fontSize: 15 }}>№{order.order_number}</div>
                  <div style={{ color: '#888', fontSize: 13, marginTop: 3 }}>
                    {order.truck?.license_plate} · {order.truck?.specific_model_name}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
                    {new Date(order.created_at).toLocaleDateString('uk-UA')}
                  </div>
                  {order.problem_description && (
                    <div style={{ color: INK2, fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 6 }}>
                      {Number(order.total_cost).toLocaleString('uk-UA')} ₴
                    </div>
                  )}
                </div>
                <RightOutlined style={{ color: '#ccc', fontSize: 14, flexShrink: 0, alignSelf: 'center' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
