import React, { useEffect, useState, useRef } from 'react';
import { Resource, Comment } from '../types';

type ResourceCardProps = {
  resource: Resource;
  currentUserId: string;
  canManage?: boolean;
  onToggleUpvote: (resourceId: string) => void;
  onAddComment: (resourceId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string) => void;
  onViewContributor: (id: string) => void;
};

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  currentUserId,
  canManage = false,
  onToggleUpvote,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onViewContributor,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [lastDeletedComment, setLastDeletedComment] = useState<Comment | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get category color classes
  const getCatColor = (cat: string) => {
    switch (cat) {
      case 'Mathematics': return 'bg-blue-50 text-blue-600';
      case 'Science': return 'bg-green-50 text-green-600';
      case 'Coding': return 'bg-purple-50 text-purple-600';
      case 'History': return 'bg-orange-50 text-orange-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(
          `http://localhost/paperpup/Api.php?action=getComments&resourceId=${resource.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setComments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    };

    fetchComments();
  }, [resource.id]);

  // Render loading or error states
  if (!resource) {
    return <div className="p-6 text-sm text-red-500">Resource not found.</div>;
  }

  const isOwner = resource.authorId === currentUserId;
  const hasUpvoted = Array.isArray(resource.upvotes) && resource.upvotes.includes(currentUserId);
  const showFullDescription = isExpanded;

  // Handlers
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`http://localhost/paperpup/Api.php?action=addComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: Number(resource.id), user_id: Number(currentUserId), content: newComment })
      });

      if (!res.ok) {
        throw new Error('Failed to add comment');
      }

      const newCommentData = await res.json();

      // Update comments list with the new comment from server
      setComments((prev) => [newCommentData, ...prev]);
      setNewComment('');
      // Don't call parent handler - local state is already updated
    } catch (err) {
      console.error('Failed to add comment', err);
      alert('Failed to add comment');
    }
  };

  const handleToggleUpvote = async () => {
    onToggleUpvote?.(resource.id);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    try {
      const res = await fetch(`http://localhost/paperpup/Api.php?action=updateComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId, content: editingCommentText })
      });

      if (!res.ok) throw new Error('Failed to update comment');

      // Update local state
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, text: editingCommentText } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      console.error('Failed to update comment', err);
      alert('Failed to update comment');
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setLastDeletedComment(comment);
    setComments(prev => prev.filter(c => c.id !== comment.id));

    undoTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch(`http://localhost/paperpup/Api.php?action=deleteComment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment_id: comment.id })
        });
      } catch (err) {
        console.error('Failed to delete comment', err);
      }
      setLastDeletedComment(null);
    }, 5000);
  };

  const handleUndoDeleteComment = () => {
    if (lastDeletedComment) {
      setComments(prev => [lastDeletedComment, ...prev]);
      setLastDeletedComment(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden">
      {/* Top Meta */}
      <div className="flex justify-between items-center mb-4">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getCatColor(resource.category)}`}>
          {resource.category || 'General'}
        </span>
        <div className="flex items-center space-x-2">
          {isOwner && (
            <span className={`text-[10px] font-bold uppercase ${resource.isPublic ? 'text-green-500' : 'text-slate-300'}`}>
              {resource.isPublic ? 'Public' : 'Private'}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-slate-900 mb-1 truncate text-lg group-hover:text-indigo-600 transition-colors">{resource.title}</h3>

      <button
        onClick={() => onViewContributor?.(resource.authorId)}
        className="flex items-center space-x-2 mb-4 group/author hover:bg-slate-50 p-1 -ml-1 rounded-lg transition-colors text-left"
      >
        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 group-hover/author:bg-indigo-600 group-hover/author:text-white transition-colors">
          {resource.authorName?.charAt(0) || '?'}
        </div>
        <p className="text-[10px] text-slate-400 font-medium group-hover/author:text-indigo-600">shared by {resource.authorName || 'Unknown'}</p>
      </button>

      <p className="text-sm text-slate-600 mb-2 leading-relaxed italic overflow-hidden">
        {showFullDescription
          ? resource.description
          : resource.description.slice(0, 150) +
          (resource.description.length > 150 ? '…' : '')}
        {/* {resource.description || 'No additional notes provided.'} */}
      </p>
      {(resource.description?.length || 0) > 150 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mb-4 transition-colors"
        >
          {showFullDescription ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Social Bar */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={handleToggleUpvote}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${hasUpvoted ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
          <span>{resource.upvotes.length}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span>{comments.length}</span>
        </button>
      </div>

      <div className="flex gap-2">
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-bold shadow-md">
          Access Resource
        </a>
        {canManage && isOwner && (
          <>
            <button onClick={() => onEdit?.(resource)} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-100 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button onClick={() => {
              onDelete?.(resource.id);
            }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 border border-slate-200 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </>


        )}
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleCommentSubmit} className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask a question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">Post</button>
          </form>

          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="bg-slate-50 p-3 rounded-xl group/comment relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-900">{c.userName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] text-slate-400">{new Date(c.date).toLocaleDateString()}</span>
                    {String(c.userId) === currentUserId && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditComment(c)}
                          className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded-md hover:bg-indigo-50"
                          title="Edit comment"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteComment(c)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                          title="Delete comment"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editingCommentId === c.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEditComment(c.id)}
                        className="flex-1 bg-indigo-600 text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentText('');
                        }}
                        className="flex-1 bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 pr-6">{c.text}</p>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="text-[10px] text-slate-400 text-center py-2">No discussion yet.</p>}
          </div>

          {lastDeletedComment && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex justify-between items-center">
              <p className="text-xs text-red-600 font-medium">Comment deleted</p>
              <button
                onClick={handleUndoDeleteComment}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-white px-3 py-1 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceCard;
