import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatPhone } from '../../utils/formatters';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // 1. Отримуємо відповідь
      const response = await clientsAPI.getAll();
      
      // 2. 🔥 ВИПРАВЛЕННЯ: Дістаємо дані з обгортки axios (.data)
      const data = response.data || response;
      
      // 3. Враховуємо пагінацію Django (results) або звичайний масив
      setClients(data.results || data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      message.error('Не вдалося завантажити клієнтів');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await clientsAPI.delete(id);
      message.success('Клієнта видалено');
      fetchClients();
    } catch (error) {
      message.error('Не вдалося видалити клієнта');
    }
  };

  const filteredClients = clients.filter(client => {
    const value = searchText.toLowerCase();
    return (
      client.name?.toLowerCase().includes(value) ||
      client.phone?.includes(value) ||
      client.email?.toLowerCase().includes(value)
    );
  });

  const columns = [
    {
      title: 'Ім\'я / Назва',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/clients/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => formatPhone(phone),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/clients/${record.id}`)} />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/clients/${record.id}/edit`)} />
          <Popconfirm title="Видалити клієнта?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Клієнти"
        extra={
          <Space>
            <Input
              placeholder="Пошук клієнта..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/clients/new')}>
              Додати клієнта
            </Button>
          </Space>
        }
      />
      
      <Card>
        <Table
          columns={columns}
          dataSource={filteredClients}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

export default ClientsPage;