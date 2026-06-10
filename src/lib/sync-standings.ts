import axios from "axios";
import { GROUPS } from "../data";

// Maps API English names → Spanish names used in the app
const TEAM_NAME_MAPPING: Record<string, string> = {
  // Grupo A
  "Mexico":                          "México",
  "South Africa":                    "Sudáfrica",
  "Korea Republic":                  "Corea del Sur",
  "South Korea":                     "Corea del Sur",
  "Czech Republic":                  "República Checa",
  "Czechia":                         "República Checa",
  // Grupo B
  "Canada":                          "Canadá",
  "Bosnia":                          "Bosnia y Herzegovina",
  "Bosnia and Herzegovina":          "Bosnia y Herzegovina",
  // Qatar, Suiza → same below
  "Switzerland":                     "Suiza",
  // Grupo C
  "Brazil":                          "Brasil",
  "Morocco":                         "Marruecos",
  "Haiti":                           "Haití",
  "Scotland":                        "Escocia",
  // Grupo D
  "United States":                   "Estados Unidos",
  "USA":                             "Estados Unidos",
  // Paraguay, Australia → same
  "Turkey":                          "Turquía",
  "Türkiye":                         "Turquía",
  // Grupo E
  "Germany":                         "Alemania",
  "Curacao":                         "Curazao",
  "Curaçao":                         "Curazao",
  "Ivory Coast":                     "Costa de Marfil",
  "Côte d'Ivoire":                   "Costa de Marfil",
  // Ecuador → same
  // Grupo F
  "Netherlands":                     "Países Bajos",
  "Japan":                           "Japón",
  "Sweden":                          "Suecia",
  "Tunisia":                         "Túnez",
  // Grupo G
  "Belgium":                         "Bélgica",
  "Egypt":                           "Egipto",
  "Iran":                            "Irán",
  "New Zealand":                     "Nueva Zelanda",
  // Grupo H
  "Spain":                           "España",
  "Cape Verde":                      "Cabo Verde",
  "Saudi Arabia":                    "Arabia Saudita",
  // Uruguay → same
  // Grupo I
  "France":                          "Francia",
  // Senegal → same
  "Iraq":                            "Irak",
  "Norway":                          "Noruega",
  // Grupo J
  // Argentina, Austria → same
  "Algeria":                         "Argelia",
  "Jordan":                          "Jordania",
  // Grupo K
  // Portugal, Colombia → same
  "DR Congo":                        "República Democrática del Congo",
  "Democratic Republic of Congo":    "República Democrática del Congo",
  "Congo DR":                        "República Democrática del Congo",
  "Uzbekistan":                      "Uzbekistán",
  // Grupo L
  "England":                         "Inglaterra",
  "Croatia":                         "Croacia",
  // Ghana → same
  "Panama":                          "Panamá",
};

// Each team plays 3 group stage games → 4 teams × 3 = 12 total games when group is complete.
const GAMES_PER_GROUP = 12;

export async function syncStandings(database: any, apiKey: string): Promise<void> {
  const response = await axios.get("https://v3.football.api-sports.io/standings", {
    params: { league: 1, season: 2026 },
    headers: { "x-apisports-key": apiKey },
  });

  const data = response.data;
  if (!data?.response?.length) return;

  const standings = data.response[0].league.standings;
  const newGroups: Record<string, string[]> = {};
  const finishedGroups: string[] = [];

  standings.forEach((groupStandings: any[]) => {
    if (!groupStandings?.length) return;
    const groupLetter = groupStandings[0].group.replace("Group ", "").trim();
    if (!(groupLetter in GROUPS)) return;

    const totalPlayed = groupStandings.reduce((sum: number, s: any) => sum + (s.all?.played ?? 0), 0);

    // Skip groups with no matches played — API returns pre-tournament default order.
    if (totalPlayed === 0) return;

    groupStandings.sort((a: any, b: any) => a.rank - b.rank);
    newGroups[groupLetter] = groupStandings.map((s: any) => TEAM_NAME_MAPPING[s.team.name] ?? s.team.name);

    // Mark group as finished only when all matches have been played.
    if (totalPlayed >= GAMES_PER_GROUP) finishedGroups.push(groupLetter);
  });

  if (Object.keys(newGroups).length > 0) {
    await database.collection("results").doc("actual").set({
      groups: newGroups,
      finishedGroups,
    }, { merge: true });
  }
}
