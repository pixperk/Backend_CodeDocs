const jwt = require('jsonwebtoken');

require('dotenv').config()

const jwtSecret = process.env.JWT_SECRET;

const isAuthenticated = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, jwtSecret);
          
            req.user = decoded; 
            next();
        } catch (ex) {
            res.status(403).send({ message: 'Invalid or expired token.' });
        }
    } else {
        res.status(401).send({ message: 'Access denied. No token provided.' });
    }
};

module.exports = isAuthenticated;
