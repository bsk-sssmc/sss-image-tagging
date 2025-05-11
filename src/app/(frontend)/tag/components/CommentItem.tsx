import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: {
    id: string;
    commentText: string;
    commentBy: {
      id: string;
      name: string;
    };
    createdAt: string;
    commentUpvotes: number;
    commentDownvotes: number;
    depth: number;
    userVote?: 'upvote' | 'downvote' | null;
  };
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  onSubmitReply: (commentId: string, replyText: string) => void;
  onVote: (commentId: string, voteType: 'upvote' | 'downvote') => void;
}

export default function CommentItem({ comment, onReply, replyingTo, onCancelReply, onSubmitReply, onVote }: CommentItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [replyText, setReplyText] = useState('');
  const voteDifference = comment.commentUpvotes - comment.commentDownvotes;
  
  const getTimeElapsed = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'unknown time';
    }
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onSubmitReply(comment.id, replyText);
      setReplyText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      }
      // Submit on Enter
      e.preventDefault();
      if (replyText.trim()) {
        onSubmitReply(comment.id, replyText);
        setReplyText('');
      }
    }
  };

  const handleVote = (voteType: 'upvote' | 'downvote') => {
    onVote(comment.id, voteType);
  };

  return (
    <div 
      className="comment-item"
      style={{ 
        marginLeft: `${comment.depth * 2}rem`,
        display: 'flex',
        gap: '1rem',
        padding: '1rem 0',
        borderBottom: '1px solid #404040'
      }}
    >
      {/* Vote buttons and count */}
      <div 
        className="vote-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          minWidth: '2rem'
        }}
      >
        <button 
          className="vote-button"
          onClick={() => handleVote('upvote')}
          disabled={comment.userVote === 'upvote'}
          style={{
            background: 'none',
            border: 'none',
            cursor: comment.userVote === 'upvote' ? 'default' : 'pointer',
            padding: '0.25rem',
            color: comment.userVote === 'upvote' ? '#4CAF50' : '#666',
            opacity: comment.userVote === 'upvote' ? 0.5 : 1
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
        
        <span 
          style={{
            color: voteDifference > 0 ? '#4CAF50' : voteDifference < 0 ? '#f44336' : '#666',
            fontWeight: 'bold'
          }}
        >
          {voteDifference}
        </span>
        
        <button 
          className="vote-button"
          onClick={() => handleVote('downvote')}
          disabled={comment.userVote === 'downvote'}
          style={{
            background: 'none',
            border: 'none',
            cursor: comment.userVote === 'downvote' ? 'default' : 'pointer',
            padding: '0.25rem',
            color: comment.userVote === 'downvote' ? '#f44336' : '#666',
            opacity: comment.userVote === 'downvote' ? 0.5 : 1
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      </div>

      {/* Comment content */}
      <div className="comment-content" style={{ flex: 1 }}>
        <div className="comment-header" style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>
            {comment.commentBy.name}
          </span>
          <span style={{ color: '#666', fontSize: '0.875rem' }}>
            {getTimeElapsed(comment.createdAt)}
          </span>
        </div>
        
        <div className="comment-text" style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
          {comment.commentText}
        </div>
        
        <button
          className="reply-button"
          onClick={() => onReply(comment.id)}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '0.25rem 0',
            fontSize: '0.875rem',
            textDecoration: isHovering ? 'underline' : 'none'
          }}
        >
          Reply
        </button>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <form onSubmit={handleSubmitReply} className="reply-form" style={{ marginTop: '1rem' }}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your reply... (Press Enter to submit, Shift+Enter for new line)"
              maxLength={500}
              className="comment-input"
              style={{ marginBottom: '0.5rem' }}
            />
            <div className="comment-input-footer">
              <span className="character-count">{replyText.length}/500</span>
              <div>
                <button
                  type="button"
                  onClick={onCancelReply}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    marginRight: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-comment"
                  disabled={!replyText.trim()}
                >
                  Post Reply
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 