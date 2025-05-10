import { useState, useEffect } from 'react';
import CommentItem from './CommentItem';

interface Comment {
  id: string;
  commentText: string;
  createdAt: string;
  commentBy: {
    id: string;
    name: string;
  };
  commentUpvotes: number;
  commentDownvotes: number;
  parentComment?: {
    relationTo: 'comments';
    value: string;
  } | null;
  depth: number;
  image: string;
  updatedAt: string;
}

interface CommentsProps {
  imageId: string;
}

export default function Comments({ imageId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [imageId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      // Using PayloadCMS REST API to fetch comments with high depth to get all nested comments
      const response = await fetch(`/api/comments?where[image][equals]=${imageId}&depth=20&sort=createdAt`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const data = await response.json();
      console.log('Fetched comments:', data); // Log comments to console
      
      // Sort comments to ensure proper threading
      const sortedComments = Array.isArray(data.docs) ? data.docs.sort((a: Comment, b: Comment) => {
        // If one is a reply to the other, the parent should come first
        if (a.parentComment?.value === b.id) return 1;
        if (b.parentComment?.value === a.id) return -1;
        
        // If they have the same parent, sort by creation time
        if (a.parentComment?.value === b.parentComment?.value) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        
        // If they have different parents, sort by their own creation time
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }) : [];
      
      setComments(sortedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to sort comments
  const sortComments = (comments: Comment[]) => {
    return comments.sort((a: Comment, b: Comment) => {
      // If one is a reply to the other, the parent should come first
      if (a.parentComment?.value === b.id) return 1;
      if (b.parentComment?.value === a.id) return -1;
      
      // If they have the same parent, sort by creation time
      if (a.parentComment?.value === b.parentComment?.value) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      // If they have different parents, sort by their own creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      console.log('Image ID:', imageId, 'Type:', typeof imageId);
      
      // Validate image ID format
      if (!imageId) {
        throw new Error('Image ID is required');
      }

      // Create a temporary comment
      const tempComment: Comment = {
        id: 'temp-' + Date.now(),
        commentText: newComment,
        image: imageId,
        commentBy: {
          id: 'temp-user',
          name: 'You'
        },
        createdAt: new Date().toISOString(),
        commentUpvotes: 0,
        commentDownvotes: 0,
        parentComment: null,
        depth: 0,
        updatedAt: new Date().toISOString()
      };

      // Add the temporary comment to the state
      setComments(prevComments => [...prevComments, tempComment]);
      setNewComment('');

      const requestBody = {
        commentText: newComment,
        image: imageId,
        parentComment: null,
        depth: 0,
      };
      
      console.log('Request body:', requestBody);

      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // If the request fails, remove the temporary comment
        setComments(prevComments => prevComments.filter(c => c.id !== tempComment.id));
        const errorData = await response.json().catch(() => null);
        console.error('Server error:', errorData);
        throw new Error(errorData?.message || 'Failed to post comment');
      }

      const createdComment = await response.json();
      console.log('Created comment:', createdComment);

      // Replace the temporary comment with the real one
      setComments(prevComments => 
        prevComments.map(c => c.id === tempComment.id ? createdComment : c)
      );
    } catch (error) {
      console.error('Error posting comment:', error);
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
      if (newComment.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSubmitReply = async (commentId: string, replyText: string) => {
    try {
      // Find the parent comment to calculate the correct depth
      const parentComment = comments.find(c => c.id === commentId);
      if (!parentComment) {
        console.error('Parent comment not found');
        return;
      }
      
      const newDepth = parentComment.depth + 1;
      
      // Validate depth to prevent excessive nesting
      if (newDepth > 20) {
        console.error('Maximum comment depth reached');
        return;
      }

      // Create the request body with the correct parent comment reference
      const requestBody = {
        commentText: replyText,
        image: imageId,
        parentComment: commentId,
        depth: newDepth,
      };

      console.log('Submitting reply with parent:', commentId, 'Request body:', requestBody);

      // Optimistically create a temporary comment
      const tempComment: Comment = {
        id: 'temp-' + Date.now(),
        commentText: replyText,
        image: imageId,
        commentBy: {
          id: 'temp-user',
          name: 'You'
        },
        createdAt: new Date().toISOString(),
        commentUpvotes: 0,
        commentDownvotes: 0,
        parentComment: {
          relationTo: 'comments',
          value: commentId
        },
        depth: newDepth,
        updatedAt: new Date().toISOString()
      };

      // Add the temporary comment to the state
      setComments(prevComments => {
        const newComments = [...prevComments, tempComment];
        return sortComments(newComments);
      });
      setReplyingTo(null);

      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // If the request fails, remove the temporary comment
        setComments(prevComments => prevComments.filter(c => c.id !== tempComment.id));
        const errorData = await response.json().catch(() => null);
        console.error('Server error:', errorData);
        throw new Error(errorData?.message || 'Failed to post reply');
      }

      const createdComment = await response.json();
      console.log('Created reply:', createdComment);
      
      // Replace the temporary comment with the real one
      setComments(prevComments => {
        const newComments = prevComments.map(c => c.id === tempComment.id ? createdComment : c);
        return sortComments(newComments);
      });
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  return (
    <div className="comments-section">
      <h3 className="comments-heading">Comments {comments.length > 0 && `(${comments.length})`}</h3>
      
      {/* Comment Input Form - Only show for top-level comments */}
      {!replyingTo && (
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... (Press Enter to submit, Shift+Enter for new line)"
            maxLength={500}
            className="comment-input"
          />
          <div className="comment-input-footer">
            <span className="character-count">{newComment.length}/500</span>
            <button type="submit" className="submit-comment" disabled={!newComment.trim()}>
              Post Comment
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {isLoading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
          </div>
        ) : !comments || comments.length === 0 ? (
          <div className="no-comments">
            <p className="no-comments-text">No Comments.</p>
            <p className="no-comments-subtext">Be the first one to comment.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              onSubmitReply={handleSubmitReply}
            />
          ))
        )}
      </div>
    </div>
  );
} 