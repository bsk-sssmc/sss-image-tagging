import { useState, useEffect, useCallback } from 'react';
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
  userVote?: 'upvote' | 'downvote' | null;
}

interface CommentsProps {
  imageId: string;
}

export default function Comments({ imageId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
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
  }, [imageId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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

      // Create the request body matching the PayloadCMS schema
      const requestBody = {
        commentText: newComment,
        image: {
          relationTo: 'images',
          value: imageId
        },
        parentComment: null,
        depth: 0,
        commentUpvotes: 0,
        commentDownvotes: 0,
        createdAt: new Date().toISOString()
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
        parentComment: {
          relationTo: 'comments',
          value: commentId
        },
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

  const handleVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    try {
      console.log('Attempting to vote on comment:', { commentId, voteType });
      
      // Find the current comment
      const currentComment = comments.find(c => c.id === commentId);
      if (!currentComment) {
        throw new Error('Comment not found');
      }

      // Calculate the vote change
      let voteChange = 0;
      if (currentComment.userVote === 'upvote' && voteType === 'downvote') {
        // Changing from upvote to downvote: -2
        voteChange = -2;
      } else if (currentComment.userVote === 'downvote' && voteType === 'upvote') {
        // Changing from downvote to upvote: +2
        voteChange = 2;
      } else if (!currentComment.userVote) {
        // New vote: +1 or -1
        voteChange = voteType === 'upvote' ? 1 : -1;
      } else {
        // Same vote type, do nothing
        return;
      }

      // Optimistically update the UI
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            const newUpvotes = comment.commentUpvotes + (voteType === 'upvote' ? 1 : 0);
            const newDownvotes = comment.commentDownvotes + (voteType === 'downvote' ? 1 : 0);
            return {
              ...comment,
              commentUpvotes: newUpvotes,
              commentDownvotes: newDownvotes,
              userVote: voteType, // Update the user's vote
            };
          }
          return comment;
        })
      );

      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          voteType,
          previousVote: currentComment.userVote,
          voteChange 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Vote request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // If the request fails, revert the optimistic update
        setComments(prevComments => 
          prevComments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                commentUpvotes: currentComment.commentUpvotes,
                commentDownvotes: currentComment.commentDownvotes,
                userVote: currentComment.userVote,
              };
            }
            return comment;
          })
        );
        throw new Error(errorData?.message || `Failed to vote on comment: ${response.statusText}`);
      }

      const updatedComment = await response.json();
      console.log('Successfully voted on comment:', updatedComment);

      // Update the comment with the server response
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId ? { ...updatedComment, userVote: voteType } : comment
        )
      );
    } catch (error) {
      console.error('Error voting on comment:', error);
      alert('Failed to vote on comment. Please try again later.');
    }
  };

  return (
    <div className="comments-section-container">
      <h3>Comments</h3>
      
      {/* Comment Form */}
      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment..."
          rows={3}
        />
        <button type="submit" className="submit-button" disabled={!newComment.trim()}>
          Post Comment
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="loading">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="no-comments">No comments yet. Be the first to comment!</div>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{comment.commentBy.name}</span>
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="comment-content">{comment.commentText}</div>
              <div className="comment-actions">
                <button
                  className="comment-action"
                  onClick={() => handleVote(comment.id, 'upvote')}
                >
                  ↑ {comment.commentUpvotes}
                </button>
                <button
                  className="comment-action"
                  onClick={() => handleVote(comment.id, 'downvote')}
                >
                  ↓ {comment.commentDownvotes}
                </button>
                <button
                  className="comment-action"
                  onClick={() => handleReply(comment.id)}
                >
                  Reply
                </button>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="reply-form">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                  />
                  <div className="reply-actions">
                    <button
                      type="button"
                      className="submit-button"
                      onClick={() => handleSubmitReply(comment.id, newComment)}
                      disabled={!newComment.trim()}
                    >
                      Post Reply
                    </button>
                    <button
                      type="button"
                      className="comment-action"
                      onClick={handleCancelReply}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Nested Replies */}
              {comments
                .filter((reply) => reply.parentComment?.value === comment.id)
                .map((reply) => (
                  <div key={reply.id} className="comment-item reply">
                    <div className="comment-header">
                      <span className="comment-author">{reply.commentBy.name}</span>
                      <span className="comment-date">
                        {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="comment-content">{reply.commentText}</div>
                    <div className="comment-actions">
                      <button
                        className="comment-action"
                        onClick={() => handleVote(reply.id, 'upvote')}
                      >
                        ↑ {reply.commentUpvotes}
                      </button>
                      <button
                        className="comment-action"
                        onClick={() => handleVote(reply.id, 'downvote')}
                      >
                        ↓ {reply.commentDownvotes}
                      </button>
                      <button
                        className="comment-action"
                        onClick={() => handleReply(reply.id)}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 