import { Card, CardContent, CardHeader } from "../ui/card";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Info } from "lucide-react";

export function KnockoutStage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pt-2 pb-12">
      <div className="flex items-center gap-2 border-b dark:border-gray-700 pb-2">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400">
          {t('predictions.knockoutStage')}
        </h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{t('predictions.knockoutTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Bracket UI placeholder */}
      <div 
        className="flex gap-8 overflow-x-auto pb-8 pt-10 px-4 min-h-[800px] relative items-stretch cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          const ele = e.currentTarget;
          ele.dataset.isDown = 'true';
          ele.dataset.startX = e.pageX.toString();
          ele.dataset.scrollLeft = ele.scrollLeft.toString();
        }}
        onMouseLeave={(e) => {
          e.currentTarget.dataset.isDown = 'false';
        }}
        onMouseUp={(e) => {
          e.currentTarget.dataset.isDown = 'false';
        }}
        onMouseMove={(e) => {
          const ele = e.currentTarget;
          if (ele.dataset.isDown !== 'true') return;
          e.preventDefault();
          const startX = parseFloat(ele.dataset.startX || '0');
          const scrollLeft = parseFloat(ele.dataset.scrollLeft || '0');
          const x = e.pageX;
          const walk = (x - startX) * 2; // Scroll-fast
          ele.scrollLeft = scrollLeft - walk;
        }}
      >
        {['stageRoundOf32', 'stageRoundOf16', 'stageQuarterFinals', 'stageSemiFinals', 'stageFinal'].map((stage, idx) => {
          const numMatches = Math.pow(2, 4 - idx);
          return (
            <div key={stage} className="flex flex-col justify-around min-w-[200px] relative">
              <h3 className="text-center font-bold text-gray-700 dark:text-gray-300 mb-4 absolute -top-10 w-full">{t(`predictions.${stage}`)}</h3>
              {Array.from({ length: numMatches }).map((_, i) => (
                <div key={i} className="relative py-2 flex flex-col justify-center flex-1">
                  <Card className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm relative z-10 ${idx === 4 ? 'border-purple-500 border-2 shadow-purple-200 dark:shadow-purple-900/20' : ''}`}>
                    <CardHeader className={`p-2 pb-1 border-b dark:border-gray-700 ${idx === 4 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                      <span className={`text-xs font-bold ${idx === 4 ? 'text-purple-700 dark:text-purple-400' : 'text-gray-500 dark:text-gray-200'}`}>
                        {idx === 4 ? t('predictions.stageFinal') : `${t('predictions.matchTitle')} ${Math.pow(2, 5) - Math.pow(2, 5 - idx) + i + 1}`}
                      </span>
                    </CardHeader>
                    <CardContent className="p-2 flex flex-col gap-1">
                      <div className="flex justify-between items-center border-b dark:border-gray-700 pb-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('predictions.tbdTeam')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('predictions.tbdTeam')}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Connectors */}
                  {idx < 4 && (
                    <>
                      <div className="absolute top-1/2 -right-4 w-4 border-t-2 border-gray-300 dark:border-gray-600"></div>
                      {i % 2 === 0 && (
                        <div className="absolute top-1/2 -right-4 w-0 border-r-2 border-gray-300 dark:border-gray-600 h-[50%]"></div>
                      )}
                      {i % 2 === 1 && (
                        <div className="absolute top-0 -right-4 w-0 border-r-2 border-gray-300 dark:border-gray-600 h-[50%]"></div>
                      )}
                    </>
                  )}
                  {idx > 0 && (
                    <div className="absolute top-1/2 -left-4 w-4 border-t-2 border-gray-300 dark:border-gray-600"></div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors duration-200 opacity-50">
        <p className="text-gray-600 dark:text-gray-300 font-medium">{t('predictions.tbd')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-200 mt-2">{t('predictions.knockoutDesc')}</p>
      </div>
    </div>
  );
}
