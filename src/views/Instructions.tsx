"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen, Trophy, Target, AlertCircle, HelpCircle, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

import { useTranslation } from 'react-i18next';

export default function Instructions() {
  const { t } = useTranslation();

  return (
    <div id="tutorial-rules-content" className="max-w-4xl mx-auto space-y-8">
      {/* Hero Header Area for Instructions */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {t('instructions.manual')}
        </h1>
        <p className="text-gray-500 dark:text-gray-200 max-w-2xl mx-auto">
          {t('instructions.manualDesc')}
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Panel 1: Cómo Jugar */}
        <AccordionItem value="como-jugar" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('instructions.howToPlay')}</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 text-gray-700 dark:text-gray-300">
            <div className="space-y-4">
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('instructions.groupStageLabel')}</h4>
                  <p className="text-sm">{t('instructions.groupStageDesc1')}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('instructions.indivMatchesLabel')}</h4>
                  <p className="text-sm">{t('instructions.indivMatchesDesc')}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                   <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('instructions.specialQuestionsLabel')}</h4>
                  <p className="text-sm">{t('instructions.specialQuestionsDesc1')}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('instructions.knockoutLabel')}</h4>
                  <p className="text-sm">{t('instructions.knockoutDesc1')}</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800">
                <strong>{t('instructions.importantDraw')}</strong> {t('instructions.importantDraftDesc')}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 2: Puntuación */}
        <AccordionItem value="puntuacion" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                <Trophy className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('instructions.points')}</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-6">
              
              {/* Groups & Matches */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">{t('instructions.groupStageLabel')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreExactPos')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+1</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scorePerfectGroup')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+3</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">{t('instructions.indivMatchesLabel')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreWinner')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+1</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreExactResult')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+2</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Knockout & Specials */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">{t('instructions.knockoutLabel')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreAdvance16')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+2</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreAdvance8')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+4</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreAdvance4')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+6</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreAdvance2')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+8</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-sm dark:text-gray-200">{t('instructions.scoreChampion')}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+15</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">{t('instructions.specialQuestionsLabel')}</h4>
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="text-sm dark:text-gray-200">{t('instructions.scoreSpecial')}</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded text-xs">+10</span>
                  </div>
                </div>
              </div>

            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 3: Amigos y Duelos */}
        <AccordionItem value="duelos" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('instructions.friendsAndDuels')}</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-4">
              <p>{t('instructions.friendsDesc1')}</p>
              
              <ul className="space-y-2 mt-4 ml-2">
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> {t('instructions.friendsLi1')}</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> {t('instructions.friendsLi2')}</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> {t('instructions.friendsLi3')}</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span> <strong>{t('instructions.friendsLi4')}</strong> {t('instructions.friendsLi5')}</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panel 4: Ligas Privadas */}
        <AccordionItem value="ligas" className="border-none bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('instructions.leagues')}</h3>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2 text-gray-700 dark:text-gray-300">
            <div className="space-y-3">
              <p className="italic text-gray-500 dark:text-gray-200 mb-2">{t('instructions.leagueDesc1')}</p>
              <p>{t('instructions.leagueDesc2')}</p>
              <p>{t('instructions.leagueDesc3')}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
