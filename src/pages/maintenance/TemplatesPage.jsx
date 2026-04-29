import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Select, InputNumber, Input,
  message, Tag, Popconfirm, Row, Col, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { maintenanceAPI, baseModelsAPI } from '../../api';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import useEnumsStore from '../../store/enumsStore';

const INTERVAL_FIELDS = [
  { key: 'engine_oil_interval',          label: 'Олива двигуна' },
  { key: 'gearbox_oil_interval',         label: 'Олива КПП' },
  { key: 'auto_gearbox_oil_interval',    label: 'Олива АКПП' },
  { key: 'auto_gearbox_filter_interval', label: 'Фільтр АКПП' },
  { key: 'rear_axle_oil_interval',       label: 'Олива заднього моста' },
  { key: 'belts_interval',               label: 'Ремені/ролики' },
  { key: 'chains_interval',              label: 'Ланцюги' },
];

function TemplatesPage() {
  const euroStandards       = useEnumsStore((s) => s.euroStandards);
  const euroByValue         = useEnumsStore((s) => s.euroByValue);
  const transmissionTypes   = useEnumsStore((s) => s.transmissionTypes);
  const transmissionByValue = useEnumsStore((s) => s.transmissionByValue);

  const [loading, setLoading]     = useState(false);
  const [templates, setTemplates] = useState([]);
  const [baseModels, setBaseModels] = useState([]);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [form]                      = Form.useForm();
  const [trackingMode, setTrackingMode] = useState('mileage');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await maintenanceAPI.getTemplates({ page_size: 200 });
      const data = res.data || res;
      setTemplates(data.results || data || []);
    } catch (err) {
      if (err.isModuleUnavailable) { setModuleUnavailable(true); return; }
      message.error('Не вдалося завантажити еталони');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBaseModels = useCallback(async () => {
    try {
      const res  = await baseModelsAPI.getAll();
      const data = res.data || res;
      setBaseModels(data.results || data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTemplates();
    loadBaseModels();
  }, [fetchTemplates, loadBaseModels]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tracking_mode: 'mileage', euro_standard: '', transmission_type: '' });
    setTrackingMode('mileage');
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      base_model:        record.base_model,
      euro_standard:     record.euro_standard || '',
      transmission_type: record.transmission_type || '',
      tracking_mode:     record.tracking_mode,
      notes:             record.notes,
      ...Object.fromEntries(INTERVAL_FIELDS.map(({ key }) => [key, record[key] ?? null])),
    });
    setTrackingMode(record.tracking_mode || 'mileage');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      // Порожні рядки/null чисел не падали як 400
      INTERVAL_FIELDS.forEach(({ key }) => {
        if (values[key] === '' || values[key] === undefined) values[key] = null;
      });
      if (editing) {
        await maintenanceAPI.updateTemplate(editing.id, values);
        message.success('Збережено');
      } else {
        await maintenanceAPI.createTemplate(values);
        message.success('Еталон створено');
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === 'object') {
        const msg = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
        message.error(msg || 'Помилка збереження');
      } else if (!err?.errorFields) {
        message.error('Помилка збереження');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await maintenanceAPI.deleteTemplate(id);
      message.success('Видалено');
      fetchTemplates();
    } catch {
      message.error('Не вдалося видалити');
    }
  };

  const unitFor = (mode) => mode === 'engine_hours' ? 'мг' : 'км';

  const columns = [
    {
      title: 'Базова модель',
      dataIndex: 'base_model_name',
      key: 'base_model_name',
      render: (v) => <strong>{v || '—'}</strong>,
    },
    {
      title: 'Євро',
      dataIndex: 'euro_standard',
      key: 'euro_standard',
      width: 90,
      render: (v) => v ? <Tag color="blue">{euroByValue[v]?.label || v}</Tag> : <span style={{ color: '#ccc' }}>будь-який</span>,
    },
    {
      title: 'КПП',
      dataIndex: 'transmission_type',
      key: 'transmission_type',
      width: 130,
      render: (v) => v ? <Tag color="purple">{transmissionByValue[v]?.label || v}</Tag> : <span style={{ color: '#ccc' }}>будь-яка</span>,
    },
    {
      title: 'Режим',
      dataIndex: 'tracking_mode',
      key: 'tracking_mode',
      width: 130,
      render: (v) => v === 'engine_hours'
        ? <Tag color="orange">Мотогодини</Tag>
        : <Tag>Кілометраж</Tag>,
    },
    ...INTERVAL_FIELDS.map(({ key, label }) => ({
      title: label,
      dataIndex: key,
      key,
      width: 110,
      render: (v, r) => v != null ? (
        <span>{Number(v).toLocaleString('uk').replace(/,/g, ' ')} <Tag style={{ marginLeft: 4 }}>{unitFor(r.tracking_mode)}</Tag></span>
      ) : <span style={{ color: '#ccc' }}>—</span>,
    })),
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Редагувати">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm title="Видалити еталон?" okText="Так" cancelText="Ні" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName="Нагадування ТО" />;

  const unitLabel = trackingMode === 'engine_hours' ? 'мг' : 'км';

  return (
    <div>
      <PageHeader title="Еталони регламенту ТО" />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Новий еталон
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>Оновити</Button>
          <span style={{ color: '#888', fontSize: 13 }}>
            <AppstoreOutlined style={{ marginRight: 6 }} />
            Після збереження вантажівки система підтягує сюди вписані інтервали в її TruckMaintenanceIntervals
            (заповнюючи лише порожні поля).
          </span>
        </Space>
      </Card>

      <Table
        dataSource={templates}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={false}
      />

      <Modal
        title={editing ? 'Редагувати еталон' : 'Новий еталон'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Зберегти' : 'Створити'}
        cancelText="Скасувати"
        confirmLoading={saving}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="base_model" label="Базова модель"
                rules={[{ required: true, message: 'Оберіть базову модель' }]}>
                <Select
                  showSearch optionFilterProp="label"
                  placeholder="Оберіть базову модель"
                  options={baseModels.map(m => ({ value: m.id, label: m.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="euro_standard" label="Євростандарт">
                <Select allowClear placeholder="будь-який"
                  options={[{ value: '', label: 'будь-який' }, ...euroStandards]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transmission_type" label="Тип КПП">
                <Select allowClear placeholder="будь-яка"
                  options={[{ value: '', label: 'будь-яка' }, ...transmissionTypes]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tracking_mode" label="Режим обліку"
                rules={[{ required: true }]}>
                <Select onChange={setTrackingMode}
                  options={[
                    { value: 'mileage',      label: 'По кілометражу (км)' },
                    { value: 'engine_hours', label: 'По мотогодинах (мг)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ fontWeight: 600, margin: '8px 0 12px' }}>
            Інтервали ({unitLabel})
          </div>
          <Row gutter={[16, 8]}>
            {INTERVAL_FIELDS.map(({ key, label }) => (
              <Col xs={24} sm={12} key={key}>
                <Form.Item name={key} label={label}>
                  <InputNumber
                    min={0}
                    step={trackingMode === 'engine_hours' ? 100 : 1000}
                    style={{ width: '100%' }}
                    addonAfter={unitLabel}
                    placeholder={trackingMode === 'engine_hours' ? 'напр. 500' : 'напр. 15000'}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item name="notes" label="Нотатка">
            <Input maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TemplatesPage;
