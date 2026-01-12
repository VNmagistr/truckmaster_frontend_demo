import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, message, Tabs, Statistic, Row, Col, Input, DatePicker } from 'antd';
import { RobotOutlined, MessageOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { PageHeader, LoadingSpinner } from '../../components';
import { formatDateTime, formatPhone } from '../../utils/formatters';
import dayjs from 'dayjs';

function BotPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0,
    linkedClients: 0,
    todayMessages: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState(null);

  useEffect(() => {
    fetchBotData();
  }, [pagination.current, pagination.pageSize]);

  const fetchBotData = async () => {
    setLoading(true);
    try {
      const mockLogs = [
        {
          id: 1,
          chat_id: 123456789,
          user_name: 'Іван Петренко',
          phone_number: '+380501234567',
          message_text: '/start',
          bot_response: 'Вітаю! Я бот сервісного центру Iveco.',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          chat_id: 987654321,
          user_name: 'Олена Коваль',
          phone_number: '+380671234567',
          message_text: 'Мої автомобілі 🚚',
          bot_response: 'Ваші автомобілі в нашій системі...',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];

      setLogs(mockLogs);
      setPagination(prev => ({ ...prev, total: mockLogs.length }));
      
      setStats({
        totalMessages: 156,
        uniqueUsers: 42,
        linkedClients: 38,
        todayMessages: 12,
      });
    } catch (error) {
      console.error('Error fetching bot data:', error);
      message.error('Не вдалося завантажити дані бота');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  const filteredLogs = logs.filter(log => {
    if (searchText) {
      const search = searchText.toLowerCase();
      if (
        !log.user_name?.toLowerCase().includes(search) &&
        !log.phone_number?.includes(search) &&
        !log.message_text?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    
    if (dateFilter) {
      const logDate = dayjs(log.created_at).format('YYYY-MM-DD');
      const filterDate = dateFilter.format('YYYY-MM-DD');
      if (logDate !== filterDate) {
        return false;
      }
    }
    
    return true;
  });

  const logsColumns = [
    {
      title: 'Час',
      dataIndex: 'created_at',
      key: 'time',
      width: 160,
      render: (date) => formatDateTime(date),
    },
    {
      title: 'Користувач',
      dataIndex: 'user_name',
      key: 'user',
      width: 150,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name || 'Невідомий'}</div>
          {record.phone_number && (
            <div style={{ fontSize: 12, color: '#666' }}>
              {formatPhone(record.phone_number)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Chat ID',
      dataIndex: 'chat_id',
      key: 'chat_id',
      width: 120,
      render: (id) => <code>{id}</code>,
    },
    {
      title: 'Повідомлення',
      dataIndex: 'message_text',
      key: 'message',
      ellipsis: true,
      render: (text) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: 'Відповідь бота',
      dataIndex: 'bot_response',
      key: 'response',
      ellipsis: true,
      render: (text) => (
        <span style={{ color: '#666' }}>{text}</span>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'logs',
      label: (
        <span>
          <MessageOutlined />
          Логи повідомлень
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
            <Input.Search
              placeholder="Пошук по імені, телефону або тексту"
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <DatePicker
              placeholder="Фільтр по даті"
              value={dateFilter}
              onChange={setDateFilter}
              format="DD.MM.YYYY"
            />
          </div>
          
          <Table
            columns={logsColumns}
            dataSource={filteredLogs}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              total: filteredLogs.length,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} з ${total}`,
            }}
            onChange={handleTableChange}
            size="middle"
          />
        </div>
      ),
    },
    {
      key: 'settings',
      label: 'Налаштування',
      children: (
        <div style={{ padding: 20 }}>
          <Card title="Статус бота" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
              <span style={{ fontSize: 16 }}>Бот працює</span>
            </div>
            <div style={{ marginTop: 8, color: '#666' }}>
              Telegram бот підключено та обробляє повідомлення
            </div>
          </Card>
          
          <Card title="Команди бота">
            <Table
              dataSource={[
                { command: '/start', description: 'Початок роботи, реєстрація' },
                { command: 'Мої автомобілі 🚚', description: 'Показати список автомобілів клієнта' },
                { command: 'Перевірити статус замовлення 🧾', description: 'Перевірити статус по номеру' },
              ]}
              columns={[
                { title: 'Команда', dataIndex: 'command', key: 'command', render: (t) => <code>{t}</code> },
                { title: 'Опис', dataIndex: 'description', key: 'description' },
              ]}
              rowKey="command"
              pagination={false}
              size="small"
            />
          </Card>
        </div>
      ),
    },
  ];

  if (loading && logs.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Telegram Бот"
        subtitle="Керування та моніторинг бота"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всього повідомлень"
              value={stats.totalMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Унікальних користувачів"
              value={stats.uniqueUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Прив'язаних клієнтів"
              value={stats.linkedClients}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Повідомлень сьогодні"
              value={stats.todayMessages}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}

export default BotPage;