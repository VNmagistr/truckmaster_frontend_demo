import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

function EmptyState({
  description = 'Немає даних',
  buttonText,
  onButtonClick,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
}) {
  return (
    <Empty image={image} description={description}>
      {buttonText && onButtonClick && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onButtonClick}>
          {buttonText}
        </Button>
      )}
    </Empty>
  );
}

export default EmptyState;