import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { clientsAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatPhone } from '../../utils/formatters';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Стани для пагінації та пошуку
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');

  const navigate = useNavigate();

  // Завантаження при зміні сторінки
  useEffect(() => {
    fetchClients(pagination.current, searchText);
  }, [pagination.current]);

  // Завантаження при зміні пошуку (з затримкою/debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
        // При пошуку завжди скидаємо на 1-шу сторінку
        setPagination(prev => ({ ...prev, current: 1 })); 
        fetchClients(1, searchText);
    }, 600); // Чекаємо 600мс після останнього натискання клавіші
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchClients = async (page, search) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 20,
        ordering: '-created_at',
      };
      
      // Якщо є пошук - додаємо параметр
      if (search) params.search = search;

      const response = await clientsAPI.getAll(params);
      const data = response.data || response;
      
      setClients(data.results || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));

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
      fetchClients(pagination.current, searchText);
    } catch (error) {
      message.error('Не вдалося видалити клієнта');
    }
  };

  const columns = [
    {
      title: 'Ім\'я / Назва',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/clients/${record.id}`}>{text}</Link>,
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
      render: (email) => email || '-',
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

  return (
    <div>
      <PageHeader
        title="Клієнти"
        extra={
          <Space>
            <Input
              placeholder="Пошук клієнта..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/clients/new')}>
              Новий клієнт
            </Button>
          </Space>
        }
      />
      <Card>
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: 20,
            total: pagination.total,
            showSizeChanger: false, // Можна увімкнути, якщо сервер підтримує динамічний page_size
            showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
          }}
          onChange={(newPagination) => setPagination(prev => ({ ...prev, current: newPagination.current }))}
          loading={loading}
        />
      </Card>
    </div>
  );
}

export default ClientsPage;