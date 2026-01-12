import React from 'react';
import { Tag } from 'antd';
import { ORDER_STATUSES, REMINDER_PRIORITIES, REMINDER_STATUSES } from '../utils/constants';

function StatusTag({ status, type = 'order' }) {
  let config;

  switch (type) {
    case 'order':
      config = ORDER_STATUSES[status];
      break;
    case 'priority':
      config = REMINDER_PRIORITIES[status];
      break;
    case 'reminder':
      config = REMINDER_STATUSES[status];
      break;
    default:
      config = { label: status, color: 'default' };
  }

  if (!config) {
    return <Tag>{status}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
}

export default StatusTag;