import { FileText } from 'lucide-react';

export const SurveysSettings = ({ questions }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Вопросы опросов</h3>
      </div>
      
      {questions.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Нет вопросов</p>
      ) : (
        <div className="space-y-2">
          {questions.map(q => (
            <div key={q.id} className="p-3 rounded-lg bg-accent/50">
              <p className="text-sm">{q.text}</p>
              <p className="text-xs text-muted-foreground mt-1">Тип: {q.question_type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
