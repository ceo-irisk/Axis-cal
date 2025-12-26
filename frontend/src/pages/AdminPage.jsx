import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { 
  getUsers, createUser, updateUser, deleteUser, toggleUserActive,
  getSurveyQuestions, createSurveyQuestion, deleteSurveyQuestion,
  getRules, createRule, updateRule, deleteRule,
  getEventFields, updateEventFields
} from '../lib/api';
import SettingsSidebar from '../components/SettingsSidebar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, ClipboardList, Shield, Settings, Plus, Trash2, Edit, Power, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [rules, setRules] = useState([]);
  const [eventFields, setEventFields] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, questionsRes, rulesRes, fieldsRes] = await Promise.all([
        getUsers(),
        getSurveyQuestions(),
        getRules(),
        getEventFields()
      ]);
      setUsers(usersRes.data || []);
      setQuestions(questionsRes.data || []);
      setRules(rulesRes.data || []);
      setEventFields(fieldsRes.data?.fields || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // User handlers
  const handleSaveUser = async (userData) => {
    try {
      if (editingItem) {
        await updateUser(editingItem.id, userData);
        toast.success('Пользователь обновлён');
      } else {
        await createUser(userData);
        toast.success('Пользователь создан');
      }
      setShowUserModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await deleteUser(userId);
      toast.success('Пользователь удалён');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await toggleUserActive(userId);
      fetchData();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  // Question handlers
  const handleSaveQuestion = async (questionData) => {
    try {
      await createSurveyQuestion(questionData.question, questionData.question_type, questionData.options);
      toast.success('Вопрос добавлен');
      setShowQuestionModal(false);
      fetchData();
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await deleteSurveyQuestion(questionId);
      toast.success('Вопрос удалён');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  // Rule handlers
  const handleSaveRule = async (ruleData) => {
    try {
      if (editingItem) {
        await updateRule(editingItem.id, ruleData.name, ruleData.description, ruleData.rule_type, ruleData.value);
        toast.success('Правило обновлено');
      } else {
        await createRule(ruleData.name, ruleData.description, ruleData.rule_type, ruleData.value);
        toast.success('Правило создано');
      }
      setShowRuleModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Удалить правило?')) return;
    try {
      await deleteRule(ruleId);
      toast.success('Правило удалено');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  // Event fields handlers
  const handleSaveFields = async () => {
    try {
      await updateEventFields(eventFields);
      toast.success('Поля событий обновлены');
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const addField = () => {
    setEventFields([...eventFields, { name: '', field_type: 'text', required: false, options: [] }]);
  };

  const removeField = (index) => {
    setEventFields(eventFields.filter((_, i) => i !== index));
  };

  const updateField = (index, key, value) => {
    const updated = [...eventFields];
    updated[index][key] = value;
    setEventFields(updated);
  };

  if (!isAdmin()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-secondary-text" />
          <h1 className="text-xl font-semibold">Доступ запрещён</h1>
          <p className="text-secondary-text mt-2">Только администраторы имеют доступ к этой странице</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background" data-testid="admin-page">
      <Sidebar />
      
      <main className="main-content flex-1" style={{ marginRight: 0 }}>
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад к календарю</span>
            </button>
            <h1 className="text-3xl font-semibold tracking-tight">Панель администратора</h1>
            <p className="text-muted-foreground mt-1">Управление пользователями и настройками системы</p>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass p-1 rounded-2xl">
              <TabsTrigger value="users" className="rounded-xl px-4 py-2 data-[state=active]:bg-white/10" data-testid="admin-tab-users">
                <Users className="w-4 h-4 mr-2" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger value="questions" className="rounded-xl px-4 py-2 data-[state=active]:bg-white/10" data-testid="admin-tab-questions">
                <ClipboardList className="w-4 h-4 mr-2" />
                Вопросы опроса
              </TabsTrigger>
              <TabsTrigger value="rules" className="rounded-xl px-4 py-2 data-[state=active]:bg-white/10" data-testid="admin-tab-rules">
                <Shield className="w-4 h-4 mr-2" />
                Правила дня
              </TabsTrigger>
              <TabsTrigger value="fields" className="rounded-xl px-4 py-2 data-[state=active]:bg-white/10" data-testid="admin-tab-fields">
                <Settings className="w-4 h-4 mr-2" />
                Поля событий
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Пользователи системы</h2>
                <Button onClick={() => { setEditingItem(null); setShowUserModal(true); }} className="btn-primary" data-testid="add-user-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
              </div>

              <div className="card-glass space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors" data-testid={`user-item-${u.id}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-secondary-text">{u.email}</p>
                      </div>
                      <span className={`badge ${u.role === 'admin' ? 'badge-urgent' : u.role === 'manager' ? 'badge-meeting' : 'badge-call'}`}>
                        {u.role === 'admin' ? 'Админ' : u.role === 'manager' ? 'Руководитель' : 'Помощник'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleActive(u.id)} title={u.is_active ? 'Деактивировать' : 'Активировать'}>
                        <Power className={`w-4 h-4 ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(u); setShowUserModal(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-secondary-text py-8">Нет пользователей</p>
                )}
              </div>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Вопросы для ежедневного опроса</h2>
                <Button onClick={() => setShowQuestionModal(true)} className="btn-primary" data-testid="add-question-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
              </div>

              <div className="card-glass space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5" data-testid={`question-item-${q.id}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-secondary-text font-mono">{idx + 1}.</span>
                      <div>
                        <p className="font-medium">{q.question}</p>
                        <p className="text-sm text-secondary-text">Тип: {q.question_type === 'text' ? 'Текст' : q.question_type === 'scale' ? 'Шкала' : 'Выбор'}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-center text-secondary-text py-8">Нет вопросов</p>
                )}
              </div>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Правила для проверки дня</h2>
                <Button onClick={() => { setEditingItem(null); setShowRuleModal(true); }} className="btn-primary" data-testid="add-rule-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
              </div>

              <div className="card-glass space-y-3">
                {rules.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5" data-testid={`rule-item-${r.id}`}>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-sm text-secondary-text">{r.description}</p>
                      <p className="text-xs text-secondary-text mt-1">Значение: {r.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(r); setShowRuleModal(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && (
                  <p className="text-center text-secondary-text py-8">Нет правил</p>
                )}
              </div>
            </TabsContent>

            {/* Event Fields Tab */}
            <TabsContent value="fields" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Дополнительные поля событий</h2>
                <div className="flex gap-2">
                  <Button onClick={addField} className="btn-secondary" data-testid="add-field-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить поле
                  </Button>
                  <Button onClick={handleSaveFields} className="btn-primary" data-testid="save-fields-button">
                    Сохранить
                  </Button>
                </div>
              </div>

              <div className="card-glass space-y-4">
                {eventFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(idx, 'name', e.target.value)}
                      placeholder="Название поля"
                      className="flex-1 bg-white/5 border-white/10"
                    />
                    <Select value={field.field_type} onValueChange={(v) => updateField(idx, 'field_type', v)}>
                      <SelectTrigger className="w-32 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Текст</SelectItem>
                        <SelectItem value="number">Число</SelectItem>
                        <SelectItem value="select">Выбор</SelectItem>
                        <SelectItem value="checkbox">Чекбокс</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(idx, 'required', e.target.checked)}
                        className="rounded"
                      />
                      Обязательное
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => removeField(idx)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
                {eventFields.length === 0 && (
                  <p className="text-center text-secondary-text py-8">Нет дополнительных полей</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* User Modal */}
      <UserModal 
        open={showUserModal} 
        onClose={() => { setShowUserModal(false); setEditingItem(null); }}
        onSave={handleSaveUser}
        user={editingItem}
      />

      {/* Question Modal */}
      <QuestionModal
        open={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        onSave={handleSaveQuestion}
      />

      {/* Rule Modal */}
      <RuleModal
        open={showRuleModal}
        onClose={() => { setShowRuleModal(false); setEditingItem(null); }}
        onSave={handleSaveRule}
        rule={editingItem}
      />
    </div>
  );
}

// User Modal Component
function UserModal({ open, onClose, onSave, user }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'assistant',
    timezone: 'Europe/Moscow'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        role: user.role,
        timezone: user.timezone || 'Europe/Moscow'
      });
    } else {
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'assistant',
        timezone: 'Europe/Moscow'
      });
    }
  }, [user, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-heavy border-white/10 max-w-md" data-testid="user-modal">
        <DialogHeader>
          <DialogTitle>{user ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Имя</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-white/5 border-white/10"
              data-testid="user-name-input"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-white/5 border-white/10"
              data-testid="user-email-input"
            />
          </div>
          {!user && (
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-white/5 border-white/10"
                data-testid="user-password-input"
              />
            </div>
          )}
          <div>
            <Label>Роль</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger className="bg-white/5 border-white/10" data-testid="user-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="manager">Руководитель</SelectItem>
                <SelectItem value="assistant">Помощник</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Часовой пояс</Label>
            <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                <SelectItem value="Europe/London">Лондон (UTC+0)</SelectItem>
                <SelectItem value="America/New_York">Нью-Йорк (UTC-5)</SelectItem>
                <SelectItem value="Asia/Tokyo">Токио (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="btn-primary" data-testid="user-save-button">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Question Modal Component
function QuestionModal({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    question: '',
    question_type: 'text',
    options: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ question: '', question_type: 'text', options: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-heavy border-white/10 max-w-md" data-testid="question-modal">
        <DialogHeader>
          <DialogTitle>Новый вопрос</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Текст вопроса</Label>
            <Input
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
              className="bg-white/5 border-white/10"
              data-testid="question-text-input"
            />
          </div>
          <div>
            <Label>Тип ответа</Label>
            <Select value={formData.question_type} onValueChange={(v) => setFormData({ ...formData, question_type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Текстовый ответ</SelectItem>
                <SelectItem value="scale">Шкала 1-5</SelectItem>
                <SelectItem value="choice">Выбор из вариантов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="btn-primary" data-testid="question-save-button">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Rule Modal Component
function RuleModal({ open, onClose, onSave, rule }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'max_meetings',
    value: 8
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        rule_type: rule.rule_type,
        value: rule.value
      });
    } else {
      setFormData({
        name: '',
        description: '',
        rule_type: 'max_meetings',
        value: 8
      });
    }
  }, [rule, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-heavy border-white/10 max-w-md" data-testid="rule-modal">
        <DialogHeader>
          <DialogTitle>{rule ? 'Редактировать правило' : 'Новое правило'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-white/5 border-white/10"
              data-testid="rule-name-input"
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-white/5 border-white/10"
              data-testid="rule-description-input"
            />
          </div>
          <div>
            <Label>Тип правила</Label>
            <Select value={formData.rule_type} onValueChange={(v) => setFormData({ ...formData, rule_type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="max_meetings">Максимум встреч</SelectItem>
                <SelectItem value="min_break">Минимальный перерыв (мин)</SelectItem>
                <SelectItem value="max_hours">Максимум часов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Значение</Label>
            <Input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
              required
              className="bg-white/5 border-white/10"
              data-testid="rule-value-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="btn-primary" data-testid="rule-save-button">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
