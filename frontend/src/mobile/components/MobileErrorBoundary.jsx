import React from 'react';

export class MobileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mobile component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-500 mb-2">
              Ошибка загрузки
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Попробуйте обновить страницу или перейти на десктопную версию
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#085C53] text-white rounded-lg hover:bg-[#074a44] transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
