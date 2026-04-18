import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { GROUPS } from "../data";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

export const TEAM_CODES: Record<string, string> = {
  "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "República Checa": "cz",
  "Canadá": "ca", "Bosnia y Herzegovina": "ba", "Bosnia": "ba", "Qatar": "qa", "Suiza": "ch",
  "Brasil": "br", "Marruecos": "ma", "Haití": "ht", "Escocia": "gb-sct",
  "Estados Unidos": "us", "Paraguay": "py", "Australia": "au", "Turquía": "tr",
  "Alemania": "de", "Curazao": "cw", "Costa de Marfil": "ci", "Ecuador": "ec",
  "Países Bajos": "nl", "Japón": "jp", "Suecia": "se", "Túnez": "tn",
  "Bélgica": "be", "Egipto": "eg", "Irán": "ir", "Nueva Zelanda": "nz",
  "España": "es", "Cabo Verde": "cv", "Arabia Saudita": "sa", "Uruguay": "uy",
  "Francia": "fr", "Senegal": "sn", "Irak": "iq", "Noruega": "no",
  "Argentina": "ar", "Argelia": "dz", "Austria": "at", "Jordania": "jo",
  "Portugal": "pt", "República Democrática del Congo": "cd", "Uzbekistán": "uz", "Colombia": "co",
  "Inglaterra": "gb-eng", "Croacia": "hr", "Ghana": "gh", "Panamá": "pa",
};

// Generar el fixture lógicamente
const generateFixture = () => {
  const matchdays = [
    [[0, 1], [2, 3]], // Fecha 1: 1vs2, 3vs4
    [[0, 2], [3, 1]], // Fecha 2: 1vs3, 4vs2
    [[3, 0], [1, 2]]  // Fecha 3: 4vs1, 2vs3
  ];

  const dates = [
    ["Jue 11/06", "Vie 12/06", "Sáb 13/06", "Dom 14/06", "Lun 15/06", "Mar 16/06"],
    ["Mié 17/06", "Jue 18/06", "Vie 19/06", "Sáb 20/06", "Dom 21/06", "Lun 22/06"],
    ["Mar 23/06", "Mié 24/06", "Jue 25/06", "Vie 26/06", "Sáb 27/06", "Dom 28/06"]
  ];

  const times = ["13:00", "16:00", "19:00", "22:00"];

  const fixture: any[] = [[], [], []];

  for (let f = 0; f < 3; f++) {
    let matchCount = 0;
    // Ordenar grupos alfabéticamente
    const sortedGroups = Object.entries(GROUPS).sort(([a], [b]) => a.localeCompare(b));
    
    for (const [group, teams] of sortedGroups) {
      for (const [t1, t2] of matchdays[f]) {
        const dateIdx = Math.floor(matchCount / 4);
        const timeIdx = matchCount % 4;
        
        fixture[f].push({
          group,
          date: dates[f][dateIdx] || dates[f][dates[f].length - 1],
          time: times[timeIdx],
          team1: teams[t1],
          team2: teams[t2]
        });
        
        matchCount++;
      }
    }
  }

  return fixture;
};

const FIXTURE_DATA = generateFixture();

