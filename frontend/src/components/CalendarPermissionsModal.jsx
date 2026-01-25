import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Edit, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getCalendarPermissions, grantCalendarPermission, revokeCalendarPermission, getUsers } from '../lib/api';
import { toast } from 'sonner';

const PERMISSION_LEVELS = [
  { value: 'view_busy', label: 'Только занятость', icon: Eye, description: 'Видно только "Занято"' },
  { value: 'read', label: 'Чтение', icon: Eye, description: 'Только просмотр событий' },
  { value: 'edit', label: 'Редактирование', icon: Edit, description: 'Просмотр и изменение событий' },
  { value: 'full', label: 'Полный доступ', icon: Shield, description: 'Все права включая удаление' },
];

export const CalendarPermissionsModal = ({ calendar, onClose, onUpdate }) => {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState('read');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [calendar.id]);

  const loadData = async () => {
    try {
      const [permsRes, usersRes] = await Promise.all([
        getCalendarPermissions(calendar.id),
        getUsers()
      ]);
      setPermissions(permsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    try {
      await grantCalendarPermission(calendar.id, selectedUserId, newPermissionLevel);
      setSelectedUserId('');
      setNewPermissionLevel('read');
      loadData();
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка выдачи доступа');
    }
  };

  const handleRevoke = async (userId) => {
    try {
      await revokeCalendarPermission(calendar.id, userId);
      loadData();
      onUpdate?.();
    } catch (e) {
      toast.error('Ошибка отзыва доступа');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Управление доступом</h2>
            <p className="text-sm text-muted-foreground mt-1">Календарь: {calendar.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {calendar.is_default && !calendar.is_public && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              🔒 Закрытый календарь: можно делиться только занятостью (другие не увидят детали событий)
            </p>
          </div>
        )}

        {/* Current permissions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Текущие доступы ({permissions.length})</h3>
          
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>
          ) : permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Нет пользователей с доступом</p>
          ) : (
            <div className="space-y-2">
              {permissions.map(perm => {
                const levelInfo = PERMISSION_LEVELS.find(l => l.value === perm.permission_level);
                const LevelIcon = levelInfo?.icon || Shield;
                
                return (
                  <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{perm.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{perm.user?.email || perm.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background text-xs">
                        <LevelIcon className="w-3 h-3" />
                        {levelInfo?.label}
                      </div>
                      <button 
                        onClick={() => handleRevoke(perm.user_id)}
                        className="p-1.5 rounded hover:bg-red-500/20"
                        title="Отозвать доступ"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new permission */}
        {(!calendar.is_default || calendar.is_public) && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Добавить пользователя
            </h3>
            
            <form onSubmit={handleGrant} className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Выберите пользователя</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите пользователя" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]" position="popper" sideOffset={5}>
                    {users
                      .filter(u => !permissions.find(p => p.user_id === u.id))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Уровень доступа</Label>
                <Select value={newPermissionLevel} onValueChange={setNewPermissionLevel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]" position="popper" sideOffset={5}>
                    {PERMISSION_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-start gap-2">
                          <level.icon className="w-4 h-4 mt-0.5" />
                          <div>
                            <p className="font-medium">{level.label}</p>
                            <p className="text-xs text-muted-foreground">{level.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full">
                Добавить доступ
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPermissionsModal;
