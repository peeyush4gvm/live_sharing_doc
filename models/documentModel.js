const mongoose = require('mongoose');

// Define the document schema
const documentSchema = new mongoose.Schema({
    title: String,
    content: String,
    allowedUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        canEdit: { type: Boolean, default: false },
    }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Create the Document model
const Document = mongoose.model('Document', documentSchema);

// Export the Document model
module.exports = Document;
