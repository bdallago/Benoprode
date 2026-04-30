import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Button } from '../ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MatchCommentsProps {
  matchId: string;
}

export function MatchComments({ matchId }: MatchCommentsProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    const q = query(
      collection(db, `matches/${matchId}/comments`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [matchId, isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `matches/${matchId}/comments`), {
        text: newComment.trim(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Usuario',
        createdAt: new Date().toISOString()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t dark:border-gray-700 pt-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 font-medium transition-colors w-full justify-center"
      >
        <MessageCircle className="w-4 h-4" />
        {isExpanded ? t('predictions.hideComments', 'Ocultar comentarios') : `${t('predictions.viewCommentsCount', 'Ver comentarios')} ${comments.length > 0 ? `(${comments.length})` : ''}`}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {comments.length === 0 ? (
              <p className="text-xs text-center text-gray-500 dark:text-gray-200 py-2">{t('predictions.beFirstComment', 'Sé el primero en comentar')}</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-300 mr-2">{comment.userName}:</span>
                  <span className="text-gray-600 dark:text-gray-200">{comment.text}</span>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('predictions.writeComment', 'Escribe un comentario...')}
              className="flex-1 text-sm p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={150}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!newComment.trim() || isSubmitting}
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