export const TeamFlag = ({ teamName }: { teamName: string }) => {
  const { t } = useTranslation();
  const code = TEAM_CODES[teamName];
  if (code) {
    return (
      <img 
        src={`https://flagcdn.com/w40/${code}.png`} 
        alt={`Bandera de ${t(`teams.${teamName}`)}`}
        className="w-6 h-4 object-cover rounded-sm shadow-sm flex-shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return <Flag className="w-5 h-5 text-gray-400 flex-shrink-0" />;
};

export function Fixture() {
  const { t } = useTranslation();
  const [currentFecha, setCurrentFecha] = useState(0);
  const [actualGroups, setActualGroups] = useState<Record<string, string[]>>(GROUPS);
  const [actualStandings, setActualStandings] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchActualResults = async () => {
      try {
        const docRef = doc(db, "results", "actual");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.groups) {
            const sanitizedGroups: Record<string, string[]> = {};
            for (const [groupLetter, teams] of Object.entries(data.groups)) {
              const currentTeams = GROUPS[groupLetter as keyof typeof GROUPS];
              if (currentTeams) {
                const validSavedTeams = (teams as string[]).filter(t => currentTeams.includes(t));
                const missingTeams = currentTeams.filter(t => !validSavedTeams.includes(t));
                sanitizedGroups[groupLetter] = [...validSavedTeams, ...missingTeams];
              }
            }
            // Fill in any missing groups
            for (const groupLetter of Object.keys(GROUPS)) {
              if (!sanitizedGroups[groupLetter]) {
                sanitizedGroups[groupLetter] = [...GROUPS[groupLetter as keyof typeof GROUPS]];
              }
            }
            setActualGroups(sanitizedGroups);
          }
          
          if (data.standings) {
            setActualStandings(data.standings);
          }
        }
      } catch (error) {
        console.error("Error fetching actual results:", error);
      }
    };
    fetchActualResults();
  }, []);

  const handlePrev = () => {
    setCurrentFecha((prev: number) => (prev > 0 ? prev - 1 : 2));
  };

  const handleNext = () => {
    setCurrentFecha((prev: number) => (prev < 2 ? prev + 1 : 0));
  };

  const matches = FIXTURE_DATA[currentFecha];

  // Agrupar partidos por fecha
  const groupedMatches: Record<string, any[]> = {};
  matches.forEach((match: any) => {
    if (!groupedMatches[match.date]) {
      groupedMatches[match.date] = [];
    }
    groupedMatches[match.date].push(match);
  });

  return (
    <div className="w-full max-w-6xl mx-auto mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fixture Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-gray-700 transition-colors duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-gray-900 dark:to-black text-white p-4 text-center">
            <h2 className="text-lg font-bold tracking-wider mb-4 text-white">{t('fixture.title')}</h2>
            <div className="flex items-center justify-between px-4">
              <button onClick={handlePrev} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-base">{t('fixture.matchday', { number: currentFecha + 1 })}</span>
              <button onClick={handleNext} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Matches */}
          <div className="bg-white dark:bg-gray-800 max-h-[600px] overflow-y-auto custom-scrollbar transition-colors duration-200">
            {Object.entries(groupedMatches).map(([date, dayMatches]) => (
              <div key={date}>
                <div className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 text-center py-1.5 text-sm font-bold border-y border-slate-200 dark:border-gray-600 uppercase tracking-wide transition-colors duration-200">
                  {date}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-gray-700">
                  {dayMatches.map((match, idx) => (
                    <div key={idx} className="flex items-center text-slate-800 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="w-14 sm:w-16 text-center py-3 text-xs sm:text-sm font-semibold text-slate-500 dark:text-gray-400 border-r border-slate-100 dark:border-gray-700 flex-shrink-0">
                        {match.time}
                      </div>
                      <div className="flex-1 grid grid-cols-[1fr_24px_16px_24px_1fr] sm:grid-cols-[1fr_28px_20px_28px_1fr] items-center py-2 sm:py-3 px-2 sm:px-4 gap-1 sm:gap-2">
                        <div className="text-center font-semibold text-xs sm:text-sm truncate px-1">{t(`teams.${match.team1}`)}</div>
                        <div className="flex justify-center"><TeamFlag teamName={match.team1} /></div>
                        <div className="text-center text-slate-400 dark:text-gray-500 font-bold text-xs sm:text-sm">-</div>
                        <div className="flex justify-center"><TeamFlag teamName={match.team2} /></div>
                        <div className="text-center font-semibold text-xs sm:text-sm truncate px-1">{t(`teams.${match.team2}`)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standings Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-gray-700 transition-colors duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-gray-900 dark:to-black text-white p-4 text-center">
            <h2 className="text-lg font-bold tracking-wider mb-4 text-white">{t('fixture.standingsTitle')}</h2>
            <div className="flex items-center justify-center px-4 h-7">
              <span className="font-bold text-base">{t('fixture.standingsSubtitle')}</span>
            </div>
          </div>

          {/* Groups */}
          <div className="bg-white dark:bg-gray-800 max-h-[600px] overflow-y-auto custom-scrollbar p-0 transition-colors duration-200">
            {Object.entries(actualGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupLetter, teams]) => {
                const groupStandings = actualStandings[groupLetter] || [];
                
                return (
                  <div key={groupLetter} className="border-b border-slate-200 dark:border-gray-700 last:border-b-0 transition-colors duration-200">
                    <div className="bg-slate-800 dark:bg-gray-900 text-white text-left py-2 px-3 text-sm font-bold tracking-wide flex justify-between transition-colors duration-200">
                      <span>{t('fixture.group', { letter: groupLetter })}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm text-left table-fixed">
                        <thead className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 uppercase transition-colors duration-200">
                          <tr>
                            <th className="w-8 sm:w-10 py-2 text-center">#</th>
                            <th className="py-2 text-left">{t('fixture.table.teams')}</th>
                            <th className="w-8 sm:w-10 py-2 text-center font-bold text-slate-700 dark:text-gray-300">{t('fixture.table.pts')}</th>
                            <th className="w-6 sm:w-8 py-2 text-center">{t('fixture.table.played')}</th>
                            <th className="w-8 sm:w-10 py-2 text-center">{t('fixture.table.goals')}</th>
                            <th className="w-8 sm:w-10 py-2 text-center">{t('fixture.table.diff')}</th>
                            <th className="w-6 sm:w-8 py-2 text-center">{t('fixture.table.won')}</th>
                            <th className="w-6 sm:w-8 py-2 text-center">{t('fixture.table.drawn')}</th>
                            <th className="w-6 sm:w-8 py-2 text-center">{t('fixture.table.lost')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700 transition-colors duration-200">
                          {(teams as string[]).map((team, index) => {
                            const stats = groupStandings.find((s: any) => s.team === team) || {
                              points: 0, played: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0, win: 0, draw: 0, lose: 0
                            };
                            
                            return (
                              <tr key={`${groupLetter}-${index}`} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="py-2 text-center">
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto flex items-center justify-center rounded text-[10px] sm:text-xs font-bold text-white ${index < 2 ? 'bg-green-500 dark:bg-green-600' : index === 2 ? 'bg-blue-500 dark:bg-blue-600' : 'bg-slate-400 dark:bg-gray-600'}`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="py-2 font-medium text-slate-800 dark:text-gray-200">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <TeamFlag teamName={team} />
                                    <span className="truncate">{t(`teams.${team}`)}</span>
                                  </div>
                                </td>
                                <td className="py-2 text-center font-bold text-slate-800 dark:text-gray-200">{stats.points}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.played}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.goalsFor}:{stats.goalsAgainst}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.goalsDiff > 0 ? `+${stats.goalsDiff}` : stats.goalsDiff}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.win}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.draw}</td>
                                <td className="py-2 text-center text-slate-500 dark:text-gray-400">{stats.lose}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
