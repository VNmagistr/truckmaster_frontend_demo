import React from 'react';
import { Button, Result } from 'antd';
import i18n from '../i18n';

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
          title={i18n.t('errors.somethingWentWrong')}
          subTitle={this.state.error?.message || i18n.t('errors.unknownError')}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {i18n.t('errors.reloadPage')}
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
