import { DndContext, closestCenter, KeyboardSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SortableItem } from "../SortableItem";
import { useTranslation } from 'react-i18next';

interface GroupStageProps {
  groupPredictions: Record<string, string[]>;
  effectiveIsLocked: boolean;
  handleDragEnd: (event: any, groupLetter: string) => void;
}

export function GroupStage({ groupPredictions, effectiveIsLocked, handleDragEnd }: GroupStageProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2 transition-colors duration-200">
        {t('predictions.groupStage')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify transition-colors duration-200">
        {t('predictions.groupStageDesc')}
      </p>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupPredictions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupLetter, teams]) => (
        <Card key={groupLetter} className={`overflow-hidden border-t-4 border-t-blue-600 ${groupLetter === 'A' ? 'group-card-A' : ''}`}>
          <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-3 px-4 border-b dark:border-gray-700 transition-colors duration-200">
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{t('predictions.group')} {groupLetter}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, groupLetter)}
              autoScroll={false}
            >
              <SortableContext 
                items={(teams as string[]) as any}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {(teams as string[]).map((team, index) => (
                    <SortableItem key={team} id={team} team={team} index={index} disabled={effectiveIsLocked} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}
