const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  url: String,
  type: {
    type: String,
    enum: ['image', 'pdf', 'word', 'video'],
    required: true,
  },
});

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  likes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  dislikes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
})

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  likes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  dislikes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  files: [fileSchema], // Array of file objects for comment
  replies: [replySchema], // Array of sub-comments (self-referencing schema)
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  files: [fileSchema], // Array of file objects for post
  likes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  dislikes : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  bookmarks : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  comments: [commentSchema], // Array of comments
});

const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Reply = mongoose.model('Reply', replySchema);

module.exports = { Post, Comment, Reply };
