import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '50px auto',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#1a1a2e',
          color: '#e2e8f0',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚠️ Error de Aplicación</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            {this.state.error?.message || 'Algo salió mal'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
