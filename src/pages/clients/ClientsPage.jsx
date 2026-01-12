import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import { formatPhone } from '../../utils/formatters';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, [pagination.current, pagination.pageSize]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await clientsAPI.getAll({
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      
      const data = response.results || response;
      setClients(Array.isArray(data) ? data : []);
      setPagination(prev => ({
        ...prev,
        total: response.count || data.length || 0,
      }));
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Не вдалося завантажити список клієнтів');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await clientsAPI.delete(id);
      message.success('Клієнта успішно видалено');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      message.error('Не вдалося видалити клієнта');
    }
  };

  const handleTableChange = (paginationConfig) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  const getColumnSearchProps = (dataIndex, placeholder) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Пошук
          </Button>
          <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>
            Скинути
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  });

  const columns = [
    {
      title: "Ім'я",
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      ...getColumnSearchProps('name', "Пошук по імені"),
      render: (text, record) => (
        <Link to={`/clients/${record.id}`} style={{ fontWeight: 500 }}>
          {text || '-'}
        </Link>
      ),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      ...getColumnSearchProps('phone', 'Пошук по телефону'),
      render: (phone) => formatPhone(phone),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ...getColumnSearchProps('email', 'Пошук по email'),
      render: (email) => email || '-',
    },
    {
      title: 'Адреса',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address) => address || '-',
    },
    {
      title: 'Telegram',
      dataIndex: 'telegram_chat_id',
      key: 'telegram',
      render: (id) => id ? <span style={{ color: '#1890ff' }}>Підключено</span> : '-',
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/clients/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/clients/${record.id}/edit`)}
          />
          <Popconfirm
            title="Видалити клієнта?"
            description="Ця дія може вплинути на пов'язані дані."
            onConfirm={() => handleDelete(record.id)}
            okText="Так"
            cancelText="Ні"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && clients.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Клієнти"
        subtitle={`Всього: ${pagination.total}`}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/clients/new')}
          >
            Додати клієнта
          </Button>
        }
      />

      <Card>
        {clients.length > 0 ? (
          <Table
            columns={columns}
            dataSource={clients}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`,
            }}
            onChange={handleTableChange}
          />
        ) : (
          <EmptyState
            description="Клієнтів поки немає"
            buttonText="Додати клієнта"
            onButtonClick={() => navigate('/clients/new')}
          />
        )}
      </Card>
    </div>
  );
}

export default ClientsPage;