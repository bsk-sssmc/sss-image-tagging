import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import type { Comment as PayloadComment, User, Admin } from '../../../../payload-types';

type Comment = PayloadComment;

interface CommentWithChildren extends Comment {
  children: CommentWithChildren[];
}

interface CommentSectionProps {
  imageId: string;
}

export default function CommentSection({ imageId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getDisplayName = (commentBy: Comment['commentBy']) => {
    if (!commentBy) return '?';
    
    // Handle string ID case
    if (typeof commentBy === 'string') return '?';
    
    // Handle populated object case
    if (typeof commentBy === 'object') {
      const value = commentBy.value;
      if (typeof value === 'string') return '?';
      if (value && typeof value === 'object') {
        // Handle both populated and unpopulated cases
        if ('displayName' in value) {
          return value.displayName || '?';
        }
        return '?';
      }
    }
    
    return '?';
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/comments?where[image][equals]=${imageId}&depth=1&populate[commentBy][depth]=1&populate[parentComment][depth]=1`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      console.log('Fetched comments:', data.docs); // Debug log
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

      setIsSubmittingComment(true);
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
        setIsSubmittingComment(false);
      }
    }
  };

  // const handleUpvote = async (commentId: string, currentVote?: 'upvote' | 'downvote' | null) => {
  //   try {
  //     const newVote = currentVote === 'upvote' ? undefined : 'upvote';
  //     const response = await fetch(`/api/comments/${commentId}`, {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       credentials: 'include',
  //       body: JSON.stringify({
  //         userVote: newVote,
  //       }),
  //     });

  //     if (!response.ok) throw new Error('Failed to update vote');
  //     fetchComments();
  //   } catch (error) {
  //     console.error('Error updating vote:', error);
  //   }
  // };

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
    setReplyText('');
  };

  const handleReplyInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  const handleReplyKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    parentId: string,
    depth: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!replyText.trim()) return;
      setIsSubmittingReply(true);
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            commentText: replyText.trim(),
            image: imageId,
            parentComment: parentId,
            depth: depth + 1,
          }),
        });
        if (!response.ok) throw new Error('Failed to post reply');
        setReplyText('');
        setReplyTo(null);
        fetchComments();
      } catch (error) {
        console.error('Error posting reply:', error);
      } finally {
        setIsSubmittingReply(false);
      }
    }
  };

  const renderComment = (comment: Comment) => {
    const depth = comment.depth || 0;
    return (
      <React.Fragment key={comment.id}>
        <div className="comment" style={{ marginLeft: `${depth * 48}px` }}>
          <div className="comment-header">
            <div className="comment-user">
              <div className="comment-avatar">
                <div className="avatar-button">
                  {getInitials(getDisplayName(comment.commentBy))}
                </div>
              </div>
              <div className="comment-info">
                <span className="comment-author">{getDisplayName(comment.commentBy)}</span>
                <span className="comment-time">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* <button
                onClick={() => handleUpvote(comment.id, comment.userVote)}
                className={`upvote-button ${comment.userVote === 'upvote' ? 'upvoted' : ''}`}
              >
                <ThumbsUp size={16} />
                <span>{comment.commentUpvotes}</span>
              </button> */}
              <button
                className="reply-button"
                onClick={() => handleReply(comment.id)}
                aria-label="Reply"
                style={{ marginLeft: 8 }}
              >
                <MessageCircle size={16} color="#4a90e2" />
              </button>
            </div>
          </div>
          <p className="comment-text">{comment.commentText}</p>
        </div>
        {replyTo === comment.id && (
          <div style={{ marginLeft: `${(depth + 1) * 48}px`, marginTop: 8, marginBottom: 8, position: 'relative' }}>
             {isSubmittingReply && (
               <div className="loading-overlay">
                 <div className="loading-spinner"></div>
               </div>
             )}
            <textarea
              value={replyText}
              onChange={handleReplyInput}
              onKeyDown={(e) => handleReplyKeyDown(e, comment.id, depth)}
              placeholder="Write a reply... (Press Enter to post)"
              className="comment-input"
              rows={2}
              disabled={isSubmittingReply}
              autoFocus
            />
          </div>
        )}
      </React.Fragment>
    );
  };

  // Helper to build a tree from flat comments with proper sorting
  function buildCommentTree(comments: Comment[]): CommentWithChildren[] {
    const commentMap = new Map<string, CommentWithChildren>();
    const roots: CommentWithChildren[] = [];

    // First, create a map of all comments with initialized children arrays
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, children: [] });
    });

    // Build the tree structure by processing comments
    comments.forEach(comment => {
      let parentId: string | undefined;

      // Extract parent ID - based on API, it's a string ID for replies
      if (typeof comment.parentComment === 'string') {
        parentId = comment.parentComment;
      }

      const commentNode = commentMap.get(comment.id);
      if (!commentNode) return;

      // Check if parentId exists AND if the parent comment is in our current list of comments
      if (parentId && commentMap.has(parentId)) {
        // This is a reply - add to parent's children
        const parent = commentMap.get(parentId);
        if (parent) {
          parent.children.push(commentNode);
        }
      } else {
        // This is a top-level comment or orphaned comment (parent not in the fetched list)
        roots.push(commentNode);
      }
    });

    // Sort function to sort by creation time (ascending - oldest first)
    const sortByTime = (a: CommentWithChildren, b: CommentWithChildren) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    // Recursively sort children at each level
    function sortChildren(node: CommentWithChildren) {
      if (node.children.length > 0) {
        // Sort children by creation time
        node.children.sort(sortByTime);
        // Recursively sort grandchildren
        node.children.forEach(child => sortChildren(child));
      }
    }

    // Sort root comments and all their descendants
    roots.sort(sortByTime);
    roots.forEach(root => sortChildren(root));

    return roots;
  }

  // Flatten the tree for rendering while maintaining the correct order
  function flattenCommentTree(comments: CommentWithChildren[] = []): CommentWithChildren[] {
    const result: CommentWithChildren[] = [];
    
    comments.forEach(comment => {
      // Add the current comment
      result.push(comment);
      // Add all its children recursively
      if (comment.children.length > 0) {
        result.push(...flattenCommentTree(comment.children));
      }
    });
    
    return result;
  }

  const builtCommentTree = buildCommentTree(comments);
  const flattenedComments = flattenCommentTree(builtCommentTree);

  return (
    <div className="comment-section">
      <div className="comment-input-container" style={{ position: 'relative' }}>
        {isSubmittingComment && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleSubmitComment}
          placeholder="Write a comment... (Press Enter to post)"
          className="comment-input"
          rows={3}
          disabled={isSubmittingComment}
        />
      </div>
      <div className="comments-list">
        {flattenedComments.map(comment => {
          return renderComment(comment);
        })}
      </div>
    </div>
  );
}