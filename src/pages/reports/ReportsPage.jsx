import React from 'react';
import { Card, Row, Col, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components';

function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('reports.title')} />
      <Card>
        <Empty
          image={<BarChartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={t('reports.comingSoon')}
        />
      </Card>
    </div>
  );
}

export default ReportsPage;
