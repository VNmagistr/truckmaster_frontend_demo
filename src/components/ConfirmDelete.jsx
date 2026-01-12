import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { confirm } = Modal;

export const showDeleteConfirm = ({
  title = 'Видалити запис?',
  content = 'Ця дія незворотна. Ви впевнені, що хочете видалити цей запис?',
  onOk,
  onCancel,
}) => {
  confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    content,
    okText: 'Так, видалити',
    okType: 'danger',
    cancelText: 'Скасувати',
    onOk,
    onCancel,
  });
};

export default showDeleteConfirm;