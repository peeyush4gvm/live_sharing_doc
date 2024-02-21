const Document = require('../models/documentModel');
const mongoose = require('mongoose');
const messages = require('../utils/messages');
const User = require('../models/userModel'); // Assuming you have a User model

const handleSocketConnection = (io) => {
    let activeUsersMap = {};

    // Function to update active users list and broadcast changes
    const updateActiveUsers = async (documentId) => {
        const activeUsers = activeUsersMap[documentId] || [];
        const usernames = await Promise.all(activeUsers.map(async userId => {
            const user = await User.findById(userId);
            return user ? user.username : 'Unknown';
        }));
        io.emit('active-users', { documentId, activeUsers: usernames });
    };

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
                    return socket.emit('unauthorized', { Message: messages.error.NOT_FOUND });
                }

                const userAllowed = document.owner.equals(userId) || (document.allowedUsers && document.allowedUsers.some(user => user.user.equals(userId)));

                if (userAllowed) {
                    await Document.findByIdAndUpdate(documentId, { content });
                    io.emit('document-updated', { documentId, content });
                } else {
                    socket.emit('unauthorized', { Message: messages.error.UNAUTHORIZED });
                }
            } catch (error) {
                console.error('Error fetching document:', error);
            }
        });

        socket.on('get-document-content', async (data) => {
            const { documentId } = data;
            const document = await Document.findById(documentId);

            if (!document) {
                console.log('Document not found:', documentId);
                return socket.emit('unauthorized', { Message: messages.error.NOT_FOUND });
            }

            if (
                (document.owner && !document.owner.equals(userId)) &&
                (!document.allowedUsers || !document.allowedUsers.some(allowedUser => allowedUser.user.equals(userId))) &&
                (!document.allowedUsers || !document.allowedUsers.some(allowedUser => allowedUser.user.equals(userId) && allowedUser.canEdit))
            ) {
                console.log('Unauthorized access for user:', userId);
                return socket.emit('unauthorized', { Message: messages.error.UNAUTHORIZED });
            }

            // Add user to active users list for this document
            if (!activeUsersMap[documentId]) {
                activeUsersMap[documentId] = [];
            }
            activeUsersMap[documentId].push(userId);

            // Update active users and emit document content
            await updateActiveUsers(documentId);
            socket.emit('document-content', { id: document.id, title: document.title, content: document.content, allowedUsers: document.allowedUsers });
        });

        socket.on('update-document', async (data) => {
            const { documentId, content } = data;

            try {
                const document = await Document.findById(documentId);

                if (!document) {
                    return socket.emit('unauthorized', { Message: messages.error.NOT_FOUND });
                }

                if (document.owner.equals(userId) || (document.allowedUsers && document.allowedUsers.some(user => user.user.equals(userId) && user.canEdit))) {
                    await Document.findByIdAndUpdate(documentId, { content });
                    io.emit('document-updated', { documentId, content });
                } else {
                    socket.emit('unauthorized', { Message: messages.error.UNAUTHORIZED });
                }
            } catch (error) {
                console.error('Error updating document:', error);
            }
        });

        socket.on('join-document', async ({ documentId }) => {
            // Add user to active users list for this document
            if (!activeUsersMap[documentId]) {
                activeUsersMap[documentId] = [];
            }
            activeUsersMap[documentId].push(userId);
            // Update active users and emit changes
            await updateActiveUsers(documentId);
        });

        socket.on('leave-document', async ({ documentId }) => {
            // Remove user from active users list for this document
            activeUsersMap[documentId] = (activeUsersMap[documentId] || []).filter(id => id !== userId);
            // Update active users and emit changes
            await updateActiveUsers(documentId);
        });

        socket.on('disconnect', async () => {
            // Remove user from active users list for all documents
            for (const documentId of Object.keys(activeUsersMap)) {
                activeUsersMap[documentId] = (activeUsersMap[documentId] || []).filter(id => id !== userId);
                // Update active users and emit changes
                await updateActiveUsers(documentId);
            }
            console.log('User disconnected');
        });
    });
};

module.exports = { handleSocketConnection };
