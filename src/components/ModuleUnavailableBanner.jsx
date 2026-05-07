import React from 'react';
import { Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

function ModuleUnavailableBanner({ moduleName }) {
  const { t } = useTranslation();
  const description = moduleName
    ? t('errors.moduleUnavailableBanner', { name: moduleName })
    : t('errors.moduleUnavailableBannerGeneric');

  return (
    <Alert
      icon={<LockOutlined />}
      showIcon
      type="warning"
      message={t('errors.moduleUnavailable')}
      description={description}
      style={{ maxWidth: 600, margin: '48px auto' }}
    />
  );
}

export default ModuleUnavailableBanner;
