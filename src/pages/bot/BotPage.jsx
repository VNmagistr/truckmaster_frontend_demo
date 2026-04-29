import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Statistic, Table, Tag, Button, Space, Input,
  Select, Modal, Form, Switch, Tabs, message, Tooltip, Avatar, Popconfirm,
} from 'antd';
import {
  RobotOutlined, UserOutlined, TeamOutlined, StopOutlined,
  MessageOutlined, ArrowDownOutlined, ArrowUpOutlined,
  EditOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PlusOutlined, QuestionCircleOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { botAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { formatDateTime, formatPhone } from '../../utils/formatters';

const ROLE_OPTIONS = [
  { value: 'guest',  label: 'Гість' },
  { value: 'driver', label: 'Водій' },
  { value: 'owner',  label: 'Власник' },
  { value: 'admin',  label: 'Адміністратор' },
];

const roleTag = (role) => {
  const map = {
    guest:  { color: 'default', label: 'Гість' },
    driver: { color: 'cyan',    label: 'Водій' },
    owner:  { color: 'blue',    label: 'Власник' },
    admin:  { color: 'gold',    label: 'Адміністратор' },
  };
  const { color, label } = map[role] || { color: 'default', label: role };
  return <Tag color={color}>{label}</Tag>;
};

function BotPage() {
  const navigate = useNavigate();
  const [statsLoading, setStatsLoading]     = useState(true);
  const [stats, setStats]                   = useState({ total: 0, by_role: {}, active: 0, blocked: 0 });
  const [moduleUnavailable, setModuleUnavailable] = useState(false);

  // ── Вкладка "Користувачі" ────────────────────────────────────────────────
  const [usersLoading, setUsersLoading]     = useState(false);
  const [users, setUsers]                   = useState([]);
  const [usersTotal, setUsersTotal]         = useState(0);
  const [usersPage, setUsersPage]           = useState(1);
  const [userSearch, setUserSearch]         = useState('');
  const [roleFilter, setRoleFilter]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('');

  // ── Модальне вікно редагування ───────────────────────────────────────────
  const [editModalOpen, setEditModalOpen]     = useState(false);
  const [editingUser, setEditingUser]         = useState(null);
  const [editForm]                            = Form.useForm();
  const [clients, setClients]                 = useState([]);
  const [clientsLoading, setClientsLoading]   = useState(false);
  const [saving, setSaving]                   = useState(false);

  // ── Модальне вікно створення ──────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm]                          = Form.useForm();
  const [creating, setCreating]               = useState(false);
  const [createRole, setCreateRole]           = useState('guest');

  // ── Поточна роль у формі редагування ─────────────────────────────────────
  const [editRole, setEditRole]               = useState('guest');

  // ── Вантажівки для select водія ───────────────────────────────────────────
  const [trucks, setTrucks]                   = useState([]);
  const [trucksLoading, setTrucksLoading]     = useState(false);

  // ── Вкладка "Журнал" ─────────────────────────────────────────────────────
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesList, setMessagesList]       = useState([]);
  const [messagesTotal, setMessagesTotal]     = useState(0);
  const [messagesPage, setMessagesPage]       = useState(1);
  const [messageSearch, setMessageSearch]     = useState('');
  const [directionFilter, setDirectionFilter] = useState('');

  // ── Вкладка "Невідомі номери" ────────────────────────────────────────────
  const [unknownLoading, setUnknownLoading] = useState(false);
  const [unknownList, setUnknownList]       = useState([]);
  const [unknownTotal, setUnknownTotal]     = useState(0);
  const [unknownPage, setUnknownPage]       = useState(1);
  const [unknownSearch, setUnknownSearch]   = useState('');
  const [editNotesId, setEditNotesId]       = useState(null);
  const [editNotesValue, setEditNotesValue] = useState('');

  const [activeTab, setActiveTab] = useState('users');

  // ── Статистика ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await botAPI.getStatistics();
      const data = res.data || res;
      setStats(data);
    } catch (err) {
      if (err.isModuleUnavailable) { setModuleUnavailable(true); return; }
      message.error('Не вдалося завантажити статистику');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Користувачі ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, search = userSearch) => {
    setUsersLoading(true);
    try {
      const params = { page, page_size: 20, ordering: '-last_activity' };
      if (search)                      params.search     = search;
      if (roleFilter)                  params.role       = roleFilter;
      if (statusFilter === 'blocked')  params.is_blocked = true;
      if (statusFilter === 'inactive') params.is_active  = false;

      const res  = await botAPI.getUsers(params);
      const data = res.data || res;
      setUsers(data.results || []);
      setUsersTotal(data.count || 0);
      setUsersPage(page);
    } catch {
      message.error('Не вдалося завантажити користувачів');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, roleFilter, statusFilter]);

  // ── Журнал повідомлень ────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (page = 1, search = messageSearch) => {
    setMessagesLoading(true);
    try {
      const params = { page, page_size: 20, ordering: '-created_at' };
      if (search)                         params.search      = search;
      if (directionFilter === 'incoming') params.is_incoming = true;
      if (directionFilter === 'outgoing') params.is_incoming = false;

      const res  = await botAPI.getMessages(params);
      const data = res.data || res;
      setMessagesList(data.results || []);
      setMessagesTotal(data.count || 0);
      setMessagesPage(page);
    } catch {
      message.error('Не вдалося завантажити повідомлення');
    } finally {
      setMessagesLoading(false);
    }
  }, [messageSearch, directionFilter]);

  // ── Невідомі номери ───────────────────────────────────────────────────────
  const fetchUnknownPlates = useCallback(async (page = 1, search = unknownSearch) => {
    setUnknownLoading(true);
    try {
      const params = { page, page_size: 20, ordering: '-last_searched_at' };
      if (search) params.search = search;
      const res  = await botAPI.getUnknownPlates(params);
      const data = res.data || res;
      setUnknownList(data.results || []);
      setUnknownTotal(data.count || 0);
      setUnknownPage(page);
    } catch {
      message.error('Не вдалося завантажити список невідомих номерів');
    } finally {
      setUnknownLoading(false);
    }
  }, [unknownSearch]);

  const handleAddUnknownToBase = (row) => {
    navigate(`/trucks/new?license_plate=${encodeURIComponent(row.plate)}&unknown_plate_id=${row.id}`);
  };

  const handleDeleteUnknown = async (row) => {
    try {
      await botAPI.deleteUnknownPlate(row.id);
      message.success('Видалено зі списку');
      fetchUnknownPlates(unknownPage);
    } catch {
      message.error('Не вдалося видалити');
    }
  };

  const handleSaveNotes = async (row) => {
    try {
      await botAPI.updateUnknownPlate(row.id, { notes: editNotesValue });
      message.success('Нотатку збережено');
      setEditNotesId(null);
      fetchUnknownPlates(unknownPage);
    } catch {
      message.error('Не вдалося зберегти');
    }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users')    fetchUsers(1);
    if (activeTab === 'messages') fetchMessages(1);
    if (activeTab === 'unknown')  fetchUnknownPlates(1);
  }, [activeTab, roleFilter, statusFilter, directionFilter]);

  // ── Клієнти для select власника ───────────────────────────────────────────
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const res  = await clientsAPI.getAll({ page_size: 500 });
      const data = res.data || res;
      setClients(data.results || []);
    } finally {
      setClientsLoading(false);
    }
  };

  // ── Вантажівки для select водія ───────────────────────────────────────────
  const loadTrucks = async () => {
    setTrucksLoading(true);
    try {
      const res  = await trucksAPI.getAll({ page_size: 1000 });
      const data = res.data || res;
      setTrucks(data.results || []);
    } finally {
      setTrucksLoading(false);
    }
  };

  // Завантажуємо список клієнтів або вантажівок залежно від ролі
  const ensureDataForRole = (role) => {
    if (role === 'owner'  && clients.length === 0) loadClients();
    if (role === 'driver' && trucks.length  === 0) loadTrucks();
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    editForm.setFieldsValue({
      role:            user.role,
      client:          user.client          || null,
      assigned_trucks: user.assigned_trucks || [],
      is_active:       user.is_active,
      is_blocked:      user.is_blocked,
    });
    setEditModalOpen(true);
    ensureDataForRole(user.role);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const values = await editForm.validateFields();
      // Очищаємо поле прив'язки що не відповідає ролі
      if (values.role === 'driver') {
        values.client = null;
      } else {
        values.assigned_trucks = [];
      }
      await botAPI.updateUser(editingUser.id, values);
      message.success('Збережено');
      setEditModalOpen(false);
      fetchUsers(usersPage);
      fetchStats();
    } catch {
      message.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    createForm.resetFields();
    setCreateRole('guest');
    setCreateModalOpen(true);
  };

  const handleCreateSave = async () => {
    setCreating(true);
    try {
      const values = await createForm.validateFields();
      if (values.username) values.username = values.username.replace(/^@/, '');
      // Очищаємо поле прив'язки що не відповідає ролі
      if (values.role === 'driver') {
        values.client = null;
      } else {
        values.assigned_trucks = [];
      }
      await botAPI.createUser(values);
      message.success('Користувача додано');
      setCreateModalOpen(false);
      fetchUsers(1);
      fetchStats();
    } catch (err) {
      if (err?.response?.data?.telegram_id) {
        message.error('Користувач з таким Telegram ID вже існує');
      } else if (err?.errorFields) {
        // валідація форми — antd підсвічує поля автоматично
      } else {
        message.error('Не вдалося створити користувача');
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleBlock = async (user) => {
    try {
      await botAPI.updateUser(user.id, { is_blocked: !user.is_blocked });
      message.success(user.is_blocked ? 'Розблоковано' : 'Заблоковано');
      fetchUsers(usersPage);
      fetchStats();
    } catch {
      message.error('Не вдалося змінити статус');
    }
  };

  // ── Колонки таблиці користувачів ─────────────────────────────────────────
  const usersColumns = [
    {
      title: 'Користувач',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{
              backgroundColor:
                r.role === 'admin'  ? '#faad14' :
                r.role === 'owner'  ? '#1890ff' :
                r.role === 'driver' ? '#13c2c2' : '#aaa',
            }}
          />
          <div>
            <div style={{ fontWeight: 500, lineHeight: 1.3 }}>
              {r.first_name || ''} {r.last_name || ''}
              {!r.first_name && !r.last_name && (
                <span style={{ color: '#aaa' }}>Без імені</span>
              )}
            </div>
            {r.username && (
              <div style={{ fontSize: 11, color: '#888' }}>@{r.username}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Telegram ID',
      dataIndex: 'telegram_id',
      key: 'telegram_id',
      render: (v) => (
        <code style={{ fontSize: 11, background: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>
          {v}
        </code>
      ),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_number',
      key: 'phone',
      render: (v) => v ? formatPhone(v) : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: roleTag,
    },
    {
      title: 'Клієнт',
      dataIndex: 'client_name',
      key: 'client',
      render: (v) => v || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Остання активність',
      dataIndex: 'last_activity',
      key: 'last_activity',
      render: (v) => v ? formatDateTime(v) : '—',
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, r) => {
        if (r.is_blocked) return <Tag color="red"     icon={<StopOutlined />}>Заблокований</Tag>;
        if (r.is_active)  return <Tag color="green"   icon={<CheckCircleOutlined />}>Активний</Tag>;
        return                   <Tag color="default" icon={<CloseCircleOutlined />}>Неактивний</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Редагувати">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
          </Tooltip>
          <Tooltip title={r.is_blocked ? 'Розблокувати' : 'Заблокувати'}>
            <Button
              size="small"
              danger={!r.is_blocked}
              type={r.is_blocked ? 'default' : 'text'}
              icon={<StopOutlined />}
              onClick={() => toggleBlock(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Колонки таблиці невідомих номерів ─────────────────────────────────────
  const unknownColumns = [
    {
      title: 'Номер',
      dataIndex: 'plate',
      key: 'plate',
      width: 140,
      render: (v) => (
        <code style={{ fontSize: 13, fontWeight: 600, background: '#fffbe6',
                       padding: '2px 8px', borderRadius: 3, border: '1px solid #ffe58f' }}>
          {v}
        </code>
      ),
    },
    {
      title: 'К-ть пошуків',
      dataIndex: 'search_count',
      key: 'search_count',
      width: 120,
      render: (v) => <Tag color={v > 1 ? 'orange' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Останній пошук',
      dataIndex: 'last_searched_at',
      key: 'last_searched_at',
      width: 150,
      render: (v) => v ? formatDateTime(v) : '—',
    },
    {
      title: 'Хто шукав',
      dataIndex: 'last_searched_by_name',
      key: 'last_searched_by_name',
      width: 160,
      render: (v) => v || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Нотатка',
      dataIndex: 'notes',
      key: 'notes',
      render: (v, r) => editNotesId === r.id ? (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="small"
            value={editNotesValue}
            onChange={(e) => setEditNotesValue(e.target.value)}
            onPressEnter={() => handleSaveNotes(r)}
            autoFocus
          />
          <Button size="small" type="primary" onClick={() => handleSaveNotes(r)}>OK</Button>
          <Button size="small" onClick={() => setEditNotesId(null)}>×</Button>
        </Space.Compact>
      ) : (
        <span
          style={{ cursor: 'pointer', color: v ? undefined : '#ccc' }}
          onClick={() => { setEditNotesId(r.id); setEditNotesValue(v || ''); }}
          title="Натисніть, щоб редагувати"
        >
          {v || '— додати нотатку —'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 280,
      render: (_, r) => (
        <Space size={4}>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddUnknownToBase(r)}
          >
            Додати в базу
          </Button>
          <Popconfirm
            title="Видалити номер зі списку?"
            okText="Так"
            cancelText="Ні"
            onConfirm={() => handleDeleteUnknown(r)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Видалити
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Колонки таблиці журналу ───────────────────────────────────────────────
  const messagesColumns = [
    {
      title: 'Час',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v) => formatDateTime(v),
    },
    {
      title: 'Користувач',
      dataIndex: 'bot_user_name',
      key: 'user',
      width: 160,
      render: (v) => v || '—',
    },
    {
      title: 'Напрямок',
      dataIndex: 'is_incoming',
      key: 'direction',
      width: 130,
      render: (v) => v
        ? <Tag color="green" icon={<ArrowDownOutlined />}>Від юзера</Tag>
        : <Tag color="blue"  icon={<ArrowUpOutlined />}>Від бота</Tag>,
    },
    {
      title: 'Повідомлення',
      dataIndex: 'message_text',
      key: 'message',
      render: (v) => v
        ? <span title={v.length > 120 ? v : undefined}>{v.length > 120 ? v.slice(0, 120) + '…' : v}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Відповідь бота',
      dataIndex: 'bot_response',
      key: 'response',
      render: (v) => v
        ? <span title={v.length > 120 ? v : undefined}>{v.length > 120 ? v.slice(0, 120) + '…' : v}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
  ];

  const editingName = editingUser
    ? (`${editingUser.first_name || ''} ${editingUser.last_name || ''}`.trim() || `ID ${editingUser.telegram_id}`)
    : '';

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Telegram бот" />;

  return (
    <div>
      <PageHeader title="Telegram бот" />

      {/* ── Статистика ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { title: 'Всього',      value: stats.total,               icon: <TeamOutlined />,  color: undefined },
          { title: 'Власники',    value: stats.by_role?.owner  || 0, icon: <UserOutlined />,  color: '#1890ff' },
          { title: 'Водії',       value: stats.by_role?.driver || 0, icon: <TeamOutlined />,  color: '#13c2c2' },
          { title: 'Гості',       value: stats.by_role?.guest  || 0, icon: <RobotOutlined />, color: '#888' },
          { title: 'Заблоковані', value: stats.blocked         || 0, icon: <StopOutlined />,  color: stats.blocked > 0 ? '#ff4d4f' : undefined },
        ].map(({ title, value, icon, color }) => (
          <div key={title} style={{ flex: '1 1 160px', minWidth: 140 }}>
            <Card loading={statsLoading}>
              <Statistic title={title} value={value} prefix={icon} valueStyle={color ? { color } : undefined} />
            </Card>
          </div>
        ))}
      </div>

      {/* ── Вкладки ────────────────────────────────────────────────────────── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          // ── Користувачі ─────────────────────────────────────────────────
          {
            key: 'users',
            label: <span><TeamOutlined /> Користувачі</span>,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder="Ім'я, @username, телефон..."
                    style={{ width: 250 }}
                    allowClear
                    onSearch={(v) => { setUserSearch(v); fetchUsers(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setUserSearch(''); fetchUsers(1, ''); }
                    }}
                  />
                  <Select
                    placeholder="Роль"
                    style={{ width: 130 }}
                    allowClear
                    options={ROLE_OPTIONS}
                    onChange={(v) => setRoleFilter(v || '')}
                  />
                  <Select
                    placeholder="Статус"
                    style={{ width: 150 }}
                    allowClear
                    options={[
                      { value: 'blocked',  label: 'Заблоковані' },
                      { value: 'inactive', label: 'Неактивні' },
                    ]}
                    onChange={(v) => setStatusFilter(v || '')}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(1)}>
                    Оновити
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Додати користувача
                  </Button>
                </Space>

                <Table
                  dataSource={users}
                  columns={usersColumns}
                  rowKey="id"
                  loading={usersLoading}
                  size="small"
                  pagination={{
                    current: usersPage,
                    pageSize: 20,
                    total: usersTotal,
                    onChange: (page) => fetchUsers(page),
                    showTotal: (total) => `Всього: ${total}`,
                    showSizeChanger: false,
                  }}
                />
              </>
            ),
          },

          // ── Журнал повідомлень ───────────────────────────────────────────
          {
            key: 'messages',
            label: <span><MessageOutlined /> Журнал повідомлень</span>,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder="Текст повідомлення..."
                    style={{ width: 280 }}
                    allowClear
                    onSearch={(v) => { setMessageSearch(v); fetchMessages(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setMessageSearch(''); fetchMessages(1, ''); }
                    }}
                  />
                  <Select
                    placeholder="Напрямок"
                    style={{ width: 170 }}
                    allowClear
                    options={[
                      { value: 'incoming', label: 'Від користувача' },
                      { value: 'outgoing', label: 'Від бота' },
                    ]}
                    onChange={(v) => setDirectionFilter(v || '')}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchMessages(1)}>
                    Оновити
                  </Button>
                </Space>

                <Table
                  dataSource={messagesList}
                  columns={messagesColumns}
                  rowKey="id"
                  loading={messagesLoading}
                  size="small"
                  pagination={{
                    current: messagesPage,
                    pageSize: 20,
                    total: messagesTotal,
                    onChange: (page) => fetchMessages(page),
                    showTotal: (total) => `Всього: ${total}`,
                    showSizeChanger: false,
                  }}
                />
              </>
            ),
          },

          // ── Невідомі номери ──────────────────────────────────────────────
          {
            key: 'unknown',
            label: <span><QuestionCircleOutlined /> Невідомі номери</span>,
            children: (
              <>
                <div style={{ marginBottom: 12, color: '#888', fontSize: 13 }}>
                  Сюди потрапляють номери, які адміністратор шукав через бот, але вони не знайдені в базі.
                </div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder="Номер або нотатка..."
                    style={{ width: 280 }}
                    allowClear
                    onSearch={(v) => { setUnknownSearch(v); fetchUnknownPlates(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setUnknownSearch(''); fetchUnknownPlates(1, ''); }
                    }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchUnknownPlates(1)}>
                    Оновити
                  </Button>
                </Space>

                <Table
                  dataSource={unknownList}
                  columns={unknownColumns}
                  rowKey="id"
                  loading={unknownLoading}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: unknownPage,
                    pageSize: 20,
                    total: unknownTotal,
                    onChange: (page) => fetchUnknownPlates(page),
                    showTotal: (total) => `Всього: ${total}`,
                    showSizeChanger: false,
                  }}
                />
              </>
            ),
          },
        ]}
      />

      {/* ── Модалка створення користувача ──────────────────────────────────── */}
      <Modal
        title="Додати користувача бота"
        open={createModalOpen}
        onOk={handleCreateSave}
        onCancel={() => setCreateModalOpen(false)}
        okText="Додати"
        cancelText="Скасувати"
        confirmLoading={creating}
        width={520}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 8 }}
          initialValues={{ role: 'guest', is_active: true, is_blocked: false }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="telegram_id"
                label="Telegram ID"
                rules={[
                  { required: true, message: 'Обов\'язкове поле' },
                  { pattern: /^\d+$/, message: 'Тільки цифри' },
                ]}
                extra="Числовий ID з Telegram (не username)"
              >
                <Input placeholder="123456789" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="username" label="Username">
                <Input placeholder="ivan_ivanov" prefix="@" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="Ім'я">
                <Input placeholder="Іван" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Прізвище">
                <Input placeholder="Іваненко" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="phone_number" label="Номер телефону">
            <Input placeholder="+380501234567" />
          </Form.Item>

          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={ROLE_OPTIONS}
              onChange={(v) => { setCreateRole(v); ensureDataForRole(v); }}
            />
          </Form.Item>

          {createRole === 'owner' && (
            <Form.Item
              name="client"
              label="Власник (клієнт)"
              rules={[{ required: true, message: 'Оберіть клієнта для ролі Власник' }]}
            >
              <Select
                showSearch
                allowClear
                loading={clientsLoading}
                placeholder="Оберіть клієнта зі списку"
                optionFilterProp="label"
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}

          {createRole === 'driver' && (
            <Form.Item
              name="assigned_trucks"
              label="Автомобілі водія"
              rules={[{ required: true, message: 'Оберіть хоча б один автомобіль' }]}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                loading={trucksLoading}
                placeholder="Оберіть автомобіль(і)"
                optionFilterProp="label"
                options={trucks.map((t) => ({
                  value: t.id,
                  label: `${t.license_plate}${t.specific_model_name ? ` — ${t.specific_model_name}` : ''}${t.client?.name ? ` (${t.client.name})` : ''}`,
                }))}
              />
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="is_active" label="Активний" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_blocked" label="Заблокований" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Модалка редагування користувача ────────────────────────────────── */}
      <Modal
        title={`Редагувати — ${editingName}`}
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        confirmLoading={saving}
        width={480}
        destroyOnClose
      >
        {editingUser && (
          <div style={{
            marginBottom: 16, padding: '10px 12px',
            background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#555',
          }}>
            <Space wrap>
              <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#1890ff' }} />
              <span>Telegram ID: <strong>{editingUser.telegram_id}</strong></span>
              {editingUser.username && <span>@{editingUser.username}</span>}
              {editingUser.phone_number && <span>{formatPhone(editingUser.phone_number)}</span>}
            </Space>
          </div>
        )}

        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Оберіть роль' }]}>
            <Select
              options={ROLE_OPTIONS}
              onChange={(v) => { setEditRole(v); ensureDataForRole(v); }}
            />
          </Form.Item>

          {editRole === 'owner' && (
            <Form.Item
              name="client"
              label="Власник (клієнт)"
              rules={[{ required: true, message: 'Оберіть клієнта для ролі Власник' }]}
            >
              <Select
                showSearch
                allowClear
                loading={clientsLoading}
                placeholder="Оберіть клієнта зі списку"
                optionFilterProp="label"
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}

          {editRole === 'driver' && (
            <Form.Item
              name="assigned_trucks"
              label="Автомобілі водія"
              rules={[{ required: true, message: 'Оберіть хоча б один автомобіль' }]}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                loading={trucksLoading}
                placeholder="Оберіть автомобіль(і)"
                optionFilterProp="label"
                options={trucks.map((t) => ({
                  value: t.id,
                  label: `${t.license_plate}${t.specific_model_name ? ` — ${t.specific_model_name}` : ''}${t.client?.name ? ` (${t.client.name})` : ''}`,
                }))}
              />
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="is_active" label="Активний" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_blocked" label="Заблокований" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

export default BotPage;
