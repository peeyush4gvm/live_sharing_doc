const express = require('express');
const router = express.Router();
const { getdocuments,createDocument, grantPermissionRoute, downloadPdfRoute } = require('../controllers/documentController');


router.get('/create-document', getdocuments);
router.post('/create-document', createDocument);

router.post('/api/grant-permission/:documentId', grantPermissionRoute);

router.get('/download-pdf/:id', downloadPdfRoute);


module.exports = router;