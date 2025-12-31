import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, User, Shield, UserCog } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const UsersPanel = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (userData) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
        toast.success('Пользователь обновлён');
      } else {
        await createUser(userData);
        toast.success('Пользователь создан');
      }
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await deleteUser(id);
      toast.success('Пользователь удалён');
      fetchUsers();
    } catch (e) {
      toast.error('Ошибка удаления');
    }
  };

  if (!isAdmin?.()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Доступ запрещён</h2>
          <p className="text-muted-foreground">Только администраторы могут управлять пользователями</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управление пользователями системы</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Добавить
        </Button>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Нет пользователей</p>
        </div>
      ) : (
        <div className="card-glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Имя</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Роль</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-violet-500" />
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' 
                        ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' 
                        : user.role === 'assistant'
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                        : 'bg-accent text-muted-foreground'
                    }`}>
                      {user.role === 'admin' ? 'Администратор' : user.role === 'assistant' ? 'Помощник' : 'Пользователь'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setEditingUser(user); setShowModal(true); }}
                        className="p-2 rounded-lg hover:bg-accent"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-500"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
          </DialogHeader>
          <UserForm 
            initialData={editingUser}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditingUser(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialData?.role || 'user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (!initialData && !password) {
      toast.error('Укажите пароль');
      return;
    }
    
    const data = { name: name.trim(), email: email.trim(), role };
    if (password) data.password = password;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Имя *</Label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Иван Иванов" 
          className="mt-1" 
        />
      </div>
      
      <div>
        <Label>Email *</Label>
        <Input 
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="user@example.com" 
          className="mt-1" 
        />
      </div>
      
      <div>
        <Label>{initialData ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}</Label>
        <Input 
          type="password"
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="••••••••" 
          className="mt-1" 
        />
      </div>
      
      <div>
        <Label>Роль</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Пользователь</SelectItem>
            <SelectItem value="assistant">Помощник</SelectItem>
            <SelectItem value="admin">Администратор</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};

export default UsersPanel;
