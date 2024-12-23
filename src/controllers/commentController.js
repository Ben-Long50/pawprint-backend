import commentServices from '../services/commentServices.js';
import notificationServices from '../services/notificationServices.js';

const commentController = {
  getComments: async (req, res) => {
    try {
      const comments = await commentServices.getComments(req.params.postId);
      res
        .status(200)
        .json({ comments, message: 'Successfully fetched comments' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteComment: async (req, res) => {
    try {
      await commentServices.deleteComment(req.params.commentId);
      res.status(200).json({ message: 'Successfully deleted comment' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  likeComment: async (req, res) => {
    try {
      const commentLike = await commentServices.likeComment(
        req.params.id,
        req.body.activeId,
      );
      await notificationServices.createCommentLikeNotification(
        req.body.activeId,
        commentLike.comment.profileId,
        commentLike.commentLike.id,
      );
      res.status(200).json({ message: 'Successfully liked comment' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  unlikeComment: async (req, res) => {
    try {
      await commentServices.unlikeComment(req.params.id, req.body.activeId);
      res.status(200).json({ message: 'Successfully unliked comment' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default commentController;
