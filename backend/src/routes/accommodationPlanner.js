const express = require('express');
const router = express.Router();

router.post('/plan', (req, res) => {
  const { learner = {}, lesson = {}, needs = [] } = req.body || {};
  const needRows = Array.isArray(needs) ? needs : [];
  const supports = needRows.map((need) => ({
    need,
    accommodation: {
      attention: 'Chunk lesson into 8-minute activities with visible progress.',
      reading: 'Provide vocabulary preview and read-aloud alternative.',
      anxiety: 'Offer low-stakes response mode before group participation.',
      executive_function: 'Add checklist, timer, and one-step instructions.',
    }[need] || 'Provide differentiated prompt and teacher check-in.',
  }));
  res.json({
    feature: 'IEP Accommodation Planner',
    learner: learner.name || 'Learner',
    lesson: lesson.title || 'Lesson',
    supports,
    teacherChecklist: ['Confirm accommodation before session starts.', 'Log observed response.', 'Adjust next lesson path from evidence.'],
  });
});

module.exports = router;
