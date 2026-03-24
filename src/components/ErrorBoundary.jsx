import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Щось пішло не так"
          subTitle={this.state.error?.message || 'Невідома помилка'}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Перезавантажити сторінку
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
