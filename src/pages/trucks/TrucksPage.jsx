import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, message, Popconfirm, Card, Empty, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trucksAPI, baseModelsAPI } from '../../api';
import { PageHeader } from '../../components';

const EURO_OPTIONS = [
  { value: 'EURO3', label: 'Euro-3' },
  { value: 'EURO4', label: 'Euro-4' },
  { value: 'EURO5', label: 'Euro-5' },
  { value: 'EURO6', label: 'Euro-6' },
];

function TrucksPage() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseModels, setBaseModels] = useState([]);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [euroFilter, setEuroFilter] = useState(null);
  const [modelFilter, setModelFilter] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    baseModelsAPI.getAll().then(r => {
      const data = r.data || r;
      setBaseModels(Array.isArray(data) ? data : (data.results || []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setPagination(p => ({ ...p, current: 1 }));
    fetchTrucks(1);
  }, [euroFilter, modelFilter]);

  useEffect(() => {
    fetchTrucks(pagination.current);
  }, [pagination.current]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.length > 0 && searchText.length < 2) return;
      setPagination(p => ({ ...p, current: 1 }));
      fetchTrucks(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchTrucks = async (page) => {
    setLoading(true);
    try {
      const params = { page, page_size: 20, ordering: 'license_plate' };
      if (searchText) params.search = searchText;
      if (euroFilter) params.euro_standard = euroFilter;
      if (modelFilter) params.base_model = modelFilter;

      const response = await trucksAPI.getAll(params);
      const data = response.data || response;
      setTrucks(data.results || []);
      setPagination(p => ({ ...p, current: page, total: data.count || 0 }));
    } catch {
      message.error(t('trucks.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await trucksAPI.delete(id);
      message.success(t('trucks.deleteSuccess'));
      fetchTrucks(pagination.current);
    } catch {
      message.error(t('trucks.deleteError'));
    }
  };

  const columns = [
    {
      title: t('trucks.licensePlate'),
      dataIndex: 'license_plate',
      key: 'license_plate',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: t('trucks.model'),
      dataIndex: 'specific_model_name',
      key: 'model',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.base_model_name && <div style={{ fontSize: 12, color: '#888' }}>Iveco {record.base_model_name}</div>}
        </div>
      ),
    },
    {
      title: t('trucks.euroStandard'),
      dataIndex: 'euro_standard_display',
      key: 'euro',
      render: (text) => text || '-',
    },
    {
      title: t('trucks.transmissionType'),
      dataIndex: 'transmission_type_display',
      key: 'transmission',
      render: (text) => text || '-',
    },
    {
      title: t('trucks.lastSevenVin'),
      dataIndex: 'last_seven_vin',
      key: 'vin',
      render: (vin) => vin ? <code style={{ fontSize: 12 }}>...{vin}</code> : '-',
    },
    {
      title: t('common.client'),
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => record.client ? (
        <a onClick={(e) => { e.stopPropagation(); navigate(`/clients/${record.client.id}`); }}>
          {record.client.name}
        </a>
      ) : '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/trucks/${record.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/trucks/${record.id}/edit`)} />
          <Popconfirm title={t('trucks.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('trucks.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trucks/new')}>
            {t('trucks.addTruck')}
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Input
            placeholder={t('trucks.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder={t('trucks.euroStandard')}
            allowClear
            style={{ width: 140 }}
            value={euroFilter}
            onChange={v => setEuroFilter(v)}
            options={EURO_OPTIONS}
          />
          <Select
            placeholder={t('trucks.baseModel')}
            allowClear
            style={{ width: 160 }}
            value={modelFilter}
            onChange={v => setModelFilter(v)}
            options={baseModels.map(m => ({ value: m.id, label: `Iveco ${m.name}` }))}
          />
          {(searchText || euroFilter || modelFilter) && (
            <Button onClick={() => { setSearchText(''); setEuroFilter(null); setModelFilter(null); }}>
              {t('common.reset')}
            </Button>
          )}
        </Space>
      </Card>

      <Card>
        {!loading && pagination.total === 0 && !searchText && !euroFilter && !modelFilter ? (
          <Empty
            image={<CarOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            imageStyle={{ height: 80 }}
            description={
              <div>
                <Typography.Text style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                  {t('trucks.emptyTitle')}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t('trucks.emptyDesc')}
                </Typography.Text>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trucks/new')}>
              {t('trucks.addTruck')}
            </Button>
          </Empty>
        ) : !loading && pagination.total === 0 ? (
          <Empty
            description={
              <Typography.Text type="secondary">
                {t('common.notFound')}
              </Typography.Text>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={trucks}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: 20,
              total: pagination.total,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total}`,
            }}
            onChange={(p) => setPagination(prev => ({ ...prev, current: p.current }))}
            rowClassName="row-clickable"
            onRow={(record) => ({
              onClick: () => navigate(`/trucks/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

    </div>
  );
}

export default TrucksPage;
