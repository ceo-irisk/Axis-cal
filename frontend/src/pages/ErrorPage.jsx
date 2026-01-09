import { useNavigate } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function ErrorPage({ error }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/logo.svg" 
            alt="Axis Calendar" 
            className="w-24 h-24 mx-auto opacity-50"
          />
        </div>

        {/* Error icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Что-то пошло не так</h1>
        
        <p className="text-muted-foreground mb-2">
          Произошла ошибка при загрузке страницы.
        </p>

        {error && (
          <p className="text-xs text-muted-foreground mb-8 font-mono bg-accent p-3 rounded-lg">
            {error.toString()}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
          
          <Button
            onClick={() => navigate('/')}
            className="bg-[#085C53] hover:bg-[#074a44] flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
}
