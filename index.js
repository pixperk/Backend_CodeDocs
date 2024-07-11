const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const docRoutes = require('./routes/posts');
const path = require('path')

require('dotenv').config();

const errorHandler = require('./middlewares/errorHandler');
const { connectDB } = require('./utils/utils');


const app = express();

app.use(cors()); 

connectDB(process.env.MONGODB_URI)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'your_session_secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Use Routes
app.use('/auth', authRoutes);
app.use('/docs', docRoutes);


// Use the error handler middleware at the end
app.use(errorHandler);

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
