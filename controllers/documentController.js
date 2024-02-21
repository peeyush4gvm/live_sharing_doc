const Document = require('../models/documentModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const messages = require('../utils/messages');
const mongoose = require('mongoose');

// Create document route function
async function getdocuments(req, res) {
    const userId = req.query.userId;
    try {
        // Log user ID for debugging
        console.log('User ID:', userId);

        // Find documents where the user is the owner or allowed user
        const documents = await Document.find({
            $or: [
                { owner: new mongoose.Types.ObjectId(userId) },
                { "allowedUsers.user": new mongoose.Types.ObjectId(userId) }
            ]
        }).exec(); // Make sure to execute the query

        // Log query conditions and fetched documents for debugging
        console.log('Query Conditions:', {
            $or: [
                { owner: new mongoose.Types.ObjectId(userId) },
                { "allowedUsers.user": new mongoose.Types.ObjectId(userId) }
            ]
        });
        console.log('Fetched documents:');
        documents.forEach(doc => {
            console.log(`Document ID: ${doc._id}`);
            console.log(`  User ID: ${userId}, Owner ID: ${doc.owner}`);
            console.log(`  Title: ${doc.title}`);
            console.log(`  Content: ${doc.content}`);
            console.log('-----------------------------');
        });

        // Check if any documents were found
        if (documents.length === 0) {
            console.log('No matching documents found.');
        }

        res.render('index', { userId: userId, documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).send('Internal Server Error');
    }
}
// Function to handle creating a new document
async function createDocument(req, res) {
    const { title } = req.body;
    const allowedUsers = req.body.allowedUsers ? req.body.allowedUsers.split(',') : [];

    // Convert allowed user IDs to ObjectId
    const allowedUserIds = allowedUsers.map(userId => new mongoose.Types.ObjectId(userId));

    const document = new Document({
        title: title || 'Untitled Document',
        content: '',
        allowedUsers: allowedUserIds,
        owner: new mongoose.Types.ObjectId(req.query.userId), // Set the owner field correctly
    });

    try {
        await document.save();
        res.redirect(`/document/${document.id}`);
    } catch (error) {
        
        res.status(500).json(error);
    }
}

// Grant permission route function
async function grantPermissionRoute(req, res) {
    try {
        const { userIdToAdd, userId, canEdit } = req.body;  // Extract userIdToAdd, userId, and canEdit from the request body
        const documentId = req.params.documentId;

        const document = await Document.findById(documentId);
       
        if (!document || (document.owner && !document.owner.equals(userId)) || 
            (document.allowedUsers && document.allowedUsers.includes(userIdToAdd))) {
            return res.status(403).json({ Message: messages.error.UNAUTHORIZED });
        }

        const userPermission = document.allowedUsers.find(user => user.user.equals(userIdToAdd));

        if (userPermission) {
            userPermission.canEdit = canEdit || false; // Default to false if canEdit is not provided
        } else {
            document.allowedUsers.push({ user: userIdToAdd, canEdit: canEdit || false });
        }

        await document.save();

        res.json({ Message: messages.success.PERMISSION_GRANTED });
    } catch (error) {
        
        res.status(500).json({ message: messages.error.STATUS });
    }
}

// Download PDF route function
async function downloadPdfRoute(req, res) {
    try {
        const documentId = req.params.id;

        const document = await Document.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: messages.error.NOT_FOUND });
        }

        const doc = new PDFDocument();
        const pdfFilePath = path.join(pdfFolderPath, `${document.title}.pdf`);
        const pdfStream = fs.createWriteStream(pdfFilePath);

        // Add content to the PDF document
        doc.fontSize(16).text(document.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(document.content);

        // Pipe the PDF document to the file stream
        doc.pipe(pdfStream);

        // Close the document stream
        doc.end();

        // Handle stream events
        pdfStream.on('finish', () => {
            console.log(`PDF saved to: ${pdfFilePath}`);
            res.download(pdfFilePath); // Send the saved PDF as a download response
        });

    } catch (error) {
       
        res.status(500).json({ message: messages.error.STATUS });
    }
}

module.exports = {    
    getdocuments,
    createDocument,
    grantPermissionRoute,
    downloadPdfRoute
};
