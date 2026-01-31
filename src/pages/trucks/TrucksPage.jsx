import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';

function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      const response = await trucksAPI.getAll();
      // 🔥 ВИПРАВЛЕННЯ: Спочатку дістаємо .data з Axios, потім .results з Django
      const data = response.data || response;
      setTrucks(data.results || data || []);
    } catch (error) {
      console.error('Error fetching trucks:', error);
      message.error('Не вдалося завантажити вантажівки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await trucksAPI.delete(id);
      message.success('Вантажівку видалено');
      fetchTrucks();
    } catch (error) {
      message.error('Не вдалося видалити вантажівку');
    }
  };

  const filteredTrucks = trucks.filter(truck => {
    const value = searchText.toLowerCase();
    return (
      truck.license_plate?.toLowerCase().includes(value) ||
      truck.full_vin?.toLowerCase().includes(value) ||
      truck.last_seven_vin?.toLowerCase().includes(value) ||
      truck.specific_model_name?.toLowerCase().includes(value)
    );
  });

  const columns = [
    {
      title: 'Номерний знак',
      dataIndex: 'license_plate',
      key: 'license_plate',
      render: (text, record) => <Link to={`/trucks/${record.id}`}>{text}</Link>,
      sorter: (a, b) => a.license_plate.localeCompare(b.license_plate),
    },
    {
      title: 'Модель',
      dataIndex: 'specific_model_name',
      key: 'model',
    },
    {
      title: 'VIN (останні 7)',
      dataIndex: 'last_seven_vin',
      key: 'vin',
      render: (vin) => `${vin}`,
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => record.client ? <Link to={`/clients/${record.client.id}`}>{record.client.name}</Link> : '-',
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/trucks/${record.id}`)} />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/trucks/${record.id}/edit`)} />
          <Popconfirm title="Видалити вантажівку?" onConfirm={() => handleDelete(record.id)}>
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
        title="Вантажівки"
        extra={
          <Space>
            <Input
              placeholder="Пошук авто..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trucks/new')}>
              Додати авто
            </Button>
          </Space>
        }
      />
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTrucks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

export default TrucksPage;