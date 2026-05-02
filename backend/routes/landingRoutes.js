const express = require('express');
const { getPublicTestimonials } = require('../controllers/landingTestimonialController');

const router = express.Router();

router.get('/testimonials', getPublicTestimonials);

module.exports = router;
