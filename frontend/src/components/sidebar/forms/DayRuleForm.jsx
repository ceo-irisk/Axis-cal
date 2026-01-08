import { useState } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { DialogFooter } from '../../ui/dialog';

export const DayRuleForm = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ruleType, setRuleType] = useState(initialData?.rule_type || 'max_meetings');
  const [value, setValue] = useState(initialData?.value || 8);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      rule_type: ruleType,
      value: parseInt(value),
      is_active: initialData?.is_active !== undefined ? initialData.is_active : true
    });
  };

  const ruleTypes = [
    { value: 'max_meetings', label: 'Максимум встреч', unit: 'встреч' },
    { value: 'min_break', label: 'Минимальный перерыв', unit: 'минут' },
    { value: 'max_hours', label: 'Максимум рабочих часов', unit: 'часов' },
    { value: 'max_consecutive', label: 'Максимум событий подряд', unit: 'событий' },
    { value: 'required_lunch', label: 'Обязательный обед', unit: 'минут' },
  ];

  const currentUnit = ruleTypes.find(t => t.value === ruleType)?.unit || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название правила</Label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Максимум встреч"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Описание</Label>
        <Input 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Максимальное количество встреч в день"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Тип правила</Label>
        <Select value={ruleType} onValueChange={setRuleType}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ruleTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Значение ({currentUnit})</Label>
        <Input 
          type="number" 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          min="0"
          className="mt-1"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
};
