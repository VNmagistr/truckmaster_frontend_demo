import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Switch, Typography, Grid, App, Tag, Spin, Empty, Tooltip,
} from 'antd';
import { QrcodeOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { shortlinksAPI } from '../../api';

const { Title, Text } = Typography;

function QrCodesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState({});

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await shortlinksAPI.getAll();
      setLinks(data);
    } catch {
      message.error(t('qrCodes.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleToggle = async (record) => {
    setToggling((prev) => ({ ...prev, [record.id]: true }));
    try {
      const { data } = await shortlinksAPI.toggle(record.id);
      setLinks((prev) => prev.map((l) => (l.id === record.id ? data : l)));
      message.success(
        data.is_active ? t('qrCodes.enabled') : t('qrCodes.disabled'),
      );
    } catch {
      message.error(t('qrCodes.toggleError'));
    } finally {
      setToggling((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const columns = [
    {
      title: t('qrCodes.colStatus'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (val, record) => (
        <Switch
          checked={val}
          loading={toggling[record.id]}
          onChange={() => handleToggle(record)}
        />
      ),
    },
    {
      title: t('qrCodes.colName'),
      key: 'name',
      render: (_, record) => (
        <div>
          <Text strong>{record.label || record.slug}</Text>
          <br />
          <Text type="secondary" className="qr-codes-slug">/go/{record.slug}</Text>
        </div>
      ),
    },
    {
      title: t('qrCodes.colTarget'),
      dataIndex: 'target_url',
      key: 'target_url',
      ellipsis: true,
      responsive: ['md'],
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {url}
        </a>
      ),
    },
    {
      title: t('qrCodes.colHits'),
      dataIndex: 'hits',
      key: 'hits',
      width: 90,
      responsive: ['sm'],
      render: (val) => <Tag>{val}</Tag>,
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card
        className="form-card"
        title={
          <span>
            <QrcodeOutlined style={{ marginRight: 8 }} />
            {t('qrCodes.title')}
          </span>
        }
        extra={
          <Tooltip title={t('common.refresh')}>
            <ReloadOutlined
              onClick={fetchLinks}
              spin={loading}
              style={{ fontSize: 16, cursor: 'pointer' }}
            />
          </Tooltip>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('qrCodes.description')}
        </Text>

        <Table
          dataSource={links}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description={t('common.noData')} /> }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>
    </div>
  );
}

export default QrCodesPage;
