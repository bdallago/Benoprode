import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Button } from '../ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { checkBadWords, filterBadWords } from '../../lib/badwords';

interface MatchCommentsProps {
  matchId: string;
}

export function MatchComments({ matchId }: MatchCommentsProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasSeenCommentsTooltip = localStorage.getItem('hasSeenCommentsTooltip');
    if (hasSeenCommentsTooltip || !containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Only fire if not seen yet (global flag)
        if (!localStorage.getItem('hasSeenCommentsTooltip')) {
          localStorage.setItem('hasSeenCommentsTooltip', 'true');
          setTimeout(() => setShowTooltip(true), 1000);
          setTimeout(() => setShowTooltip(false), 8000);
        }
        observer.disconnect();
      }
    }, { threshold: 1.0 });
    
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

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

    // Use filtered comment text
    const filteredText = filterBadWords(newComment.trim());

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `matches/${matchId}/comments`), {
        text: filteredText,
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
    <div ref={containerRef} className="mt-4 border-t dark:border-gray-700 pt-3 flex flex-col items-center relative">
      <button 
        onClick={() => { setIsExpanded(!isExpanded); setShowTooltip(false); }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 font-medium transition-colors w-full justify-center relative z-10"
      >
        <MessageCircle className="w-4 h-4" />
        {isExpanded ? t('predictions.hideComments', 'Ocultar comentarios') : `${t('predictions.viewCommentsCount', 'Ver comentarios')} ${comments.length > 0 ? `(${comments.length})` : ''}`}
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 w-56 bg-blue-600 text-white text-xs p-2 rounded shadow-xl z-20 pointer-events-none animate-bounce origin-top">
          <div className="font-bold mb-1">¡Comentá en vivo!</div>
          Participá del debate y dejá tu comentario durante el partido.
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-blue-600"></div>
        </div>
      )}

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
