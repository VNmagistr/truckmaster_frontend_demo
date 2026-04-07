import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Spin, Alert } from 'antd';
import { ScanOutlined } from '@ant-design/icons';

const SUPPORTED = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function BarcodeScanner({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!open) { stopCamera(); return; }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!SUPPORTED) {
          setError('Barcode Detection API не підтримується. Оновіть Chrome або введіть артикул вручну.');
          return;
        }

        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e', 'data_matrix'],
        });

        setReady(true);

        const scan = async () => {
          if (cancelled) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const results = await detectorRef.current.detect(videoRef.current);
            if (results.length > 0) {
              onDetected(results[0].rawValue);
              return;
            }
          } catch { /* ignore frame errors */ }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);

      } catch {
        if (!cancelled) setError('Не вдалося отримати доступ до камери. Перевірте дозволи браузера.');
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onDetected, stopCamera]);

  const corners = [
    { top: '12%', left: '8%',  borderTop: '3px solid #f5c518', borderLeft:  '3px solid #f5c518' },
    { top: '12%', right: '8%', borderTop: '3px solid #f5c518', borderRight: '3px solid #f5c518' },
    { bottom: '12%', left:  '8%', borderBottom: '3px solid #f5c518', borderLeft:  '3px solid #f5c518' },
    { bottom: '12%', right: '8%', borderBottom: '3px solid #f5c518', borderRight: '3px solid #f5c518' },
  ];

  return (
    <Modal
      title={<span><ScanOutlined style={{ marginRight: 8 }} />Сканер штрих-коду</span>}
      open={open}
      onCancel={() => { stopCamera(); onClose(); }}
      footer={null}
      destroyOnClose
      width={380}
      styles={{ body: { padding: 16 } }}
    >
      {!ready && !error && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 12, color: '#666' }}>Підключення камери…</p>
        </div>
      )}

      {error && <Alert type="warning" message={error} showIcon style={{ marginBottom: 8 }} />}

      <div style={{
        position: 'relative',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        display: ready ? 'block' : 'none',
      }}>
        <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted playsInline />
        {/* Scan line */}
        <div style={{
          position: 'absolute', left: '5%', right: '5%',
          top: '50%', transform: 'translateY(-50%)',
          height: 2, background: '#f5c518',
          boxShadow: '0 0 10px 3px rgba(245,197,24,0.6)',
        }} />
        {/* Corner brackets */}
        {corners.map((style, i) => (
          <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...style }} />
        ))}
      </div>

      {ready && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: 10, marginBottom: 0, fontSize: 13 }}>
          Наведіть камеру на штрих-код або QR-код
        </p>
      )}
    </Modal>
  );
}
