const express = require("express");
const fs = require("fs");
const { uploadBlogFiles } = require("../middlewares/blogFiles");
const isAuthenticated = require("../middlewares/isAuthenticated");
const { Post, Comment, Reply } = require("../models/Post");
const multerErrorHandler = require("../middlewares/multerErrorHandler");

const router = express.Router();

const deleteFiles = async (files) => {
  for (const file of files) {
    try {
      await fs.promises.unlink(file.url);
    } catch (err) {
      console.error('Error deleting the file:', err);
    }
  }
};

// Helper function to toggle like/dislike
const toggleLikeDislike = (item, userId, action) => {
  const oppositeAction = action === 'likes' ? 'dislikes' : 'likes';

  if (item[action].includes(userId)) {
    item[action].pull(userId); // Remove like/dislike if already present
  } else {
    item[action].push(userId); // Add like/dislike
    item[oppositeAction].pull(userId); // Remove from opposite action if present
  }

};


router.post(
  "/newDoc",
  isAuthenticated,
  (req, res, next) => {
    uploadBlogFiles(req, res, (err) => {
      if (err) {
        return next(err);
      }

      next();
    });
  },
  multerErrorHandler,
  async (req, res) => {
    try {
      const { title, content } = req.body;

      if (!title || !content) {
        if (req.files) {
          await Promise.all(
            req.files.map((file) =>
              fs.promises
                .unlink(file.path)
                .catch((err) => console.error("Error deleting the file:", err))
            )
          );
        }

        return res
          .status(400)
          .send({
            status: "error",
            statusCode: 400,
            message: "Enter all the fields",
          });
      }

      const fileTypeMap = {
        "image/jpeg": "image",
        "image/png": "image",
        "application/pdf": "pdf",
        "application/msword": "word",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "word",
        "video/mp4": "video",
      };

      const files = req.files.map((file) => {
        const type = fileTypeMap[file.mimetype];
        if (!type) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }
        return { url: file.path, type };
      });

      const newPost = new Post({
        title,
        content,
        author: req.user.id,
        files,
      });

      await newPost.save();


      // Populate the author field to get username, id, and profile picture
      await newPost.populate("author", "username _id profilePicture");

      res.status(201).json(newPost);
    } catch (error) {
      if (req.files) {
        await Promise.all(
          req.files.map((file) =>
            fs.promises
              .unlink(file.path)
              .catch((err) => console.error("Error deleting the file:", err))
          )
        );
      }

      res
        .status(400)
        .json({ status: "error", statusCode: 400, message: error.message });
    }
  }
);

