import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFoundPage() {
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

        {/* 404 */}
        <h1 className="text-9xl font-bold text-[#085C53] mb-4">404</h1>
        
        <h2 className="text-2xl font-semibold mb-2">Страница не найдена</h2>
        
        <p className="text-muted-foreground mb-8">
          Запрашиваемая страница не существует или была удалена.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
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
