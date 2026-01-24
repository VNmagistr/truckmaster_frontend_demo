import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.iconWrapper}>
          🚚
        </div>
        <h1 style={styles.title}>TruckMaster CRM</h1>
        <p style={styles.subtitle}>
          Система управління автопарком та сервісом
        </p>
        
        <div style={styles.buttonGroup}>
          <button 
            style={styles.primaryButton} 
            onClick={() => navigate('/login')}
          >
            Увійти
          </button>
          
          <button 
            style={styles.secondaryButton} 
            onClick={() => window.open('https://github.com/VNmagistr', '_blank')}
          >
            GitHub
          </button>
        </div>
      </div>
      
      <div style={styles.backgroundOverlay}></div>
    </div>
  );
};

// Стилі (CSS-in-JS для швидкості, або можна винести в Welcome.css)
const styles = {
  container: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#0f172a', // Темний фон
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    zIndex: 2,
    textAlign: 'center',
    padding: '2rem',
    background: 'rgba(30, 41, 59, 0.7)', // Напівпрозора картка
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  iconWrapper: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', // Градієнтний текст
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '2rem',
    fontSize: '1rem',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    zIndex: 1,
  }
};

export default Welcome;