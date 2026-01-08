import { useState } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { DialogFooter } from '../../ui/dialog';

export const EventStatusForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [color, setColor] = useState(initialData?.color || '#10b981');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) return;
    onSave({ name: name.trim(), label: label.trim(), color, order: initialData?.order || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Код (латиницей)</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="confirmed" className="mt-1" />
      </div>
      <div>
        <Label>Название</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Подтверждено" className="mt-1" />
      </div>
      <div>
        <Label>Цвет</Label>
        <div className="flex gap-2 mt-1">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};
