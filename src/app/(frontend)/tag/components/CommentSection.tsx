import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import type { Comment as PayloadComment, User } from '../../../../payload-types';

interface Comment extends PayloadComment {
  commentBy: User;
}

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

  const handleUpvote = async (commentId: string, currentVote?: 'upvote' | 'downvote' | null) => {
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
            parentComment: {
              relationTo: 'comments',
              value: parentId,
            },
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
    return (
      <React.Fragment key={comment.id}>
        <div className="comment" style={{ marginLeft: `${comment.depth * 32}px` }}>
          <div className="comment-header">
            <div className="comment-user">
              <div className="comment-avatar">
                <div className="avatar-button">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => handleUpvote(comment.id, comment.userVote)}
                className={`upvote-button ${comment.userVote === 'upvote' ? 'upvoted' : ''}`}
              >
                <ThumbsUp size={16} />
                <span>{comment.commentUpvotes}</span>
              </button>
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
          <div style={{ marginLeft: `${(comment.depth + 1) * 32}px`, marginTop: 8, marginBottom: 8, position: 'relative' }}>
             {isSubmittingReply && (
               <div className="loading-overlay">
                 <div className="loading-spinner"></div>
               </div>
             )}
            <textarea
              value={replyText}
              onChange={handleReplyInput}
              onKeyDown={(e) => handleReplyKeyDown(e, comment.id, comment.depth)}
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

  // Helper to build a tree from flat comments
  function buildCommentTree(comments: Comment[]): CommentWithChildren[] {
    const map = new Map<string, CommentWithChildren>();
    const roots: CommentWithChildren[] = [];

    comments.forEach(comment => {
      map.set(comment.id, { ...comment, children: [] });
    });

    map.forEach(comment => {
      let parentId: string | undefined;
      if (comment.parentComment) {
        parentId = typeof comment.parentComment === 'string'
          ? comment.parentComment
          : (comment.parentComment as any).value;
      }
      if (parentId) {
        const parent = map.get(parentId);
        if (parent) {
          parent.children.push(comment);
        } else {
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    function sortTree(nodes: CommentWithChildren[]) {
      nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      nodes.forEach(node => sortTree(node.children));
    }
    sortTree(roots);

    return roots;
  }

  // Recursive render function
  function renderCommentTree(comments: CommentWithChildren[] = [], depth = 0) {
    return comments.map(comment => (
      <React.Fragment key={comment.id}>
        {renderComment({ ...comment, depth })}
        {renderCommentTree(comment.children, depth + 1)}
      </React.Fragment>
    ));
  }

  const commentTree = buildCommentTree(comments);

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
        {renderCommentTree(commentTree)}
      </div>
    </div>
  );
} 