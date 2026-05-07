import { collection, query, where, documentId, getDocs, Firestore } from "firebase/firestore";

/**
 * Fetch users from the "users" collection given an array of UIDs,
 * respecting Firestore's 'in' query limit of 30.
 *
 * @param db - Firestore database instance
 * @param uids - Array of User IDs to fetch
 * @returns Array of user data objects including their uid
 */
export async function fetchUsersInChunks(db: Firestore, uids: string[]): Promise<any[]> {
  if (!uids || uids.length === 0) return [];
  
  const chunks = [];
  // Firestore `in` clause supports up to 30 items
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30));
  }
  
  let fetchedPlayers: any[] = [];
  
  for (const chunk of chunks) {
    const q = query(
      collection(db, "users"), 
      where(documentId(), "in", chunk)
    );
    const snap = await getDocs(q);
    const playersChunk = snap.docs.map(d => ({ ...d.data(), uid: d.id }));
    fetchedPlayers = [...fetchedPlayers, ...playersChunk];
  }
  
  return fetchedPlayers;
}
