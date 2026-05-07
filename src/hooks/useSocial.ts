import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

export interface SocialState {
  friends: Set<string>;
  sentRequests: Set<string>;
  receivedRequests: Set<string>;
  loading: boolean;
  addFriend: (targetUid: string, targetName?: string) => Promise<void>;
  acceptRequest: (fromUid: string) => Promise<void>;
  rejectRequest: (fromUid: string) => Promise<void>;
  unfriend: (targetUid: string) => Promise<void>;
}

export function useSocial(currentUser: User | null): SocialState {
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [receivedRequests, setReceivedRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // We need to store request IDs to perform updates
  const [requestIds, setRequestIds] = useState<Map<string, string>>(new Map()); // uid -> requestId

  useEffect(() => {
    if (!currentUser?.uid) {
      setFriends(new Set());
      setSentRequests(new Set());
      setReceivedRequests(new Set());
      setRequestIds(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to Friendships
    const qFriends1 = query(collection(db, "friendships"), where("user1Id", "==", currentUser.uid));
    const qFriends2 = query(collection(db, "friendships"), where("user2Id", "==", currentUser.uid));

    const unsub1 = onSnapshot(qFriends1, (snap) => {
      setFriends(prev => {
        const next = new Set(prev);
        snap.docChanges().forEach(change => {
            const data = change.doc.data();
            if (change.type === 'added') next.add(data.user2Id);
            if (change.type === 'removed') next.delete(data.user2Id);
        });
        return next;
      });
    });

    const unsub2 = onSnapshot(qFriends2, (snap) => {
      setFriends(prev => {
        const next = new Set(prev);
        snap.docChanges().forEach(change => {
            const data = change.doc.data();
            if (change.type === 'added') next.add(data.user1Id);
            if (change.type === 'removed') next.delete(data.user1Id);
        });
        return next;
      });
    });

    // 2. Listen to Friend Requests
    const qSent = query(
      collection(db, "friendRequests"), 
      where("fromUserId", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const qReceived = query(
      collection(db, "friendRequests"), 
      where("toUserId", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const unsubSent = onSnapshot(qSent, (snap) => {
      const uids = new Set<string>();
      snap.forEach(doc => uids.add(doc.data().toUserId));
      setSentRequests(uids);
    });

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      const uids = new Set<string>();
      const ids = new Map<string, string>();
      snap.forEach(doc => {
        const data = doc.data();
        uids.add(data.fromUserId);
        ids.set(data.fromUserId, doc.id);
      });
      setReceivedRequests(uids);
      setRequestIds(prev => {
        const next = new Map(prev);
        ids.forEach((val, key) => next.set(key, val));
        return next;
      });
    });

    setLoading(false);

    return () => {
      unsub1();
      unsub2();
      unsubSent();
      unsubReceived();
    };
  }, [currentUser?.uid]);

  const addFriend = useCallback(async (targetUid: string) => {
    if (!currentUser?.uid || sentRequests.has(targetUid) || friends.has(targetUid)) return;

    await addDoc(collection(db, "friendRequests"), {
      fromUserId: currentUser.uid,
      toUserId: targetUid,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    
    await addDoc(collection(db, "notifications"), {
      userId: targetUid,
      type: "friend_request",
      title: "Nueva solicitud de amistad",
      message: `${currentUser.displayName || "Un usuario"} quiere añadirte como amigo.`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/profile?tab=friends`
    });
  }, [currentUser, sentRequests, friends]);

  const acceptRequest = useCallback(async (fromUid: string) => {
    if (!currentUser?.uid) return;
    const requestId = requestIds.get(fromUid);
    if (!requestId) return;

    const { doc, updateDoc, addDoc, collection } = await import('firebase/firestore');
    
    await updateDoc(doc(db, "friendRequests", requestId), {
      status: "accepted"
    });

    await addDoc(collection(db, "friendships"), {
      user1Id: currentUser.uid,
      user2Id: fromUid,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, "notifications"), {
      userId: fromUid,
      type: "system_alert",
      title: "Solicitud Aceptada",
      message: `${currentUser.displayName || "Un usuario"} aceptó tu solicitud de amistad.`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: "/profile?tab=friends"
    });
  }, [currentUser, requestIds]);

  const rejectRequest = useCallback(async (fromUid: string) => {
    const requestId = requestIds.get(fromUid);
    if (!requestId) return;
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, "friendRequests", requestId), {
      status: "rejected"
    });
  }, [requestIds]);

  const unfriend = useCallback(async (targetUid: string) => {
    if (!currentUser?.uid) return;
    const { getDocs, query, collection, where, deleteDoc } = await import('firebase/firestore');
    const q1 = query(collection(db, "friendships"), where("user1Id", "==", currentUser.uid), where("user2Id", "==", targetUid));
    const q2 = query(collection(db, "friendships"), where("user1Id", "==", targetUid), where("user2Id", "==", currentUser.uid));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const deletions = [...s1.docs, ...s2.docs].map(d => deleteDoc(d.ref));
    await Promise.all(deletions);
  }, [currentUser]);

  return { friends, sentRequests, receivedRequests, loading, addFriend, acceptRequest, rejectRequest, unfriend };
}
