import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { notification, Button } from 'antd';
import { useTranslation } from 'react-i18next';

export default function PWAUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Перевіряємо оновлення кожні 60 хвилин
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    notification.info({
      key: 'pwa-update',
      message: t('pwa.updateAvailable'),
      description: t('pwa.updateDescription'),
      duration: 0,
      btn: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            updateServiceWorker(true);
            notification.destroy('pwa-update');
          }}
        >
          {t('pwa.update')}
        </Button>
      ),
      onClose: () => setNeedRefresh(false),
    });
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
