import React, { useState, useEffect } from 'react';
import { Card, Radio, Table, Statistic, Row, Col, message } from 'antd';
import { CarOutlined } from '@ant-design/icons';
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

  const periodLabel = period === 'year'
    ? t('reports.monthCol')
    : period === 'week'
      ? t('reports.dayOfWeek')
      : t('reports.dayOfMonth');

  const columns = [
    {
      title: periodLabel,
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('reports.vehicleCount'),
      dataIndex: 'count',
      key: 'count',
      width: 160,
      render: (val) => (
        <span style={{ fontWeight: val > 0 ? 600 : 400, color: val > 0 ? '#1a1a1a' : '#bfbfbf' }}>
          {val}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t('reports.title')} />

      <Card
        title={t('reports.vehiclesTitle')}
        extra={
          <Radio.Group value={period} onChange={(e) => setPeriod(e.target.value)} size="small">
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
            <Row style={{ marginBottom: 16 }}>
              <Col>
                <Statistic
                  title={t('reports.uniqueVehicles')}
                  value={vehicleData.total}
                  prefix={<CarOutlined />}
                  valueStyle={{ color: '#f5c518', fontWeight: 700 }}
                />
              </Col>
            </Row>
            <Table
              dataSource={vehicleData.chart?.map((item, i) => ({ ...item, key: i }))}
              columns={columns}
              pagination={false}
              size="small"
              bordered
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell><strong>{t('reports.total')}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <strong>{vehicleData.total}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default ReportsPage;
