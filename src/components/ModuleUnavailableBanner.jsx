import React from 'react';
import { Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';

function ModuleUnavailableBanner({ moduleName }) {
  const description = moduleName
    ? `Модуль «${moduleName}» не підключено до вашого пакету. Зверніться до адміністратора для отримання доступу.`
    : 'Цей модуль наразі недоступний у вашому пакеті. Зверніться до адміністратора для отримання доступу.';

  return (
    <Alert
      icon={<LockOutlined />}
      showIcon
      type="warning"
      message="Модуль недоступний"
      description={description}
      style={{ maxWidth: 600, margin: '48px auto' }}
    />
  );
}

export default ModuleUnavailableBanner;
