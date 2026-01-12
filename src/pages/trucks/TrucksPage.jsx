import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, message, Popconfirm, Card, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { trucksAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components';
import { EURO_STANDARDS } from '../../utils/constants';

function TrucksPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrucks();
  }, [pagination.current, pagination.pageSize]);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const response = await trucksAPI.getAll({
        page: pagination.current,
        page_size: pagination.pageSize,
      });

      const data = response.results || response;
      setTrucks(Array.isArray(data) ? data : []);
      setPagination(prev => ({
        ...prev,
        total: response.count || data.length || 0,
      }));
    } catch (error) {
      console.error('Error fetching trucks:', error);
      message.error('Не вдалося завантажити список вантажівок');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await trucksAPI.delete(id);
      message.success('Вантажівку успішно видалено');
      fetchTrucks();
    } catch (error) {
      console.error('Error deleting truck:', error);
      message.error('Не вдалося видалити вантажівку');
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
      title: 'Номерний знак',
      dataIndex: 'license_plate',
      key: 'license_plate',
      sorter: (a, b) => (a.license_plate || '').localeCompare(b.license_plate || ''),
      ...getColumnSearchProps('license_plate', 'Пошук по номеру'),
      render: (text, record) => (
        <Link to={`/trucks/${record.id}`} style={{ fontWeight: 500 }}>
          {text || '-'}
        </Link>
      ),
    },
    {
      title: 'Модель',
      dataIndex: 'specific_model_name',
      key: 'model',
      ...getColumnSearchProps('specific_model_name', 'Пошук по моделі'),
    },
    {
      title: 'VIN (останні 7)',
      dataIndex: 'last_seven_vin',
      key: 'vin',
      ...getColumnSearchProps('last_seven_vin', 'Пошук по VIN'),
      render: (vin) => vin ? <code>...{vin}</code> : '-',
    },
    {
      title: 'Власник',
      dataIndex: 'client',
      key: 'client',
      render: (client) => client ? (
        <Link to={`/clients/${client.id || client}`}>
          {client.name || client}
        </Link>
      ) : '-',
    },
    {
      title: 'Євростандарт',
      dataIndex: 'euro_standard',
      key: 'euro',
      filters: Object.values(EURO_STANDARDS).map(e => ({ text: e.label, value: e.value })),
      onFilter: (value, record) => record.euro_standard === value,
      render: (euro) => euro ? (
        <Tag color="blue">{EURO_STANDARDS[euro]?.label || euro}</Tag>
      ) : '-',
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
            onClick={() => navigate(`/trucks/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/trucks/${record.id}/edit`)}
          />
          <Popconfirm
            title="Видалити вантажівку?"
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

  if (loading && trucks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Вантажівки"
        subtitle={`Всього: ${pagination.total}`}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/trucks/new')}
          >
            Додати вантажівку
          </Button>
        }
      />

      <Card>
        {trucks.length > 0 ? (
          <Table
            columns={columns}
            dataSource={trucks}
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
            description="Вантажівок поки немає"
            buttonText="Додати вантажівку"
            onButtonClick={() => navigate('/trucks/new')}
          />
        )}
      </Card>
    </div>
  );
}

export default TrucksPage;