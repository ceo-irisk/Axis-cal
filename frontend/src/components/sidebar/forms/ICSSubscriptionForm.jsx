import { useState } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { DialogFooter } from '../../ui/dialog';

export const ICSSubscriptionForm = ({ onSave, onCancel }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || !name.trim()) return;
    setLoading(true);
    try {
      await onSave({ url: url.trim(), name: name.trim(), color });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название календаря</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple Calendar" className="mt-1" />
      </div>
      <div>
        <Label>URL (.ics)</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1" />
        <p className="text-xs text-muted-foreground mt-1">Ссылка на публичный .ics файл календаря</p>
      </div>
      <div>
        <Label>Цвет</Label>
        <div className="flex gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Подключение...' : 'Подключить'}
        </Button>
      </DialogFooter>
    </form>
  );
};
