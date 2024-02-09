// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { login, signup } = require('../controllers/authController'); // Import login and signup functions from authController

// Define authentication routes
router.get('/login', (req, res) => {
    res.render('login', { errorMessage: '' });
});

router.post('/login', login); // Call the login function

router.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: '' });
});

router.post('/signup', signup); // Call the signup function

module.exports = router;
