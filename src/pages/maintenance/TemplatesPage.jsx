import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Select, InputNumber, Input,
  message, Tag, Popconfirm, Row, Col, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { maintenanceAPI, baseModelsAPI } from '../../api';
import { PageHeader } from '../../components';
import ModuleUnavailableBanner from '../../components/ModuleUnavailableBanner';
import useEnumsStore from '../../store/enumsStore';

const INTERVAL_KEYS = [
  { key: 'engine_oil_interval',          tKey: 'templates.engineOil' },
  { key: 'gearbox_oil_interval',         tKey: 'templates.gearboxOil' },
  { key: 'auto_gearbox_oil_interval',    tKey: 'templates.autoGearboxOil' },
  { key: 'auto_gearbox_filter_interval', tKey: 'templates.autoGearboxFilter' },
  { key: 'rear_axle_oil_interval',       tKey: 'templates.rearAxleOil' },
  { key: 'belts_interval',               tKey: 'templates.belts' },
  { key: 'chains_interval',              tKey: 'templates.chains' },
];

function TemplatesPage() {
  const { t } = useTranslation();
  const euroStandards       = useEnumsStore((s) => s.euroStandards);
  const euroByValue         = useEnumsStore((s) => s.euroByValue);
  const transmissionTypes   = useEnumsStore((s) => s.transmissionTypes);
  const transmissionByValue = useEnumsStore((s) => s.transmissionByValue);

  const INTERVAL_FIELDS = INTERVAL_KEYS.map(({ key, tKey }) => ({ key, label: t(tKey) }));

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
      message.error(t('templates.loadError'));
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
        message.success(t('templates.saveSuccess'));
      } else {
        await maintenanceAPI.createTemplate(values);
        message.success(t('templates.createSuccess'));
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === 'object') {
        const msg = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
        message.error(msg || t('templates.saveError'));
      } else if (!err?.errorFields) {
        message.error(t('templates.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await maintenanceAPI.deleteTemplate(id);
      message.success(t('common.delete'));
      fetchTemplates();
    } catch {
      message.error(t('templates.deleteError'));
    }
  };

  const unitFor = (mode) => mode === 'engine_hours' ? t('common.engineHoursShort') : t('common.km');

  const columns = [
    {
      title: t('trucks.baseModel'),
      dataIndex: 'base_model_name',
      key: 'base_model_name',
      render: (v) => <strong>{v || '—'}</strong>,
    },
    {
      title: t('templates.euroColumn'),
      dataIndex: 'euro_standard',
      key: 'euro_standard',
      width: 90,
      render: (v) => v ? <Tag color="blue">{euroByValue[v]?.label || v}</Tag> : <span style={{ color: '#ccc' }}>{t('templates.anyEuro')}</span>,
    },
    {
      title: t('templates.transmissionColumn'),
      dataIndex: 'transmission_type',
      key: 'transmission_type',
      width: 130,
      render: (v) => v ? <Tag color="purple">{transmissionByValue[v]?.label || v}</Tag> : <span style={{ color: '#ccc' }}>{t('templates.anyTransmission')}</span>,
    },
    {
      title: t('templates.modeColumn'),
      dataIndex: 'tracking_mode',
      key: 'tracking_mode',
      width: 130,
      render: (v) => v === 'engine_hours'
        ? <Tag color="orange">{t('templates.modeEngineHours')}</Tag>
        : <Tag>{t('templates.modeMileage')}</Tag>,
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
          <Tooltip title={t('common.edit')}>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm title={t('templates.deleteConfirm')} okText={t('common.yes')} cancelText={t('common.no')} onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (moduleUnavailable) return <ModuleUnavailableBanner moduleName={t('menu.templates')} />;

  const unitLabel = trackingMode === 'engine_hours' ? t('common.engineHoursShort') : t('common.km');

  return (
    <div>
      <PageHeader title={t('templates.title')} />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('templates.newTemplate')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>{t('common.refresh')}</Button>
          <span style={{ color: '#888', fontSize: 13 }}>
            <AppstoreOutlined style={{ marginRight: 6 }} />
            {t('templates.templateNote')}
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
        title={editing ? t('templates.editTemplate') : t('templates.newTemplate')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? t('common.save') : t('templates.createTemplate')}
        cancelText={t('common.cancel')}
        confirmLoading={saving}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="base_model" label={t('trucks.baseModel')}
                rules={[{ required: true, message: t('templates.selectBaseModel') }]}>
                <Select
                  showSearch optionFilterProp="label"
                  placeholder={t('templates.selectBaseModel')}
                  options={baseModels.map(m => ({ value: m.id, label: m.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="euro_standard" label={t('templates.euroColumn')}>
                <Select allowClear placeholder={t('templates.anyEuro')}
                  options={[{ value: '', label: t('templates.anyEuro') }, ...euroStandards]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transmission_type" label={t('templates.transmissionColumn')}>
                <Select allowClear placeholder={t('templates.anyTransmission')}
                  options={[{ value: '', label: t('templates.anyTransmission') }, ...transmissionTypes]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tracking_mode" label={t('templates.trackingMode')}
                rules={[{ required: true }]}>
                <Select onChange={setTrackingMode}
                  options={[
                    { value: 'mileage',      label: t('templates.byKm') },
                    { value: 'engine_hours', label: t('templates.byEngineHours') },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ fontWeight: 600, margin: '8px 0 12px' }}>
            {t('templates.intervalsLabel', { unit: unitLabel })}
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
                    placeholder={trackingMode === 'engine_hours' ? t('templates.notePlaceholder') : t('templates.notePlaceholderKm')}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item name="notes" label={t('templates.noteLabel')}>
            <Input maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TemplatesPage;
