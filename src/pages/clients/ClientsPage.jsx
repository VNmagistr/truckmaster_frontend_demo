import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, message, Popconfirm, Card, Empty, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.error(t('clients.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await clientsAPI.delete(id);
      message.success(t('clients.deleteSuccess'));
      fetchClients(pagination.current);
    } catch {
      message.error(t('clients.deleteError'));
    }
  };

  const columns = [
    {
      title: t('clients.nameOrCompany'),
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: t('common.phone'),
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => formatPhone(phone),
    },
    {
      title: t('clients.city'),
      dataIndex: 'address',
      key: 'address',
      render: (addr) => addr || '-',
    },
    {
      title: t('common.email'),
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/clients/${record.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/clients/${record.id}/edit`)} />
          <Popconfirm title={t('clients.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('clients.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/clients/new')}>
            {t('clients.newClient')}
          </Button>
        }
      />

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Input
            placeholder={t('clients.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder={t('clients.city')}
            allowClear
            style={{ width: 180 }}
            value={cityFilter}
            onChange={v => setCityFilter(v)}
            showSearch
            options={CITIES.map(c => ({ value: c, label: c }))}
          />
          {(searchText || cityFilter) && (
            <Button onClick={() => { setSearchText(''); setCityFilter(null); }}>
              {t('common.reset')}
            </Button>
          )}
        </Space>
      </Card>

      <Card>
        {!loading && pagination.total === 0 && !searchText && !cityFilter ? (
          <Empty
            image={<UserOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            imageStyle={{ height: 80 }}
            description={
              <div>
                <Typography.Text style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                  {t('clients.emptyTitle')}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t('clients.emptyDesc')}
                </Typography.Text>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/clients/new')}>
              {t('clients.addClient')}
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
            dataSource={clients}
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
              onClick: () => navigate(`/clients/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

    </div>
  );
}

export default ClientsPage;
