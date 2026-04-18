import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SortableItem: React.FC<{ id: string, team: string, index: number, disabled?: boolean }> = ({ id, team, index, disabled = false }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : (disabled ? 0.6 : 1),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
      className={`flex items-center gap-2 p-2 sm:p-3 rounded-md border transition-colors duration-200 touch-none ${
        isDragging 
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      } ${
        disabled 
          ? 'bg-gray-50 dark:bg-gray-800/50' 
          : 'cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {!disabled && (
        <div className={`p-0.5 sm:p-1 shrink-0 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}
      <div className={`w-5 h-5 sm:w-6 sm:h-6 flex shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
        index === 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 
        index === 1 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-500' : 
        'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        {index + 1}
      </div>
      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{t(`teams.${team}`)}</span>
    </div>
  );
}
