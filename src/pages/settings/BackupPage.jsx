import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Table, Space, Typography, Upload, Modal, Grid, App,
  Popconfirm, Tag, Spin, Empty,
} from 'antd';
import {
  CloudUploadOutlined, CloudDownloadOutlined, DeleteOutlined,
  PlusOutlined, UndoOutlined, UploadOutlined, ExclamationCircleOutlined,
  DatabaseOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { backupsAPI } from '../../api';

const { Title, Text } = Typography;

function BackupPage() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await backupsAPI.getAll();
      setBackups(data);
    } catch {
      message.error(t('backup.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await backupsAPI.create();
      message.success(t('backup.createSuccess'));
      fetchBackups();
    } catch {
      message.error(t('backup.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const { data } = await backupsAPI.download(filename);
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error(t('backup.downloadError'));
    }
  };

  const handleDelete = async (filename) => {
    try {
      await backupsAPI.remove(filename);
      message.success(t('backup.deleteSuccess'));
      fetchBackups();
    } catch {
      message.error(t('backup.deleteError'));
    }
  };

  const confirmRestore = (filename) => {
    modal.confirm({
      title: t('backup.restoreConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('backup.restoreConfirmDesc'),
      okText: t('backup.restoreBtn'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => doRestore(filename),
    });
  };

  const doRestore = async (filename) => {
    setRestoring(true);
    try {
      await backupsAPI.restore(filename);
      message.success(t('backup.restoreSuccess'));
      fetchBackups();
    } catch {
      message.error(t('backup.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadRestore = (file) => {
    modal.confirm({
      title: t('backup.restoreConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('backup.restoreUploadConfirmDesc'),
      okText: t('backup.restoreBtn'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setRestoring(true);
        try {
          await backupsAPI.restoreFromFile(file);
          message.success(t('backup.restoreSuccess'));
          fetchBackups();
        } catch {
          message.error(t('backup.restoreError'));
        } finally {
          setRestoring(false);
        }
      },
    });
    return false;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns = [
    {
      title: t('backup.filename'),
      dataIndex: 'filename',
      key: 'filename',
      render: (name) => (
        <Space>
          <DatabaseOutlined />
          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: t('backup.size'),
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size) => <Tag>{formatSize(size)}</Tag>,
    },
    {
      title: t('backup.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      responsive: ['md'],
      render: (dt) => new Date(dt).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: isMobile ? 120 : 200,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => handleDownload(record.filename)}
          >
            {!isMobile && t('backup.download')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UndoOutlined />}
            onClick={() => confirmRestore(record.filename)}
            loading={restoring}
          >
            {!isMobile && t('backup.restore')}
          </Button>
          <Popconfirm
            title={t('backup.deleteConfirm')}
            onConfirm={() => handleDelete(record.filename)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {!isMobile && t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <Title level={3} style={{ margin: 0 }}>{t('backup.title')}</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchBackups} loading={loading}>
            {!isMobile && t('common.refresh')}
          </Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleUploadRestore}
          >
            <Button icon={<UploadOutlined />} loading={restoring}>
              {t('backup.restoreFromFile')}
            </Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} loading={creating}>
            {t('backup.createBackup')}
          </Button>
        </Space>
      </div>

      <Card
        style={{ borderTop: '4px solid #f5c518' }}
      >
        <Spin spinning={restoring} tip={t('backup.restoringTip')}>
          <Table
            dataSource={backups}
            columns={columns}
            rowKey="filename"
            loading={loading}
            pagination={false}
            size={isMobile ? 'small' : 'middle'}
            locale={{ emptyText: <Empty description={t('backup.noBackups')} /> }}
          />
        </Spin>
      </Card>
    </div>
  );
}

export default BackupPage;
