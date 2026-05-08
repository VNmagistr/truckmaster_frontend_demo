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
import { useTranslation } from 'react-i18next';
import { botAPI, clientsAPI, trucksAPI } from '../../api';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import { formatDateTime, formatPhone } from '../../utils/formatters';

function BotPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const ROLE_OPTIONS = [
    { value: 'guest',  label: t('bot.roleGuest') },
    { value: 'driver', label: t('bot.roleDriver') },
    { value: 'owner',  label: t('bot.roleOwner') },
    { value: 'admin',  label: t('bot.roleAdmin') },
  ];

  const roleTag = (role) => {
    const map = {
      guest:  { color: 'default', label: t('bot.roleGuest') },
      driver: { color: 'cyan',    label: t('bot.roleDriver') },
      owner:  { color: 'blue',    label: t('bot.roleOwner') },
      admin:  { color: 'gold',    label: t('bot.roleAdmin') },
    };
    const { color, label } = map[role] || { color: 'default', label: role };
    return <Tag color={color}>{label}</Tag>;
  };
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
      message.error(t('bot.statsError'));
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
      message.error(t('bot.usersError'));
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
      message.error(t('bot.messagesError'));
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
      message.error(t('bot.unknownPlatesError'));
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
      message.success(t('bot.deleteSuccess'));
      fetchUnknownPlates(unknownPage);
    } catch {
      message.error(t('bot.deleteError'));
    }
  };

  const handleSaveNotes = async (row) => {
    try {
      await botAPI.updateUnknownPlate(row.id, { notes: editNotesValue });
      message.success(t('bot.noteSaved'));
      setEditNotesId(null);
      fetchUnknownPlates(unknownPage);
    } catch {
      message.error(t('bot.noteSaveError'));
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
      message.success(t('bot.userSaved'));
      setEditModalOpen(false);
      fetchUsers(usersPage);
      fetchStats();
    } catch {
      message.error(t('bot.userSaveError'));
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
      message.success(t('bot.userAdded'));
      setCreateModalOpen(false);
      fetchUsers(1);
      fetchStats();
    } catch (err) {
      if (err?.response?.data?.telegram_id) {
        message.error(t('bot.userExistsError'));
      } else if (err?.errorFields) {
        // валідація форми — antd підсвічує поля автоматично
      } else {
        message.error(t('bot.userAddError'));
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleBlock = async (user) => {
    try {
      await botAPI.updateUser(user.id, { is_blocked: !user.is_blocked });
      message.success(user.is_blocked ? t('bot.unblocked') : t('bot.blocked'));
      fetchUsers(usersPage);
      fetchStats();
    } catch {
      message.error(t('bot.blockError'));
    }
  };

  // ── Колонки таблиці користувачів ─────────────────────────────────────────
  const usersColumns = [
    {
      title: t('bot.userColumn'),
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
                <span style={{ color: '#aaa' }}>{t('bot.noName')}</span>
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
      title: t('bot.telegramId'),
      dataIndex: 'telegram_id',
      key: 'telegram_id',
      render: (v) => (
        <code style={{ fontSize: 11, background: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>
          {v}
        </code>
      ),
    },
    {
      title: t('common.phone'),
      dataIndex: 'phone_number',
      key: 'phone',
      render: (v) => v ? formatPhone(v) : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: t('bot.roleColumn'),
      dataIndex: 'role',
      key: 'role',
      render: roleTag,
    },
    {
      title: t('bot.clientColumn'),
      dataIndex: 'client_name',
      key: 'client',
      render: (v) => v || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: t('bot.lastActivity'),
      dataIndex: 'last_activity',
      key: 'last_activity',
      render: (v) => v ? formatDateTime(v) : '—',
    },
    {
      title: t('common.status'),
      key: 'status',
      render: (_, r) => {
        if (r.is_blocked) return <Tag color="red"     icon={<StopOutlined />}>{t('bot.statusBlocked')}</Tag>;
        if (r.is_active)  return <Tag color="green"   icon={<CheckCircleOutlined />}>{t('bot.statusActive')}</Tag>;
        return                   <Tag color="default" icon={<CloseCircleOutlined />}>{t('bot.statusInactive')}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title={t('common.edit')}>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
          </Tooltip>
          <Tooltip title={r.is_blocked ? t('bot.unblock') : t('bot.block')}>
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
      title: t('bot.plateNumber'),
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
      title: t('bot.searchCount'),
      dataIndex: 'search_count',
      key: 'search_count',
      width: 120,
      render: (v) => <Tag color={v > 1 ? 'orange' : 'default'}>{v}</Tag>,
    },
    {
      title: t('bot.lastSearch'),
      dataIndex: 'last_searched_at',
      key: 'last_searched_at',
      width: 150,
      render: (v) => v ? formatDateTime(v) : '—',
    },
    {
      title: t('bot.searchedBy'),
      dataIndex: 'last_searched_by_name',
      key: 'last_searched_by_name',
      width: 160,
      render: (v) => v || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: t('bot.note'),
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
          title={t('bot.editNoteTooltip')}
        >
          {v || t('bot.addNote')}
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
            {t('bot.addToDatabase')}
          </Button>
          <Popconfirm
            title={t('bot.deletePlateConfirm')}
            okText={t('common.yes')}
            cancelText={t('common.no')}
            onConfirm={() => handleDeleteUnknown(r)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Колонки таблиці журналу ───────────────────────────────────────────────
  const messagesColumns = [
    {
      title: t('bot.messageTime'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v) => formatDateTime(v),
    },
    {
      title: t('bot.messageUser'),
      dataIndex: 'bot_user_name',
      key: 'user',
      width: 160,
      render: (v) => v || '—',
    },
    {
      title: t('bot.messageDirection'),
      dataIndex: 'is_incoming',
      key: 'direction',
      width: 130,
      render: (v) => v
        ? <Tag color="green" icon={<ArrowDownOutlined />}>{t('bot.fromUser')}</Tag>
        : <Tag color="blue"  icon={<ArrowUpOutlined />}>{t('bot.fromBot')}</Tag>,
    },
    {
      title: t('bot.messageText'),
      dataIndex: 'message_text',
      key: 'message',
      render: (v) => v
        ? <span title={v.length > 120 ? v : undefined}>{v.length > 120 ? v.slice(0, 120) + '…' : v}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: t('bot.botResponse'),
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

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName={t('bot.title')} />;

  return (
    <div>
      <PageHeader title={t('bot.title')} />

      {/* ── Статистика ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { title: t('bot.statsTotal'),   value: stats.total,               icon: <TeamOutlined />,  color: undefined },
          { title: t('bot.statsOwners'),  value: stats.by_role?.owner  || 0, icon: <UserOutlined />,  color: '#1890ff' },
          { title: t('bot.statsDrivers'), value: stats.by_role?.driver || 0, icon: <TeamOutlined />,  color: '#13c2c2' },
          { title: t('bot.statsGuests'),  value: stats.by_role?.guest  || 0, icon: <RobotOutlined />, color: '#888' },
          { title: t('bot.statsBlocked'), value: stats.blocked         || 0, icon: <StopOutlined />,  color: stats.blocked > 0 ? '#ff4d4f' : undefined },
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
            label: <span><TeamOutlined /> {t('bot.usersTab')}</span>,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder={t('bot.searchPlaceholder')}
                    style={{ width: 250 }}
                    allowClear
                    onSearch={(v) => { setUserSearch(v); fetchUsers(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setUserSearch(''); fetchUsers(1, ''); }
                    }}
                  />
                  <Select
                    placeholder={t('bot.filterRole')}
                    style={{ width: 130 }}
                    allowClear
                    options={ROLE_OPTIONS}
                    onChange={(v) => setRoleFilter(v || '')}
                  />
                  <Select
                    placeholder={t('bot.filterStatus')}
                    style={{ width: 150 }}
                    allowClear
                    options={[
                      { value: 'blocked',  label: t('bot.filterBlocked') },
                      { value: 'inactive', label: t('bot.filterInactive') },
                    ]}
                    onChange={(v) => setStatusFilter(v || '')}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(1)}>
                    {t('common.refresh')}
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    {t('bot.addUser')}
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
                    showTotal: (total) => `${t('common.total')}: ${total}`,
                    showSizeChanger: false,
                  }}
                />
              </>
            ),
          },

          // ── Журнал повідомлень ───────────────────────────────────────────
          {
            key: 'messages',
            label: <span><MessageOutlined /> {t('bot.messagesTab')}</span>,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder={t('bot.messageSearch')}
                    style={{ width: 280 }}
                    allowClear
                    onSearch={(v) => { setMessageSearch(v); fetchMessages(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setMessageSearch(''); fetchMessages(1, ''); }
                    }}
                  />
                  <Select
                    placeholder={t('bot.directionFilter')}
                    style={{ width: 170 }}
                    allowClear
                    options={[
                      { value: 'incoming', label: t('bot.directionFromUser') },
                      { value: 'outgoing', label: t('bot.directionFromBot') },
                    ]}
                    onChange={(v) => setDirectionFilter(v || '')}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchMessages(1)}>
                    {t('common.refresh')}
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
                    showTotal: (total) => `${t('common.total')}: ${total}`,
                    showSizeChanger: false,
                  }}
                />
              </>
            ),
          },

          // ── Невідомі номери ──────────────────────────────────────────────
          {
            key: 'unknown',
            label: <span><QuestionCircleOutlined /> {t('bot.unknownPlatesTab')}</span>,
            children: (
              <>
                <div style={{ marginBottom: 12, color: '#888', fontSize: 13 }}>
                  {t('bot.unknownPlatesDesc')}
                </div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder={t('bot.unknownPlatesSearch')}
                    style={{ width: 280 }}
                    allowClear
                    onSearch={(v) => { setUnknownSearch(v); fetchUnknownPlates(1, v); }}
                    onChange={(e) => {
                      if (!e.target.value) { setUnknownSearch(''); fetchUnknownPlates(1, ''); }
                    }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => fetchUnknownPlates(1)}>
                    {t('common.refresh')}
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
                    showTotal: (total) => `${t('common.total')}: ${total}`,
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
        title={t('bot.addUserTitle')}
        open={createModalOpen}
        onOk={handleCreateSave}
        onCancel={() => setCreateModalOpen(false)}
        okText={t('common.add')}
        cancelText={t('common.cancel')}
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
                label={t('bot.telegramIdLabel')}
                rules={[
                  { required: true, message: t('common.required') },
                  { pattern: /^\d+$/, message: t('bot.onlyDigits') },
                ]}
                extra={t('bot.telegramIdHelp')}
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
              <Form.Item name="first_name" label={t('bot.firstName')}>
                <Input placeholder="Іван" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label={t('bot.lastName')}>
                <Input placeholder="Іваненко" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="phone_number" label={t('common.phone')}>
            <Input placeholder="+380501234567" />
          </Form.Item>

          <Form.Item name="role" label={t('bot.filterRole')} rules={[{ required: true }]}>
            <Select
              options={ROLE_OPTIONS}
              onChange={(v) => { setCreateRole(v); ensureDataForRole(v); }}
            />
          </Form.Item>

          {createRole === 'owner' && (
            <Form.Item
              name="client"
              label={t('bot.ownerClient')}
              rules={[{ required: true, message: t('bot.selectClientForOwner') }]}
            >
              <Select
                showSearch
                allowClear
                loading={clientsLoading}
                placeholder={t('bot.selectClient')}
                optionFilterProp="label"
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}

          {createRole === 'driver' && (
            <Form.Item
              name="assigned_trucks"
              label={t('bot.driverTrucks')}
              rules={[{ required: true, message: t('bot.selectAtLeastOneTruck') }]}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                loading={trucksLoading}
                placeholder={t('bot.selectTrucks')}
                optionFilterProp="label"
                options={trucks.map((tr) => ({
                  value: tr.id,
                  label: `${tr.license_plate}${tr.specific_model_name ? ` — ${tr.specific_model_name}` : ''}${tr.client?.name ? ` (${tr.client.name})` : ''}`,
                }))}
              />
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="is_active" label={t('bot.isActiveCheckbox')} valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_blocked" label={t('bot.isBlockedCheckbox')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Модалка редагування користувача ────────────────────────────────── */}
      <Modal
        title={t('bot.editUser', { name: editingName })}
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
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
          <Form.Item name="role" label={t('bot.filterRole')} rules={[{ required: true, message: t('bot.selectRole') }]}>
            <Select
              options={ROLE_OPTIONS}
              onChange={(v) => { setEditRole(v); ensureDataForRole(v); }}
            />
          </Form.Item>

          {editRole === 'owner' && (
            <Form.Item
              name="client"
              label={t('bot.ownerClient')}
              rules={[{ required: true, message: t('bot.selectClientForOwner') }]}
            >
              <Select
                showSearch
                allowClear
                loading={clientsLoading}
                placeholder={t('bot.selectClient')}
                optionFilterProp="label"
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}

          {editRole === 'driver' && (
            <Form.Item
              name="assigned_trucks"
              label={t('bot.driverTrucks')}
              rules={[{ required: true, message: t('bot.selectAtLeastOneTruck') }]}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                loading={trucksLoading}
                placeholder={t('bot.selectTrucks')}
                optionFilterProp="label"
                options={trucks.map((tr) => ({
                  value: tr.id,
                  label: `${tr.license_plate}${tr.specific_model_name ? ` — ${tr.specific_model_name}` : ''}${tr.client?.name ? ` (${tr.client.name})` : ''}`,
                }))}
              />
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="is_active" label={t('bot.isActiveCheckbox')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_blocked" label={t('bot.isBlockedCheckbox')} valuePropName="checked">
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
