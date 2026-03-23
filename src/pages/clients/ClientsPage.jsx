import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { clientsAPI } from '../../api';
import { PageHeader } from '../../components';
import { formatPhone } from '../../utils/formatters';

const CITIES = [
  'Київ', 'Харків', 'Одеса', 'Дніпро', 'Запоріжжя', 'Львів', 'Кривий Ріг',
  'Миколаїв', 'Вінниця', 'Херсон', 'Полтава', 'Чернігів', 'Черкаси',
  'Суми', 'Житомир', 'Рівне', 'Івано-Франківськ', 'Тернопіль', 'Хмельницький',
  'Луцьк', 'Ужгород', 'Чернівці', 'Кропивницький', 'Біла Церква',
];

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    setPagination(p => ({ ...p, current: 1 }));
    fetchClients(1);
  }, [cityFilter]);

  useEffect(() => {
    fetchClients(pagination.current);
  }, [pagination.current]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.length > 0 && searchText.length < 2) return;
      setPagination(p => ({ ...p, current: 1 }));
      fetchClients(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchClients = async (page) => {
    setLoading(true);
    try {
      const params = { page, page_size: 20, ordering: 'name' };
      if (searchText) params.search = searchText;
      // Пошук по місту через search (address входить у search_fields)
      if (cityFilter && !searchText) params.search = cityFilter;

      const response = await clientsAPI.getAll(params);
      const data = response.data || response;
      setClients(data.results || []);
      setPagination(p => ({ ...p, current: page, total: data.count || 0 }));
    } catch {
      message.error('Не вдалося завантажити клієнтів');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await clientsAPI.delete(id);
      message.success('Клієнта видалено');
      fetchClients(pagination.current);
    } catch {
      message.error('Не вдалося видалити клієнта');
    }
  };

  const columns = [
    {
      title: "Ім'я / Назва",
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => formatPhone(phone),
    },
    {
      title: 'Місто',
      dataIndex: 'address',
      key: 'address',
      render: (addr) => addr || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/clients/${record.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/clients/${record.id}/edit`)} />
          <Popconfirm title="Видалити клієнта?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Клієнти"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/clients/new')}>
            Новий клієнт
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Input
            placeholder="Пошук (ім'я, телефон, email)..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Місто"
            allowClear
            style={{ width: 180 }}
            value={cityFilter}
            onChange={v => setCityFilter(v)}
            showSearch
            options={CITIES.map(c => ({ value: c, label: c }))}
          />
          {(searchText || cityFilter) && (
            <Button onClick={() => { setSearchText(''); setCityFilter(null); }}>
              Скинути
            </Button>
          )}
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={clients}
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
            onClick: () => navigate(`/clients/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

    </div>
  );
}

export default ClientsPage;
