const  Document  = require('../models/documentModel');
const mongoose = require('mongoose');
const messages = require('../utils/messages');

const handleSocketConnection = (io) => {
    io.on('connection', async (socket) => {
        console.log('User connected');

        const userId = socket.handshake.query.userId;

        if (!userId) {
            console.error('User ID not provided. Documents will not be sent.');
            return;
        }

        try {
            // Find documents where the user is the owner or allowed user
            const documents = await Document.find({
                $or: [
                    { owner: userId },
                    { "allowedUsers.user": userId }
                ]
            });
            socket.emit('all-documents', documents);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }

        socket.on('create-document', async (data) => {
            const { title, content, userId, allowedUsers } = data;
            const allowedUserIds = Array.isArray(allowedUsers) ? allowedUsers.map(userId => mongoose.Types.ObjectId(userId)) : [];

            const document = new Document({
                title,
                content,
                allowedUsers: allowedUserIds,
                owner: userId,
            });

            try {
                await document.save();
                io.emit('document-created', { id: document.id, title, content, owner: userId, allowedUsers });
            } catch (error) {
                console.error('Error creating document:', error);
            }
        });

        socket.on('get-update-document', async (data) => {
            const { documentId, content, userId } = data;

            try {
                const document = await Document.findById(documentId);


                if (!document) {
                    return socket.emit('unauthorized', { Message:messages.error.NOT_FOUND });
                }

                const userAllowed = document.owner.equals(userId) || (document.allowedUsers && document.allowedUsers.some(user => user.user.equals(userId)));

                if (userAllowed) {
                    await Document.findByIdAndUpdate(documentId, { content });
                    io.emit('document-updated', { documentId, content });
                } else {
                    socket.emit('unauthorized', { Message:messages.error.UNAUTHORIZED });
                }
            } catch (error) {
                console.error('Error fetching document:', error);
            }
        });

        socket.on('get-document-content', async (data) => {
            const { documentId, documentTitle } = data;
            const userId = socket.handshake.query.userId; // Get the user ID from URL parameters
            const document = await Document.findById(documentId);
            

            if (!document) {
                console.log('Document not found:', documentId);
                return socket.emit('unauthorized', { Message:messages.error.NOT_FOUND });
            }

            // console.log('Document Owner:', document.owner);
            console.log('Allowed Users:', document.allowedUsers);

            if (
                (document.owner && !document.owner.equals(userId)) &&
                (!document.allowedUsers || !document.allowedUsers.some(allowedUser => allowedUser.user.equals(userId))) &&
                (!document.allowedUsers || !document.allowedUsers.some(allowedUser => allowedUser.user.equals(userId) && allowedUser.canEdit))
            ) {
                console.log('Unauthorized access for user:', userId);
                return socket.emit('unauthorized', { Message:messages.error.UNAUTHORIZED });
            }

            console.log('User has access to the document:', userId);
            socket.emit('document-content', { id: document.id, title: documentTitle, content: document.content, allowedUsers: document.allowedUsers });
        });

        socket.on('update-document', async (data) => {
            const { documentId, content } = data;

            try {
                const document = await Document.findById(documentId);
                

                if (!document) {
                    return socket.emit('unauthorized', { Message:messages.error.NOT_FOUND });
                }

                if (document.owner.equals(userId) || (document.allowedUsers && document.allowedUsers.some(user => user.user.equals(userId) && user.canEdit))) {
                    await Document.findByIdAndUpdate(documentId, { content });
                    io.emit('document-updated', { documentId, content });
                } else {
                    socket.emit('unauthorized', {Message:messages.error.UNAUTHORIZED });
                }
            } catch (error) {
                console.error('Error updating document:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};

module.exports = { handleSocketConnection };
