const User = require('../models/userModel'); 
const messages = require('../utils/messages');


const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });

        if (user) {
            res.redirect(`/create-document?userId=${user.id}`);
        } else {
            res.render('login', { Message: messages.error.INVALID_CREDENTIALS });
        }
    } catch (error) {
       
        res.status(500).json({ message: messages.error.STATUS });
    }
};


const signup = async (req, res) => {
    try {
        const { username, password } = req.body;

        const existingUser = await User.findOne({ username: { $regex: new RegExp((username ?? '').trim(), 'i') } });
        if (existingUser) {
            return res.render('signup', { Message: messages.error.USER_ALREADY_REGISTERED });
        }

        const newUser = new User({ username: username, password: password });
        await newUser.save();

        res.redirect('/login');
    } catch (error) {
        
        res.status(500).json({ message: messages.error.STATUS });
    }
};

module.exports = { login, signup };