router.put(
  "/update/:id",
  isAuthenticated,
  (req, res, next) => {
    uploadBlogFiles(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },
  multerErrorHandler,
  async (req, res) => {
    try {
      const { title, content, filesToDelete } = req.body;
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.author.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Handle deletion of specified files
      if (filesToDelete && filesToDelete.length > 0) {
        const filesToDeleteArray = JSON.parse(filesToDelete);
        post.files = post.files.filter((file) => {
          if (filesToDeleteArray.includes(file.url)) {
            fs.promises
              .unlink(file.url)
              .catch((err) => console.error("Error deleting the file:", err));
            return false;
          }
          return true;
        });
      }

      // Handle addition of new files
      if (req.files.length > 0) {
        const fileTypeMap = {
          "image/jpeg": "image",
          "image/png": "image",
          "application/pdf": "pdf",
          "application/msword": "word",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            "word",
          "video/mp4": "video",
        };

        const blogFiles = req.files.map((file) => {
          const type = fileTypeMap[file.mimetype];
          if (!type) {
            throw new Error(`Invalid file type: ${file.mimetype}`);
          }
          return { url: file.path, type };
        });

        post.files = post.files.concat(blogFiles);
      }

      post.title = title || post.title;
      post.content = content || post.content;
      post.updatedAt = new Date();

      await post.save();

      await post.populate("author", "username _id pfp");

      res.json(post);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('comments');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete files associated with the post
    await deleteFiles(post.files);

    // Delete files associated with comments and replies
    if(post.comments.length > 0)
    {for (const comment of post.comments) {
      await deleteFiles(comment.files);
      if (comment.replies && comment.replies.length > 0) {
        for (const reply of comment.replies) {
          await deleteFiles(reply.files);
        }
      }
    }}

    // Finally delete the post after deleting associated files
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/:id/comment",
  isAuthenticated,
  (req, res, next) => {
    uploadBlogFiles(req, res, (err) => {
      if (err) {
        return next(err);
      }

      next();
    });
  },
  multerErrorHandler,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
  
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const { text } = req.body;
      if (!text) {
        if (req.files) {
          await Promise.all(
            req.files.map((file) =>
              fs.promises
                .unlink(file.path)
                .catch((err) => console.error("Error deleting the file:", err))
            )
          );
        }

        return res
          .status(400)
          .send({
            status: "error",
            statusCode: 400,
            message: "Enter all the fields",
          });
      }
     
  
      const blogFiles = req.files.map((file) => ({ url: file.path, type: file.mimetype.split("/")[0] }));
  
      const newComment = new Comment({
        text,
        author: req.user.id,
        files : blogFiles,
      });
  
      post.comments.push(newComment);
      await post.save();

      res.status(201).json(newComment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:postId/comments/:commentId/reply',
  isAuthenticated,
  async (req, res, next) => {
    const {postId, commentId} = req.params
    try {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const comment = post.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found within the specified post' });
      }

      const { text } = req.body;
      if (!text) {
        return res.status(400).send({
          status: 'error',
          statusCode: 400,
          message: 'Enter all the fields',
        });
      }
   

      const reply = new Reply({
        text,
        author: req.user.id,
      });

      await reply.save(); 

      comment.replies.push(reply); 
      await post.save();

      res.status(201).json(reply);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete('/:postId/comments/:commentId', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete files associated with the comment
    await deleteFiles(comment.files);

    // Delete files associated with replies
    for (const reply of comment.replies) {
      await deleteFiles(reply.files);
    }

    // Remove the comment from the post
    post.comments.pull(comment.d);
    await post.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a reply
router.delete('/:postId/comments/:commentId/replies/:replyId', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply= comment.replies.id(req.params.replyId)

    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    if (reply.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete files associated with the reply
     comment.replies.pull(reply._id)

    // Remove the reply from the comment
    await post.save();

    res.json({ message: 'Reply deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:postId/:action(like|dislike)', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    toggleLikeDislike(post, req.user.id, req.params.action + 's');
    await post.save();

    res.json({ message: `Post ${req.params.action}d`, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like or dislike a comment
router.post('/:postId/comments/:commentId/:action(like|dislike)', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    toggleLikeDislike(comment, req.user.id, req.params.action + 's');
    await post.save();

    res.json({ message: `Comment ${req.params.action}d`, comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like or dislike a reply
router.post('/:postId/comments/:commentId/replies/:replyId/:action(like|dislike)', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId)

    toggleLikeDislike(reply, req.user.id, req.params.action + 's');
    await post.save();

    res.json({ message: `Reply ${req.params.action}d`, comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:postId/bookmark', isAuthenticated, async (req,res)=>{
  try {
    const post = await Post.findById(req.params.postId);
    const userId = req.user.id

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.bookmarks.includes(userId)) {
      post.bookmarks.pull(userId);
    } else {
      post.bookmarks.push(userId);
    }
    await post.save();

    res.json({ message: `${post.title} Bookmarked`, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
} )


// Get top 20 most liked and commented posts
router.get('/top', async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $addFields: {
          totalLikesAndComments: {
            $add: [{ $size: '$likes' }, { $size: '$comments' }],
          },
        },
      },
      { $sort: { totalLikesAndComments: -1 } },
      { $limit: 20 },
    ])
      .exec();

    const populatedPosts = await Post.populate(posts, [
      {
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      },
      {
        path: 'comments.replies',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      },
      {
        path: 'author',
        select: 'username _id profilePicture email',
      },
      {
        path: 'likes dislikes bookmarks',
        select: 'username _id profilePicture email',
      },
    ]);

    res.status(200).json(populatedPosts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Get a single post
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate({
        path: 'comments.replies',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate('author', 'username _id profilePicture email')
      .populate('likes dislikes bookmarks', 'username _id profilePicture email');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate({
        path: 'comments.replies',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate('author', 'username _id profilePicture email')
      .populate('likes dislikes bookmarks', 'username _id profilePicture email');

    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all posts by a user
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate({
        path: 'comments.replies',
        populate: {
          path: 'author',
          select: 'username _id profilePicture email',
        },
      })
      .populate('author', 'username _id profilePicture email')
      .populate('likes dislikes bookmarks', 'username _id profilePicture email');

    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
