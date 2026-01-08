import { FileText } from 'lucide-react';

export const ReportsSettings = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Отчеты</h3>
      </div>
      
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Раздел отчетов будет доступен позже</p>
      </div>
    </div>
  );
};
