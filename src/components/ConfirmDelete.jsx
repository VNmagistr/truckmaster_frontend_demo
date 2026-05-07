import React from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import i18n from '../i18n';

const { confirm } = Modal;

export const showDeleteConfirm = ({
  title,
  content,
  onOk,
  onCancel,
}) => {
  confirm({
    title: title || i18n.t('confirmDelete.title'),
    icon: <ExclamationCircleOutlined />,
    content: content || i18n.t('confirmDelete.content'),
    okText: i18n.t('confirmDelete.okText'),
    okType: 'danger',
    cancelText: i18n.t('common.cancel'),
    onOk,
    onCancel,
  });
};

export default showDeleteConfirm;