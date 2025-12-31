import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { X, Send, Loader2, FileText, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { getSurveyQuestions, submitSurveyResponse, getSurveyResponse } from '../lib/api';
import { toast } from 'sonner';

export const SurveyModal = ({ date, onClose, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingResponse, setExistingResponse] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [questionsRes, responseRes] = await Promise.all([
          getSurveyQuestions(),
          getSurveyResponse(dateStr)
        ]);
        
        setQuestions(questionsRes.data || []);
        
        if (responseRes.data) {
          setExistingResponse(responseRes.data);
          setResponses(responseRes.data.responses || {});
          setShowSummary(true);
        }
      } catch (error) {
        console.error('Error fetching survey data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dateStr]);

  const handleSubmit = async () => {
    // Validate required responses
    const unanswered = questions.filter(q => !responses[q.id] && q.is_active);
    if (unanswered.length > 0) {
      toast.error('Пожалуйста, ответьте на все вопросы');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSurveyResponse(dateStr, responses);
      setExistingResponse(result.data);
      setShowSummary(true);
      toast.success('Опрос завершён');
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Ошибка сохранения опроса');
    } finally {
      setSubmitting(false);
    }
  };

  const updateResponse = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-secondary-text" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="survey-modal-overlay">
      <div 
        className="modal-content max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="survey-modal"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              {showSummary ? 'Итоги дня' : 'Завершение дня'}
            </h2>
            <p className="text-secondary-text text-sm">
              {format(date, 'd MMMM yyyy', { locale: ru })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="close-survey-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSummary && existingResponse?.ai_summary ? (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#085C53]/10 to-indigo-500/10 border border-[#085C53]/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="font-medium text-teal-300">AI-отчёт дня</h3>
              </div>
              <div 
                className="prose prose-invert prose-sm max-w-none"
                data-testid="ai-summary"
              >
                <pre className="whitespace-pre-wrap font-sans text-sm text-secondary-text leading-relaxed">
                  {existingResponse.ai_summary}
                </pre>
              </div>
            </div>

            {/* Response summary */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-secondary-text">Ваши ответы</h3>
              {questions.map(q => (
                <div key={q.id} className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-secondary-text mb-1">{q.question}</p>
                  <p className="font-medium">
                    {responses[q.id] || existingResponse.responses?.[q.id] || '—'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button 
                onClick={() => setShowSummary(false)}
                variant="ghost"
              >
                Редактировать ответы
              </Button>
              <Button 
                onClick={onComplete}
                className="btn-primary"
                data-testid="complete-survey-button"
              >
                Готово
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.length === 0 ? (
              <p className="text-center text-secondary-text py-8">
                Нет вопросов для опроса. Добавьте их в панели администратора.
              </p>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="space-y-2" data-testid={`survey-question-${q.id}`}>
                  <label className="text-sm font-medium">
                    <span className="text-secondary-text mr-2">{idx + 1}.</span>
                    {q.question}
                  </label>
                  
                  {q.question_type === 'text' && (
                    <Textarea
                      value={responses[q.id] || ''}
                      onChange={(e) => updateResponse(q.id, e.target.value)}
                      placeholder="Ваш ответ..."
                      rows={3}
                      className="bg-white/5 border-white/10 rounded-xl resize-none"
                      data-testid={`survey-answer-${q.id}`}
                    />
                  )}
                  
                  {q.question_type === 'scale' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateResponse(q.id, String(value))}
                          className={`
                            w-12 h-12 rounded-xl flex items-center justify-center font-medium
                            transition-colors border
                            ${responses[q.id] === String(value) 
                              ? 'bg-white text-black border-white' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                          `}
                          data-testid={`survey-scale-${q.id}-${value}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {q.question_type === 'choice' && q.options && (
                    <div className="space-y-2">
                      {q.options.map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateResponse(q.id, option)}
                          className={`
                            w-full p-3 rounded-xl text-left transition-colors border
                            ${responses[q.id] === option 
                              ? 'bg-white/10 border-white/20' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                          `}
                          data-testid={`survey-choice-${q.id}-${option}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {questions.length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <Button variant="ghost" onClick={onClose}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary"
                  data-testid="submit-survey-button"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Генерация отчёта...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Завершить и получить отчёт
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyModal;
