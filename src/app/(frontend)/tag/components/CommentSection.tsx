import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp } from 'lucide-react';
import Image from 'next/image';

interface Comment {
  id: string;
  commentText: string;
  commentBy: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  createdAt: string;
  commentUpvotes: number;
  userVote?: 'upvote' | 'downvote';
  parentComment?: string;
  depth: number;
}

interface CommentSectionProps {
  imageId: string;
}

export default function CommentSection({ imageId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?where[image][equals]=${imageId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.docs);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [imageId]);

  const handleSubmitComment = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!newComment.trim()) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            commentText: newComment.trim(),
            image: imageId,
          }),
        });

        if (!response.ok) throw new Error('Failed to post comment');
        
        setNewComment('');
        fetchComments();
      } catch (error) {
        console.error('Error posting comment:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpvote = async (commentId: string, currentVote?: 'upvote' | 'downvote') => {
    try {
      const newVote = currentVote === 'upvote' ? undefined : 'upvote';
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userVote: newVote,
        }),
      });

      if (!response.ok) throw new Error('Failed to update vote');
      fetchComments();
    } catch (error) {
      console.error('Error updating vote:', error);
    }
  };

  const renderComment = (comment: Comment) => {
    return (
      <div key={comment.id} className="comment" style={{ marginLeft: `${comment.depth * 20}px` }}>
        <div className="comment-header">
          <div className="comment-user">
            <div className="comment-avatar">
            <div 
                className="avatar-button"
              >
                {getInitials(comment.commentBy.displayName)}
              </div>
            </div>
            <div className="comment-info">
              <span className="comment-author">{comment.commentBy.displayName}</span>
              <span className="comment-time">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleUpvote(comment.id, comment.userVote)}
            className={`upvote-button ${comment.userVote === 'upvote' ? 'upvoted' : ''}`}
          >
            <ThumbsUp size={16} />
            <span>{comment.commentUpvotes}</span>
          </button>
        </div>
        <p className="comment-text">{comment.commentText}</p>
      </div>
    );
  };

  return (
    <div className="comment-section">
      <div className="comment-input-container">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleSubmitComment}
          placeholder="Write a comment... (Press Enter to post)"
          className="comment-input"
          rows={3}
          disabled={isLoading}
        />
      </div>
      <div className="comments-list">
        {comments.map(renderComment)}
      </div>
    </div>
  );
} 