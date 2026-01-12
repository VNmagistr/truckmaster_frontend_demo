import React from 'react';
import { Typography, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

function PageHeader({ title, subtitle, onBack, extra, showBack = false }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      style={{
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div>
        <Space align="center" style={{ marginBottom: subtitle ? 4 : 0 }}>
          {showBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginRight: 8 }}
            />
          )}
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
        </Space>
        {subtitle && (
          <div style={{ color: '#666', marginLeft: showBack ? 40 : 0 }}>{subtitle}</div>
        )}
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}

export default PageHeader;