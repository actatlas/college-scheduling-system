const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createRequest,
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
} = require('../controllers/scheduleAdjustmentRequests.controller');

const router = express.Router();
router.use(authMiddleware);

router.post('/', createRequest);
router.get('/', listRequests);
router.get('/:id', getRequestById);
router.patch('/:id/approve', approveRequest);
router.patch('/:id/reject', rejectRequest);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

module.exports = router;
