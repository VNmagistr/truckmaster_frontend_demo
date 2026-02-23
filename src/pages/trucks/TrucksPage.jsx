import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';

function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrucks(pagination.current, searchText);
  }, [pagination.current]);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchText.length > 0 && searchText.length < 4) return;
        setPagination(prev => ({ ...prev, current: 1 }));
        fetchTrucks(1, searchText);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchTrucks = async (page, search) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 20,
        ordering: '-created_at',
      };
      
      if (search) params.search = search;

      const response = await trucksAPI.getAll(params);
      const data = response.data || response;
      
      setTrucks(data.results || []);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: data.count || 0,
      }));
    } catch (error) {
      message.error('Не вдалося завантажити вантажівки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await trucksAPI.delete(id);
      message.success('Вантажівку видалено');
      fetchTrucks(pagination.current, searchText);
    } catch (error) {
      message.error('Не вдалося видалити вантажівку');
    }
  };

  const handleRowClick = (record) => {
    navigate(`/trucks/${record.id}`);
  };

  const columns = [
    {
      title: 'Номерний знак',
      dataIndex: 'license_plate',
      key: 'license_plate',
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
      render: (vin) => vin || '-',
    },
    {
      title: 'Клієнт',
      dataIndex: ['client', 'name'],
      key: 'client',
      render: (text, record) => record.client ? (
        <a
          onClick={(e) => { e.stopPropagation(); navigate(`/clients/${record.client.id}`); }}
        >
          {record.client.name}
        </a>
      ) : '-',
    },
    {
      title: 'Дії',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle" onClick={(e) => e.stopPropagation()}>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/trucks/${record.id}`)} />
          <Button icon={<EditOutlined />} onClick={() => navigate(`/trucks/${record.id}/edit`)} />
          <Popconfirm title="Видалити вантажівку?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
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
          <Space>
            <Input
              placeholder="Пошук авто (номер, VIN)..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
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
          dataSource={trucks}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: 20,
            total: pagination.total,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`
          }}
          onChange={(newPagination) => setPagination(prev => ({ ...prev, current: newPagination.current }))}
          loading={loading}
          rowClassName="row-clickable"
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <style>{`
        .row-clickable:hover > td {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
}

export default TrucksPage;