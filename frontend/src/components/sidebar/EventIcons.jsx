import { Square, CheckCircle2, Zap, Video } from 'lucide-react';

export const EventIcons = ({ event }) => {
  const icons = [];
  if (event.is_blocked) icons.push(<Square key="blocked" className="w-3 h-3 text-red-500 fill-red-500" />);
  if (event.is_completed) icons.push(<CheckCircle2 key="completed" className="w-3 h-3 text-green-500" />);
  if (event.is_urgent) icons.push(<Zap key="urgent" className="w-3 h-3 text-amber-500 fill-amber-500" />);
  if (event.is_video_call) icons.push(<Video key="video" className="w-3 h-3 text-blue-500" />);
  if (icons.length === 0) return null;
  return <div className="flex items-center gap-0.5">{icons}</div>;
};
