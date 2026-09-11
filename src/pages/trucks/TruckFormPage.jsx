import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trucksAPI, clientsAPI, baseModelsAPI, botAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import useEnumsStore from '../../store/enumsStore';

function TruckFormPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const euroStandards     = useEnumsStore((s) => s.euroStandards);
  const transmissionTypes = useEnumsStore((s) => s.transmissionTypes);

  // Списки для вибору
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [baseModels, setBaseModels] = useState([]);
  const searchTimer = useRef(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const prefillPlate = searchParams.get('license_plate') || '';
  const unknownPlateId = searchParams.get('unknown_plate_id') || '';

  // Завантажуємо дані послідовно
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1. Спочатку вантажимо довідники (клієнти, моделі)
        const loadedClients = await fetchDictionaries();

        // 2. Якщо це редагування - вантажимо вантажівку
        if (isEdit) {
          await fetchTruck(loadedClients);
        } else if (prefillPlate) {
          // Pre-fill номеру при додаванні з невідомих номерів бота
          form.setFieldsValue({ license_plate: prefillPlate.toUpperCase() });
        }
      } catch (error) {
        if (!error?.isSessionExpired) message.error(t('common.initError'));
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id]);

  const searchClients = async (search = '') => {
    setClientsLoading(true);
    try {
      const resp = await clientsAPI.getAll({ page_size: 25, search });
      const data = resp.data || resp;
      return data.results || data || [];
    } catch {
      return [];
    } finally {
      setClientsLoading(false);
    }
  };

  const handleClientSearch = (value) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const results = await searchClients(value);
      setClients(results);
    }, 400);
  };

  const fetchDictionaries = async () => {
    try {
      const [initialClients, baseModelsResp] = await Promise.all([
        searchClients(''),
        baseModelsAPI.getAll()
      ]);

      setClients(initialClients);

      const modelsData = baseModelsResp.data || baseModelsResp;
      setBaseModels(modelsData.results || modelsData || []);

      return initialClients; // Повертаємо, щоб передати в fetchTruck
    } catch (error) {
      return [];
    }
  };

  const fetchTruck = async (currentClientsList) => {
    try {
      const response = await trucksAPI.getById(id);
      const data = response.data || response;
      
      // Визначаємо ID власника
      const ownerId = data.client && typeof data.client === 'object' ? data.client.id : data.client;

      // --- ГОЛОВНЕ ВИПРАВЛЕННЯ ---
      // Перевіряємо, чи є власник у вже завантаженому списку
      if (ownerId) {
        const ownerExists = currentClientsList.find(c => c.id === ownerId);
        
        if (!ownerExists) {
          // Якщо власника немає в списку (він не вліз у перші 50) - вантажимо його окремо
          try {
            const ownerResp = await clientsAPI.getById(ownerId);
            const ownerData = ownerResp.data || ownerResp;
            
            // Додаємо його в список, щоб Select міг показати ім'я
            setClients(prev => [...prev, ownerData]);
          } catch (err) {
            // власника не знайдено — ігноруємо
          }
        }
      }

      // Заповнюємо форму
      form.setFieldsValue({
        ...data,
        client: ownerId, // Передаємо саме ID
        base_model: data.base_model?.id || data.base_model,
      });

    } catch (error) {
      if (!error?.isSessionExpired) {
        message.error(t('trucks.loadError'));
        navigate('/trucks');
      }
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await trucksAPI.update(id, values);
        message.success(t('trucks.updateSuccess'));
      } else {
        await trucksAPI.create(values);
        message.success(t('trucks.createSuccess'));
        // Якщо створили з списку невідомих номерів — видаляємо запис
        if (unknownPlateId) {
          try { await botAPI.deleteUnknownPlate(unknownPlateId); } catch { /* ignore */ }
        }
      }
      navigate(unknownPlateId ? '/bot' : '/trucks');
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          const msg = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
          message.error(`${key}: ${msg}`);
        });
      } else {
        message.error(t('trucks.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? t('trucks.editTruck') : t('trucks.createTruck')}
        showBack
      />

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="license_plate"
            label={t('trucks.licensePlate')}
            rules={[{ required: true, message: t('trucks.licensePlatePlaceholder') }]}
          >
            <Input placeholder="AA0000BB" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="full_vin"
            label={t('trucks.fullVinCode')}
            rules={[
              { required: true, message: t('trucks.vinPlaceholder') },
              { len: 17, message: t('trucks.vinLengthError') },
            ]}
          >
            <Input placeholder={t('trucks.vinLength17')} maxLength={17} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="specific_model_name"
            label={t('trucks.modelDetail')}
            rules={[{ required: true, message: t('trucks.modelPlaceholder') }]}
          >
            <Input placeholder={t('trucks.modelExample')} />
          </Form.Item>

          <Form.Item
            name="base_model"
            label={t('trucks.baseModel')}
          >
            <Select placeholder={t('trucks.selectBaseModel')} allowClear>
              {baseModels.map(model => (
                <Select.Option key={model.id} value={model.id}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="euro_standard"
            label={t('trucks.euroStandard')}
          >
            <Select placeholder={t('trucks.selectEuroStandard')} allowClear>
              {euroStandards.map(euro => (
                <Select.Option key={euro.value} value={euro.value}>
                  {euro.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transmission_type"
            label={t('trucks.transmissionType')}
          >
            <Select placeholder={t('trucks.selectTransmission')} allowClear>
              {transmissionTypes.map(t => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="client"
            label={t('trucks.owner')}
          >
            <Select
              placeholder={t('trucks.ownerSearchPlaceholder')}
              allowClear
              showSearch
              filterOption={false}
              onSearch={handleClientSearch}
              loading={clientsLoading}
              options={clients.map(c => ({
                value: c.id,
                label: c.phone ? `${c.name} (${c.phone})` : c.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label={t('truckDetail.notes')}
          >
            <Input.TextArea rows={3} placeholder={t('trucks.notesPlaceholder')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? t('common.saveChanges') : t('trucks.createTruck')}
              </Button>
              <Button onClick={() => navigate('/trucks')}>{t('common.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default TruckFormPage;