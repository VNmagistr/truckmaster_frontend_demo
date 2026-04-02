import React, { useState, useEffect } from 'react';
import {
  Button, Card, Collapse, List, Tag, Space, Input, InputNumber,
  Modal, Form, Popconfirm, message, Typography, Tooltip, Empty
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import { inventoryAPI } from '../../api';

const { Text } = Typography;
const { Panel } = Collapse;

function OrderListTab() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getOrderFolders();
      const data = res.data || res;
      setFolders(data.results || data || []);
    } catch {
      message.error('Не вдалося завантажити список замовлень');
    } finally {
      setLoading(false);
    }
  };

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
        message.success('Папку оновлено');
      } else {
        await inventoryAPI.createOrderFolder(values);
        message.success('Папку створено');
      }
      setFolderModalOpen(false);
      fetchFolders();
    } catch {
      message.error('Помилка збереження папки');
    } finally {
      setFolderSaving(false);
    }
  };

  const deleteFolder = async (id) => {
    try {
      await inventoryAPI.deleteOrderFolder(id);
      message.success('Папку видалено');
      fetchFolders();
    } catch {
      message.error('Не вдалося видалити папку');
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
      message.error('Помилка оновлення статусу');
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
    });
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    const values = await itemForm.validateFields();
    setItemSaving(true);
    try {
      if (editingItem) {
        await inventoryAPI.updateOrderItem(editingItem.id, values);
        message.success('Позицію оновлено');
      } else {
        await inventoryAPI.createOrderItem({ ...values, folder: itemFolderId });
        message.success('Позицію додано');
      }
      setItemModalOpen(false);
      fetchFolders();
    } catch {
      message.error('Помилка збереження позиції');
    } finally {
      setItemSaving(false);
    }
  };

  const deleteItem = async (id, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.deleteOrderItem(id);
      message.success('Позицію видалено');
      fetchFolders();
    } catch {
      message.error('Не вдалося видалити позицію');
    }
  };

  const toggleItem = async (item, e) => {
    e.stopPropagation();
    try {
      await inventoryAPI.toggleOrderItem(item.id);
      fetchFolders();
    } catch {
      message.error('Помилка оновлення статусу');
    }
  };

  // --- Render ---

  const renderItem = (item) => (
    <List.Item
      key={item.id}
      style={{
        background: item.is_ordered ? '#f6ffed' : '#fff9f0',
        borderRadius: 6,
        marginBottom: 6,
        padding: '8px 12px',
        border: `1px solid ${item.is_ordered ? '#b7eb8f' : '#ffd591'}`,
        cursor: 'default',
      }}
      actions={[
        <Tooltip title={item.is_ordered ? 'Скасувати замовлення' : 'Позначити як замовлено'} key="toggle">
          <Button
            size="small"
            type={item.is_ordered ? 'default' : 'primary'}
            icon={item.is_ordered ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
            style={item.is_ordered ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
            onClick={(e) => toggleItem(item, e)}
          />
        </Tooltip>,
        <Tooltip title="Редагувати" key="edit">
          <Button size="small" icon={<EditOutlined />} onClick={(e) => openEditItem(item, e)} />
        </Tooltip>,
        <Popconfirm
          key="del"
          title="Видалити позицію?"
          onConfirm={(e) => deleteItem(item.id, e || { stopPropagation: () => {} })}
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            {item.is_ordered ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>Замовлено</Tag>
            ) : (
              <Tag color="warning" icon={<ClockCircleOutlined />}>Потрібно замовити</Tag>
            )}
            <Text
              style={{
                textDecoration: item.is_ordered ? 'line-through' : 'none',
                color: item.is_ordered ? '#8c8c8c' : '#1a1a1a',
                fontWeight: 500,
              }}
            >
              {item.name}
            </Text>
            {(item.quantity || item.unit) && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {item.quantity ? `${item.quantity}` : ''}{item.unit ? ` ${item.unit}` : ''}
              </Text>
            )}
          </Space>
        }
        description={item.notes || null}
      />
    </List.Item>
  );

  const renderFolderHeader = (folder) => {
    const total = folder.items.length;
    const ordered = folder.items.filter(i => i.is_ordered).length;
    const allOrdered = total > 0 && ordered === total;

    return (
      <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Space>
          <FolderOutlined style={{ color: '#f5c518', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>{folder.name}</Text>
          {total > 0 && (
            <Tag color={allOrdered ? 'success' : 'default'}>
              {ordered}/{total} замовлено
            </Tag>
          )}
        </Space>
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            type={allOrdered ? 'default' : 'primary'}
            style={allOrdered ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
            onClick={(e) => markAllOrdered(folder, e)}
            disabled={total === 0}
          >
            {allOrdered ? 'Скасувати всі' : 'Замовлено все'}
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={(e) => openNewItem(folder.id, e)}>
            Додати
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={(e) => openEditFolder(folder, e)} />
          <Popconfirm
            title="Видалити папку разом з усіма позиціями?"
            onConfirm={() => deleteFolder(folder.id)}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      </Space>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNewFolder}>
          Нова папка
        </Button>
      </div>

      {!loading && folders.length === 0 && (
        <Empty
          image={<ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="Поки немає папок замовлень"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewFolder}>
            Створити папку
          </Button>
        </Empty>
      )}

      {folders.length > 0 && (
        <Collapse accordion={false} defaultActiveKey={folders.map(f => f.id)}>
          {folders.map(folder => (
            <Panel key={folder.id} header={renderFolderHeader(folder)}>
              {folder.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <Text type="secondary">Список порожній</Text>
                  <br />
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={(e) => openNewItem(folder.id, e)}
                  >
                    Додати позицію
                  </Button>
                </div>
              ) : (
                <List
                  dataSource={folder.items}
                  renderItem={renderItem}
                  size="small"
                  split={false}
                />
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
          <Form.Item
            name="name"
            label="Назва папки"
            rules={[{ required: true, message: 'Введіть назву' }]}
          >
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
          <Form.Item
            name="name"
            label="Назва"
            rules={[{ required: true, message: 'Введіть назву' }]}
          >
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
          <Form.Item name="notes" label="Примітки">
            <Input.TextArea rows={2} placeholder="Додаткова інформація..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderListTab;
