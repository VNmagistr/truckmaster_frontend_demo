import React, { useState, useEffect } from 'react';
import {
  Button, Collapse, List, Tag, Space, Input, InputNumber,
  Modal, Form, Popconfirm, message, Typography, Tooltip, Empty, Switch,
  Select, Radio, Spin, Divider, Alert,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ShoppingCartOutlined,
  InboxOutlined, RollbackOutlined, SearchOutlined, ImportOutlined,
  LinkOutlined, FileAddOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryAPI } from '../../api';

const { Text } = Typography;
const { Panel } = Collapse;

function OrderListTab() {
  const { t } = useTranslation();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Folder modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderForm] = Form.useForm();
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderSaving, setFolderSaving] = useState(false);

  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm] = Form.useForm();
  const [editingItem, setEditingItem] = useState(null);
  const [itemFolderId, setItemFolderId] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);

  // Individual receive modal
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveItem, setReceiveItem] = useState(null);
  const [receiveForm] = Form.useForm();
  const [receiveMode, setReceiveMode] = useState('existing');
  const [productMatches, setProductMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [receiveSaving, setReceiveSaving] = useState(false);

  // Bulk receive modal
  const [bulkReceiveModalOpen, setBulkReceiveModalOpen] = useState(false);
  const [bulkReceiveFolder, setBulkReceiveFolder] = useState(null);
  const [bulkReceiveForm] = Form.useForm();
  const [bulkReceiveSaving, setBulkReceiveSaving] = useState(false);

  // Shared warehouses list
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchFolders();
  }, [showArchived]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const params = showArchived ? { show_archived: true } : {};
      const res = await inventoryAPI.getOrderFolders(params);
      const data = res.data || res;
      setFolders(data.results || data || []);
    } catch {
      message.error(t('inventory.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const ensureWarehouses = async () => {
    if (warehouses.length > 0) return;
    try {
      const res = await inventoryAPI.getWarehouses();
      const data = res.data || res;
      setWarehouses(data.results || data || []);
    } catch {
      // ignore
    }
  };

  // Фільтрація по пошуку
  const q = searchText.toLowerCase().trim();
  const filteredFolders = q
    ? folders.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.items.some(i => i.name.toLowerCase().includes(q))
      )
    : folders;

  // --- Folder actions ---

  const openNewFolder = () => {
    setEditingFolder(null);
    folderForm.resetFields();
    setFolderModalOpen(true);
  };

  const openEditFolder = (folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    folderForm.setFieldsValue({ name: folder.name });
    setFolderModalOpen(true);
  };

  const saveFolder = async () => {
    const values = await folderForm.validateFields();
    setFolderSaving(true);
    try {
      if (editingFolder) {
        await inventoryAPI.updateOrderFolder(editingFolder.id, values);
        message.success(t('orderList.folderUpdated'));
      } else {
        await inventoryAPI.createOrderFolder(values);
        message.success(t('orderList.folderCreated'));
      }
      setFolderModalOpen(false);
      fetchFolders();
    } catch {
      message.error(t('orderList.folderSaveError'));
    } finally {
      setFolderSaving(false);
    }
  };

  const deleteFolder = async (id) => {
    try {
      await inventoryAPI.deleteOrderFolder(id);
      message.success(t('orderList.folderDeleted'));
      fetchFolders();
    } catch {
      message.error(t('orderList.folderDeleteError'));
    }
  };

  const archiveFolder = async (folder, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.archiveOrderFolder(folder.id);
      message.success(t('orderList.folderArchived'));
      fetchFolders();
    } catch {
      message.error(t('orderList.folderArchiveError'));
    }
  };

  const unarchiveFolder = async (folder, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.unarchiveOrderFolder(folder.id);
      message.success(t('orderList.folderRestored'));
      fetchFolders();
    } catch {
      message.error(t('orderList.folderRestoreError'));
    }
  };

  const markAllOrdered = async (folder, e) => {
    e.stopPropagation();
    const allOrdered = folder.items.length > 0 && folder.items.every(i => i.is_ordered);
    try {
      if (allOrdered) {
        await inventoryAPI.unmarkAllOrdered(folder.id);
      } else {
        await inventoryAPI.markAllOrdered(folder.id);
      }
      fetchFolders();
    } catch {
      message.error(t('orderList.statusUpdateError'));
    }
  };

  const openBulkReceive = async (folder, e) => {
    e.stopPropagation();
    setBulkReceiveFolder(folder);
    bulkReceiveForm.resetFields();
    setBulkReceiveModalOpen(true);
    await ensureWarehouses();
  };

  const saveBulkReceive = async () => {
    const values = await bulkReceiveForm.validateFields();
    setBulkReceiveSaving(true);
    try {
      const res = await inventoryAPI.receiveAllFolder(bulkReceiveFolder.id, {
        warehouse_id: values.warehouse_id,
      });
      const data = res.data || res;
      message.success(t('orderList.bulkReceived', { count: data.received }));
      if (data.errors && data.errors.length > 0) {
        message.warning(t('orderList.bulkErrors', { items: data.errors.map(e => e.item).join(', ') }));
      }
      setBulkReceiveModalOpen(false);
      fetchFolders();
    } catch (err) {
      const detail = err?.response?.data?.error || t('orderList.bulkReceiveError');
      message.error(detail);
    } finally {
      setBulkReceiveSaving(false);
    }
  };

  // --- Item actions ---

  const openNewItem = (folderId, e) => {
    e.stopPropagation();
    setEditingItem(null);
    setItemFolderId(folderId);
    itemForm.resetFields();
    setItemModalOpen(true);
  };

  const openEditItem = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setItemFolderId(item.folder);
    itemForm.setFieldsValue({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
      purchase_price: item.purchase_price,
    });
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    const values = await itemForm.validateFields();
    setItemSaving(true);
    try {
      if (editingItem) {
        await inventoryAPI.updateOrderItem(editingItem.id, values);
        message.success(t('orderList.itemUpdated'));
      } else {
        await inventoryAPI.createOrderItem({ ...values, folder: itemFolderId });
        message.success(t('orderList.itemAdded'));
      }
      setItemModalOpen(false);
      fetchFolders();
    } catch {
      message.error(t('orderList.itemSaveError'));
    } finally {
      setItemSaving(false);
    }
  };

  const deleteItem = async (id, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.deleteOrderItem(id);
      message.success(t('orderList.itemDeleted'));
      fetchFolders();
    } catch {
      message.error(t('orderList.itemDeleteError'));
    }
  };

  const toggleItem = async (item, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.toggleOrderItem(item.id);
      fetchFolders();
    } catch {
      message.error(t('orderList.statusUpdateError'));
    }
  };

  // --- Individual receive ---

  const openReceiveModal = async (item, e) => {
    e.stopPropagation();
    setReceiveItem(item);
    setReceiveMode('existing');
    setSelectedProductId(null);
    setProductMatches([]);
    receiveForm.resetFields();
    receiveForm.setFieldsValue({
      quantity: item.quantity || 1,
      purchase_price: item.purchase_price || null,
    });
    setReceiveModalOpen(true);
    await ensureWarehouses();

    if (item.name) {
      setMatchesLoading(true);
      try {
        const res = await inventoryAPI.searchProductsForItem(item.name);
        const data = res.data || res;
        setProductMatches(data || []);
        if (!data || data.length === 0) setReceiveMode('new');
      } catch {
        // ignore
      } finally {
        setMatchesLoading(false);
      }
    }
  };

  const handleReceiveSearch = async (value) => {
    if (!value || value.length < 2) return;
    setMatchesLoading(true);
    try {
      const res = await inventoryAPI.searchProductsForItem(value);
      const data = res.data || res;
      setProductMatches(data || []);
    } catch {
      // ignore
    } finally {
      setMatchesLoading(false);
    }
  };

  const saveReceive = async () => {
    const values = await receiveForm.validateFields();
    setReceiveSaving(true);
    try {
      const payload = {
        warehouse_id: values.warehouse_id,
        quantity: values.quantity,
        purchase_price: values.purchase_price || null,
      };
      if (receiveMode === 'existing') {
        payload.product_id = selectedProductId;
      } else {
        payload.sku_code = values.sku_code;
        payload.product_name = values.product_name || receiveItem.name;
        payload.unit = values.unit || receiveItem.unit || 'pcs';
      }
      await inventoryAPI.receiveOrderItem(receiveItem.id, payload);
      message.success(t('wholesale.receiveSuccess'));
      setReceiveModalOpen(false);
      fetchFolders();
    } catch (err) {
      const detail = err?.response?.data?.error || t('wholesale.receiveError');
      message.error(detail);
    } finally {
      setReceiveSaving(false);
    }
  };

  // Підсвічуємо текст що збігається з пошуком
  const highlight = (text) => {
    if (!q || !text.toLowerCase().includes(q)) return text;
    const idx = text.toLowerCase().indexOf(q);
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#fff3a0', padding: 0 }}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  // --- Render ---

  const renderItem = (item) => {
    const canReceive = item.is_ordered && !item.is_received;
    return (
      <List.Item
        key={item.id}
        style={{
          background: item.is_received ? '#e6f7ff' : item.is_ordered ? '#f6ffed' : '#fff9f0',
          borderRadius: 6,
          marginBottom: 6,
          padding: '8px 12px',
          border: `1px solid ${item.is_received ? '#91d5ff' : item.is_ordered ? '#b7eb8f' : '#ffd591'}`,
        }}
        actions={[
          canReceive && (
            <Tooltip title={t('orderList.receiveAll')} key="receive">
              <Button
                size="small"
                type="primary"
                icon={<ImportOutlined />}
                style={{ background: '#1677ff', borderColor: '#1677ff' }}
                onClick={(e) => openReceiveModal(item, e)}
              />
            </Tooltip>
          ),
          !item.is_received && (
            <Tooltip title={item.is_ordered ? t('orderList.cancelAll') : t('orderList.ordered')} key="toggle">
              <Button
                size="small"
                type={item.is_ordered ? 'default' : 'primary'}
                icon={item.is_ordered ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                style={item.is_ordered ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
                onClick={(e) => toggleItem(item, e)}
              />
            </Tooltip>
          ),
          <Tooltip title={t('common.edit')} key="edit">
            <Button size="small" icon={<EditOutlined />} onClick={(e) => openEditItem(item, e)} />
          </Tooltip>,
          <Popconfirm
            key="del"
            title={t('orderList.deleteFolderConfirm')}
            onConfirm={(e) => deleteItem(item.id, e || { stopPropagation: () => {} })}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>,
        ].filter(Boolean)}
      >
        <List.Item.Meta
          title={
            <Space wrap>
              {item.is_received
                ? <Tag color="processing" icon={<ImportOutlined />}>{t('orderList.received')}</Tag>
                : item.is_ordered
                  ? <Tag color="success" icon={<CheckCircleOutlined />}>{t('orderList.ordered')}</Tag>
                  : <Tag color="warning" icon={<ClockCircleOutlined />}>{t('orderList.needToOrder')}</Tag>
              }
              <Text
                style={{
                  textDecoration: item.is_received ? 'line-through' : 'none',
                  color: item.is_received ? '#8c8c8c' : '#1a1a1a',
                  fontWeight: 500,
                }}
              >
                {highlight(item.name)}
              </Text>
              {(item.quantity || item.unit) && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {item.quantity ? `${item.quantity}` : ''}{item.unit ? ` ${item.unit}` : ''}
                </Text>
              )}
              {item.purchase_price && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  · {Number(item.purchase_price).toFixed(2)} грн
                </Text>
              )}
              {item.is_received && item.linked_product_name && (
                <Tooltip title={`${t('orderList.receivedAs')} ${item.linked_product_name}`}>
                  <Tag color="blue" icon={<LinkOutlined />} style={{ fontSize: 11 }}>
                    {item.linked_product_name}
                  </Tag>
                </Tooltip>
              )}
            </Space>
          }
          description={item.notes || null}
        />
      </List.Item>
    );
  };

  const renderFolderHeader = (folder) => {
    const total = folder.items.length;
    const ordered = folder.items.filter(i => i.is_ordered).length;
    const received = folder.items.filter(i => i.is_received).length;
    const allOrdered = total > 0 && ordered === total;
    const canBulkReceive = folder.items.some(i => i.is_ordered && !i.is_received && i.linked_product);

    return (
      <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Space>
          <FolderOutlined style={{ color: folder.is_archived ? '#8c8c8c' : '#f5c518', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15, color: folder.is_archived ? '#8c8c8c' : undefined }}>
            {highlight(folder.name)}
          </Text>
          {folder.is_archived && <Tag color="default">{t('orderList.archive')}</Tag>}
          {total > 0 && (
            <Tag color={allOrdered ? 'success' : 'default'}>
              {ordered}/{total} {t('orderList.orderedCount')}
            </Tag>
          )}
          {received > 0 && (
            <Tag color="processing">{received} {t('orderList.receivedCount')}</Tag>
          )}
        </Space>
        <Space onClick={(e) => e.stopPropagation()}>
          {folder.is_archived ? (
            <Tooltip title={t('orderList.restoreFromArchive')}>
              <Button size="small" icon={<RollbackOutlined />} onClick={(e) => unarchiveFolder(folder, e)}>
                {t('orderList.restore')}
              </Button>
            </Tooltip>
          ) : (
            <>
              {canBulkReceive && (
                <Tooltip title={t('orderList.receiveAll')}>
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    style={{ color: '#1677ff', borderColor: '#1677ff' }}
                    onClick={(e) => openBulkReceive(folder, e)}
                  >
                    {t('orderList.receiveAllBtn')}
                  </Button>
                </Tooltip>
              )}
              <Button
                size="small"
                type={allOrdered ? 'default' : 'primary'}
                style={allOrdered ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
                onClick={(e) => markAllOrdered(folder, e)}
                disabled={total === 0}
              >
                {allOrdered ? t('orderList.cancelAll') : t('orderList.orderAll')}
              </Button>
              <Button size="small" icon={<PlusOutlined />} onClick={(e) => openNewItem(folder.id, e)}>
                {t('orderList.addItem')}
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={(e) => openEditFolder(folder, e)} />
              <Tooltip title="Перемістити в архів">
                <Button size="small" icon={<InboxOutlined />} onClick={(e) => archiveFolder(folder, e)} />
              </Tooltip>
            </>
          )}
          {folder.is_archived && (
            <Popconfirm
              title="Видалити папку назавжди?"
              onConfirm={() => deleteFolder(folder.id)}
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      </Space>
    );
  };

  return (
    <div>
      {/* Панель управління */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input
            placeholder="Пошук по папках і позиціях..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Space>
            <Switch checked={showArchived} onChange={setShowArchived} size="small" />
            <Text type="secondary">Показати архів</Text>
          </Space>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNewFolder}>
          Нова папка
        </Button>
      </div>

      {!loading && filteredFolders.length === 0 && (
        <Empty
          image={<ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description={
            q ? `Нічого не знайдено за запитом «${searchText}»`
              : showArchived ? 'Архів порожній'
              : 'Поки немає папок замовлень'
          }
        >
          {!q && !showArchived && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openNewFolder}>
              Створити папку
            </Button>
          )}
        </Empty>
      )}

      {filteredFolders.length > 0 && (
        <Collapse accordion={false} defaultActiveKey={filteredFolders.map(f => f.id)}>
          {filteredFolders.map(folder => (
            <Panel
              key={folder.id}
              header={renderFolderHeader(folder)}
              style={folder.is_archived ? { opacity: 0.7 } : {}}
            >
              {folder.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <Text type="secondary">Список порожній</Text>
                  {!folder.is_archived && (
                    <>
                      <br />
                      <Button type="link" icon={<PlusOutlined />} onClick={(e) => openNewItem(folder.id, e)}>
                        Додати позицію
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <List dataSource={folder.items} renderItem={renderItem} size="small" split={false} />
              )}
            </Panel>
          ))}
        </Collapse>
      )}

      {/* Folder modal */}
      <Modal
        title={editingFolder ? 'Редагувати папку' : 'Нова папка'}
        open={folderModalOpen}
        onOk={saveFolder}
        onCancel={() => setFolderModalOpen(false)}
        confirmLoading={folderSaving}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        <Form form={folderForm} layout="vertical">
          <Form.Item name="name" label="Назва папки" rules={[{ required: true, message: 'Введіть назву' }]}>
            <Input placeholder="Напр. Мідні шайби" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* Item modal */}
      <Modal
        title={editingItem ? 'Редагувати позицію' : 'Нова позиція'}
        open={itemModalOpen}
        onOk={saveItem}
        onCancel={() => setItemModalOpen(false)}
        confirmLoading={itemSaving}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="name" label="Назва" rules={[{ required: true, message: 'Введіть назву' }]}>
            <Input placeholder="Напр. 10х16х1,5" autoFocus />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="quantity" label="Кількість" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="1" />
            </Form.Item>
            <Form.Item name="unit" label="Одиниця" style={{ flex: 1 }}>
              <Input placeholder="шт / кг / уп..." />
            </Form.Item>
          </Space>
          <Form.Item
            name="purchase_price"
            label="Ціна закупівлі (грн)"
            rules={[
              {
                validator: (_, value) => {
                  if (value !== undefined && value !== null && value !== '' && Number(value) === 0) {
                    return Promise.reject('Ціна не може бути 0 — аналітика не зійдеться');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="Необов'язково" />
          </Form.Item>
          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} placeholder="Додаткова інформація..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Individual receive modal */}
      <Modal
        title={
          <Space>
            <ImportOutlined />
            Оприбуткувати: {receiveItem?.name}
          </Space>
        }
        open={receiveModalOpen}
        onOk={saveReceive}
        onCancel={() => setReceiveModalOpen(false)}
        confirmLoading={receiveSaving}
        okText="Оприбуткувати"
        cancelText="Скасувати"
        width={520}
      >
        <Form form={receiveForm} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <Radio.Group
              value={receiveMode}
              onChange={e => setReceiveMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="existing">
                <LinkOutlined /> Є в базі складу
              </Radio.Button>
              <Radio.Button value="new">
                <FileAddOutlined /> Новий товар
              </Radio.Button>
            </Radio.Group>
          </div>

          {receiveMode === 'existing' && (
            <>
              <div style={{ marginBottom: 8 }}>
                {matchesLoading
                  ? <Spin size="small" style={{ marginRight: 8 }} />
                  : productMatches.length > 0
                    ? <Text type="secondary">Знайдено {productMatches.length} збіг(ів) — оберіть або пошукайте вручну:</Text>
                    : <Text type="warning">Збіги не знайдені — спробуйте пошук або оберіть "Новий товар"</Text>
                }
              </div>
              <Form.Item label="Товар на складі" required>
                <Select
                  showSearch
                  placeholder="Пошук по назві або артикулу..."
                  filterOption={false}
                  onSearch={handleReceiveSearch}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  notFoundContent={matchesLoading ? <Spin size="small" /> : 'Не знайдено'}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                >
                  {productMatches.map(p => (
                    <Select.Option key={p.id} value={p.id} label={p.name}>
                      <div>
                        <Text strong>{p.name}</Text>
                        {p.brand && <Text type="secondary"> · {p.brand}</Text>}
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        [{p.sku_code}] · залишок: {p.current_stock} {p.unit}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {receiveMode === 'new' && (
            <>
              <Divider plain style={{ margin: '0 0 12px' }}>Новий товар в базі складу</Divider>
              <Form.Item name="product_name" label="Назва товару" initialValue={receiveItem?.name}>
                <Input placeholder={receiveItem?.name} />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Form.Item
                  name="sku_code"
                  label="Артикул (SKU)"
                  style={{ flex: 1 }}
                  rules={[{ required: true, message: 'Введіть артикул' }]}
                >
                  <Input placeholder="Напр. HM-10-50" />
                </Form.Item>
                <Form.Item name="unit" label="Одиниця" style={{ flex: 1 }}>
                  <Input placeholder={receiveItem?.unit || 'шт'} />
                </Form.Item>
              </Space>
            </>
          )}

          <Divider plain style={{ margin: '4px 0 12px' }} />

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item
              name="warehouse_id"
              label="Склад"
              rules={[{ required: true, message: 'Оберіть склад' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Select placeholder="Оберіть склад" style={{ width: '100%' }}>
                {warehouses.map(w => (
                  <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Кількість"
              rules={[{ required: true, message: 'Вкажіть кількість' }]}
              style={{ width: 110, marginBottom: 0 }}
            >
              <InputNumber min={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="purchase_price"
            label="Ціна закупівлі (грн)"
            style={{ marginTop: 12, marginBottom: 0 }}
            rules={[
              { required: true, message: 'Вкажіть ціну закупівлі' },
              {
                validator: (_, value) => {
                  if (!value || Number(value) <= 0) {
                    return Promise.reject('Ціна має бути більше 0 — інакше аналітика прибутковості не зійдеться');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="грн за одиницю" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk receive modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            Прийняти все: {bulkReceiveFolder?.name}
          </Space>
        }
        open={bulkReceiveModalOpen}
        onOk={saveBulkReceive}
        onCancel={() => setBulkReceiveModalOpen(false)}
        confirmLoading={bulkReceiveSaving}
        okText="Прийняти все"
        cancelText="Скасувати"
      >
        <Form form={bulkReceiveForm} layout="vertical">
          {bulkReceiveFolder && (() => {
            const readyItems = bulkReceiveFolder.items.filter(
              i => i.is_ordered && !i.is_received && i.linked_product
            );
            const noPriceItems = readyItems.filter(i => !i.purchase_price);
            return (
              <>
                <Alert
                  type="info"
                  style={{ marginBottom: 16 }}
                  message={`Буде оприбутковано ${readyItems.length} позицій (лише ті, що замовлені і прив'язані до товару)`}
                  description={
                    noPriceItems.length > 0
                      ? `Без ціни закупівлі: ${noPriceItems.map(i => i.name).join(', ')} — додайте ціни в редагуванні позицій для коректної аналітики`
                      : null
                  }
                />
                <Form.Item
                  name="warehouse_id"
                  label="Склад призначення"
                  rules={[{ required: true, message: 'Оберіть склад' }]}
                >
                  <Select placeholder="Оберіть склад">
                    {warehouses.map(w => (
                      <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            );
          })()}
        </Form>
      </Modal>
    </div>
  );
}

export default OrderListTab;
