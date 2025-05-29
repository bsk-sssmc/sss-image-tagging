import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import type { Comment as PayloadComment, User } from '../../../payload-types';

interface Comment extends Omit<PayloadComment, 'commentBy' | 'parentComment'> {
  commentBy: {
    relationTo: 'users';
    value: User;
  };
  parentComment?: string;
  userVote?: 'upvote' | 'downvote' | null;
  commentUpvotes?: number;
}

interface CommentWithChildren extends Comment {
  children: CommentWithChildren[];
}

const CommentSection: React.FC<{ imageId: string }> = ({ imageId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

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

  const renderAvatar = (comment: Comment) => {
    // Since User type doesn't have avatar, we'll always show initials
    const initial = comment.commentBy.value.displayName?.[0]?.toUpperCase() || '?';
    return (
      <span className="comment-avatar-initial" title={comment.commentBy.value.displayName}>
        {initial}
      </span>
    );
  };

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
    setReplyText('');
  };

  const handleReplyInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  const handleReplyKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>, parentId: string, depth: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!replyText.trim()) return;
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }
  };

  const renderComment = (comment: Comment & { depth: number }) => {
    return (
      <React.Fragment key={comment.id}>
        <div className="comment" style={{ marginLeft: `${comment.depth * 20}px` }}>
          <div className="comment-header">
            <div className="comment-user">
              <span className="comment-avatar">{renderAvatar(comment)}</span>
              <div className="comment-info">
                <span className="comment-author">{comment.commentBy.value.displayName}</span>
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
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
          <p className="comment-text">{comment.commentText}</p>
        </div>
        {replyTo === comment.id && (
          <div style={{ marginLeft: `${(comment.depth + 1) * 20}px`, marginTop: 8, marginBottom: 8 }}>
            <textarea
              value={replyText}
              onChange={handleReplyInput}
              onKeyDown={(e) => handleReplyKeyDown(e, comment.id, comment.depth)}
              placeholder="Write a reply... (Press Enter to post)"
              className="comment-input"
              rows={2}
              disabled={isLoading}
              autoFocus
            />
          </div>
        )}
      </React.Fragment>
    );
  };

  // Helper to build a tree and flatten it in the desired order
  function buildCommentTree(comments: Comment[]): (Comment & { depth: number })[] {
    const map = new Map<string, CommentWithChildren>();
    const roots: CommentWithChildren[] = [];

    // Initialize map
    comments.forEach(comment => {
      map.set(comment.id, { ...comment, children: [] });
    });

    // Build tree
    comments.forEach(comment => {
      if (comment.parentComment) {
        const parent = map.get(comment.parentComment);
        if (parent) {
          parent.children.push(map.get(comment.id)!);
        }
      } else {
        roots.push(map.get(comment.id)!);
      }
    });

    // Sort children by createdAt ascending
    function sortTree(nodes: CommentWithChildren[]) {
      nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      nodes.forEach(node => sortTree(node.children));
    }
    sortTree(roots);

    // Flatten tree with depth
    const result: (Comment & { depth: number })[] = [];
    function flatten(nodes: CommentWithChildren[], depth: number) {
      for (const node of nodes) {
        result.push({ ...node, depth });
        flatten(node.children, depth + 1);
      }
    }
    flatten(roots, 0);
    return result;
  }

  const orderedComments = buildCommentTree(comments);

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
        {orderedComments.map(renderComment)}
      </div>
    </div>
  );
};

export default CommentSection; 