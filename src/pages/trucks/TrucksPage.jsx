import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trucksAPI, baseModelsAPI } from '../../api';
import { PageHeader } from '../../components';

const EURO_OPTIONS = [
  { value: 'EURO3', label: 'Євро-3' },
  { value: 'EURO4', label: 'Євро-4' },
  { value: 'EURO5', label: 'Євро-5' },
  { value: 'EURO6', label: 'Євро-6' },
];

function TrucksPage() {
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
      message.error('Не вдалося завантажити вантажівки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await trucksAPI.delete(id);
      message.success('Вантажівку видалено');
      fetchTrucks(pagination.current);
    } catch {
      message.error('Не вдалося видалити вантажівку');
    }
  };

  const columns = [
    {
      title: 'Номерний знак',
      dataIndex: 'license_plate',
      key: 'license_plate',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Модель',
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
      title: 'Євростандарт',
      dataIndex: 'euro_standard_display',
      key: 'euro',
      render: (text) => text || '-',
    },
    {
      title: 'VIN (останні 7)',
      dataIndex: 'last_seven_vin',
      key: 'vin',
      render: (vin) => vin ? <code style={{ fontSize: 12 }}>...{vin}</code> : '-',
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => record.client ? (
        <a onClick={(e) => { e.stopPropagation(); navigate(`/clients/${record.client.id}`); }}>
          {record.client.name}
        </a>
      ) : '-',
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/trucks/${record.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/trucks/${record.id}/edit`)} />
          <Popconfirm title="Видалити вантажівку?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Вантажівки"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trucks/new')}>
            Додати авто
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Input
            placeholder="Пошук (номер, VIN, модель)..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="Євростандарт"
            allowClear
            style={{ width: 140 }}
            value={euroFilter}
            onChange={v => setEuroFilter(v)}
            options={EURO_OPTIONS}
          />
          <Select
            placeholder="Базова модель"
            allowClear
            style={{ width: 160 }}
            value={modelFilter}
            onChange={v => setModelFilter(v)}
            options={baseModels.map(m => ({ value: m.id, label: `Iveco ${m.name}` }))}
          />
          {(searchText || euroFilter || modelFilter) && (
            <Button onClick={() => { setSearchText(''); setEuroFilter(null); setModelFilter(null); }}>
              Скинути
            </Button>
          )}
        </Space>
      </Card>

      <Card>
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
            showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`,
          }}
          onChange={(p) => setPagination(prev => ({ ...prev, current: p.current }))}
          rowClassName="row-clickable"
          onRow={(record) => ({
            onClick: () => navigate(`/trucks/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <style>{`
        .row-clickable:hover > td { background-color: #fffbea !important; }
      `}</style>
    </div>
  );
}

export default TrucksPage;
