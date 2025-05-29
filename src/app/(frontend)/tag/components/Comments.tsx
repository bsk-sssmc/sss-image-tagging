import React, { useState, useEffect } from 'react';

interface CommentProps {
  comment: {
    id: string;
    commentText: string;
    createdAt: string;
    commentBy?: {
      relationTo: string;
      value: {
        id: string;
        displayName: string;
      };
    };
  };
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string) => void;
}

const Comment: React.FC<CommentProps> = ({ comment, onReply, onDelete, onEdit }) => {
  return (
    <div className="comment">
      <div className="comment-header">
        <div className="comment-user">
          <div className="comment-avatar">
            <div className="comment-avatar-initial">
              {comment.commentBy?.value?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
          <div className="comment-info">
            <span className="comment-author">{comment.commentBy?.value?.displayName || 'Anonymous'}</span>
            <span className="comment-time">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <p className="comment-text">{comment.commentText}</p>
      <div className="comment-actions">
        <button className="comment-action" onClick={() => onReply(comment.id)}>
          Reply
        </button>
        <button className="comment-action" onClick={() => onEdit(comment.id)}>
          Edit
        </button>
        <button className="comment-action" onClick={() => onDelete(comment.id)}>
          Delete
        </button>
      </div>
    </div>
  );
};

interface CommentsSectionProps {
  imageId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ imageId }) => {
  const [comments, setComments] = useState<CommentProps['comment'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?imageId=${imageId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.docs);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [imageId]);

  const handleReply = (commentId: string) => {
    // TODO: Implement reply functionality
    console.log('Reply to comment:', commentId);
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Refresh comments after deletion
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEdit = (commentId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit comment:', commentId);
  };

  return (
    <div className="comments-section-container">
      {loading ? (
        <div className="loading">Loading comments...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection; 