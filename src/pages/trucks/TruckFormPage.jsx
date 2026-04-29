import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, message, Space, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { trucksAPI, clientsAPI, baseModelsAPI, botAPI } from '../../api';
import { PageHeader, LoadingSpinner } from '../../components';
import useEnumsStore from '../../store/enumsStore';

function TruckFormPage() {
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
        message.error('Помилка ініціалізації');
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
      const ownerId = typeof data.client === 'object' ? data.client.id : data.client;

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
      message.error('Не вдалося завантажити дані вантажівки');
      navigate('/trucks');
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await trucksAPI.update(id, values);
        message.success('Вантажівку оновлено');
      } else {
        await trucksAPI.create(values);
        message.success('Вантажівку створено');
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
        message.error('Не вдалося зберегти вантажівку');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Редагувати вантажівку' : 'Нова вантажівка'}
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
            label="Номерний знак"
            rules={[{ required: true, message: 'Введіть номерний знак' }]}
          >
            <Input placeholder="AA0000BB" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="full_vin"
            label="Повний VIN код"
            rules={[
              { required: true, message: 'Введіть VIN код' },
              { len: 17, message: 'VIN код має містити 17 символів' },
            ]}
          >
            <Input placeholder="17 символів" maxLength={17} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="specific_model_name"
            label="Модель (уточнення)"
            rules={[{ required: true, message: 'Введіть модель' }]}
          >
            <Input placeholder="Наприклад: 35C15, 70C17" />
          </Form.Item>

          <Form.Item
            name="base_model"
            label="Базова модель"
          >
            <Select placeholder="Оберіть базову модель" allowClear>
              {baseModels.map(model => (
                <Select.Option key={model.id} value={model.id}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="euro_standard"
            label="Євростандарт"
          >
            <Select placeholder="Оберіть євростандарт" allowClear>
              {euroStandards.map(euro => (
                <Select.Option key={euro.value} value={euro.value}>
                  {euro.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transmission_type"
            label="Тип КПП"
          >
            <Select placeholder="Оберіть тип КПП" allowClear>
              {transmissionTypes.map(t => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="client"
            label="Власник"
          >
            <Select
              placeholder="Введіть ім'я або телефон для пошуку"
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

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                {isEdit ? 'Зберегти зміни' : 'Створити вантажівку'}
              </Button>
              <Button onClick={() => navigate('/trucks')}>Скасувати</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default TruckFormPage;