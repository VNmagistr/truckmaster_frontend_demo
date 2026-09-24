import React, { useState, useEffect } from 'react';
import { Card, Radio, Table, Statistic, Row, Col, message, Empty } from 'antd';
import { CarOutlined, CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PageHeader, LoadingSpinner } from '../../components';
import { ordersAPI } from '../../api';

const Y = '#f5c518';
const INK = '#1a1a1a';

const cardStyle = {
  borderTop: `4px solid ${Y}`,
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

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

  const maxCount = vehicleData?.chart
    ? Math.max(...vehicleData.chart.map((r) => r.count), 1)
    : 1;

  const columns = [
    {
      title: periodLabel,
      dataIndex: 'name',
      key: 'name',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>,
    },
    {
      title: t('reports.vehicleCount'),
      dataIndex: 'count',
      key: 'count',
      width: 180,
      render: (val) => {
        const pct = (val / maxCount) * 100;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 22, borderRadius: 4,
              background: '#f5f5f5', overflow: 'hidden',
            }}>
              {val > 0 && (
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: `linear-gradient(90deg, ${Y}, #ffd966)`,
                  borderRadius: 4, minWidth: 4,
                  transition: 'width 0.4s ease',
                }} />
              )}
            </div>
            <span style={{
              fontWeight: val > 0 ? 700 : 400,
              color: val > 0 ? INK : '#bfbfbf',
              minWidth: 28, textAlign: 'right',
              fontSize: 14,
            }}>
              {val}
            </span>
          </div>
        );
      },
    },
  ];

  const periodDays = vehicleData?.chart
    ? vehicleData.chart.filter((r) => r.count > 0).length
    : 0;

  return (
    <div>
      <PageHeader title={t('reports.title')} />

      <Card style={cardStyle}>
        <div className="reports-header">
          <h3 className="reports-card-title">{t('reports.vehiclesTitle')}</h3>
          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            size="middle"
            buttonStyle="solid"
          >
            <Radio.Button value="week">{t('reports.week')}</Radio.Button>
            <Radio.Button value="month">{t('reports.month')}</Radio.Button>
            <Radio.Button value="year">{t('reports.year')}</Radio.Button>
          </Radio.Group>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : vehicleData ? (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={8}>
                <div className="reports-stat-card">
                  <Statistic
                    title={t('reports.uniqueVehicles')}
                    value={vehicleData.total}
                    prefix={<CarOutlined />}
                    valueStyle={{ color: Y, fontWeight: 700, fontSize: 28 }}
                  />
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div className="reports-stat-card">
                  <Statistic
                    title={period === 'year' ? t('reports.activePeriods') : t('reports.activeDays')}
                    value={periodDays}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: INK, fontWeight: 700, fontSize: 28 }}
                  />
                </div>
              </Col>
            </Row>

            <Table
              className="reports-table"
              dataSource={vehicleData.chart?.map((item, i) => ({ ...item, key: i }))}
              columns={columns}
              pagination={false}
              size="middle"
              rowClassName={(_, i) => i % 2 === 0 ? 'reports-row-even' : 'reports-row-odd'}
              summary={() => (
                <Table.Summary.Row className="reports-summary-row">
                  <Table.Summary.Cell>
                    <strong>{t('reports.total')}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }} />
                      <span style={{
                        fontWeight: 700, fontSize: 16, color: INK,
                        minWidth: 28, textAlign: 'right',
                      }}>
                        {vehicleData.total}
                      </span>
                    </div>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        ) : (
          <Empty description={t('common.noData')} />
        )}
      </Card>
    </div>
  );
}

export default ReportsPage;
