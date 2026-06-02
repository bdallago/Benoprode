import axios from "axios";
import { GROUPS } from "../data";
import { recalculatePoints } from "./recalculate-points";

const TEAM_NAME_MAPPING: Record<string, string> = {
  "Korea Republic": "South Korea",
  "Côte d'Ivoire": "Ivory Coast",
};

export async function syncStandings(database: any, apiKey: string): Promise<void> {
  const response = await axios.get("https://v3.football.api-sports.io/standings", {
    params: { league: 1, season: 2026 },
    headers: { "x-apisports-key": apiKey },
  });

  const data = response.data;
  if (!data?.response?.length) return;

  const standings = data.response[0].league.standings;
  const newGroups: Record<string, string[]> = {};

  standings.forEach((groupStandings: any[]) => {
    if (!groupStandings?.length) return;
    const groupLetter = groupStandings[0].group.replace("Group ", "").trim();
    if (!(groupLetter in GROUPS)) return;
    groupStandings.sort((a: any, b: any) => a.rank - b.rank);
    newGroups[groupLetter] = groupStandings.map((s: any) => TEAM_NAME_MAPPING[s.team.name] ?? s.team.name);
  });

  if (Object.keys(newGroups).length > 0) {
    await database.collection("results").doc("actual").set({ groups: newGroups }, { merge: true });
    await recalculatePoints(database);
  }
}
