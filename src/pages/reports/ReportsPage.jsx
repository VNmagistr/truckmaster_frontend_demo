import React, { useState, useEffect } from 'react';
import { Card, Radio, Statistic, Row, Col, message } from 'antd';
import { CarOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { PageHeader, LoadingSpinner } from '../../components';
import { ordersAPI } from '../../api';

function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('month');
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadVehicleReport = async (p) => {
    setLoading(true);
    try {
      const res = await ordersAPI.reportVehicles(p);
      setVehicleData(res.data || res);
    } catch {
      message.error(t('reports.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVehicleReport(period); }, [period]);

  const handlePeriodChange = (e) => setPeriod(e.target.value);

  return (
    <div>
      <PageHeader title={t('reports.title')} />

      <Card
        title={t('reports.vehiclesTitle')}
        extra={
          <Radio.Group value={period} onChange={handlePeriodChange} size="small">
            <Radio.Button value="week">{t('reports.week')}</Radio.Button>
            <Radio.Button value="month">{t('reports.month')}</Radio.Button>
            <Radio.Button value="year">{t('reports.year')}</Radio.Button>
          </Radio.Group>
        }
      >
        {loading ? (
          <LoadingSpinner />
        ) : vehicleData ? (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col>
                <Statistic
                  title={t('reports.uniqueVehicles')}
                  value={vehicleData.total}
                  prefix={<CarOutlined />}
                  valueStyle={{ color: '#f5c518', fontWeight: 700 }}
                />
              </Col>
            </Row>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData.chart}>
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name={t('reports.vehicles')}
                    fill="#f5c518"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default ReportsPage;
