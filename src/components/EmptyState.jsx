import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

function EmptyState({
  description,
  buttonText,
  onButtonClick,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
}) {
  const { t } = useTranslation();
  return (
    <Empty image={image} description={description || t('emptyState.noData')}>
      {buttonText && onButtonClick && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </Empty>
  );
}

export default EmptyState;