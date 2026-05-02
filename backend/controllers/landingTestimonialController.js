const mongoose = require('mongoose');
const LandingTestimonial = require('../models/LandingTestimonial');

const DEFAULT_TESTIMONIALS = [
  {
    name: 'Rahul Sharma',
    role: 'Computer Science Student',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    text: 'Learn2Hire helped me identify my weak areas and provided targeted practice material. The personalized feedback was invaluable in my preparation.',
    sortOrder: 0,
    isPublished: true,
  },
  {
    name: 'Dr. Priya Patel',
    role: 'Placement Officer',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    text: 'The analytics dashboard gives us real-time insights into student performance, allowing us to plan targeted interventions and improve placement outcomes.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    name: 'Ananya Gupta',
    role: 'HR Manager',
    image:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    text: 'The automated shortlisting saves us countless hours. The detailed skill reports help us make better hiring decisions with confidence.',
    sortOrder: 2,
    isPublished: true,
  },
];

async function ensureDefaultTestimonials() {
  const count = await LandingTestimonial.countDocuments();
  if (count > 0) return;
  await LandingTestimonial.insertMany(DEFAULT_TESTIMONIALS);
}

/** @returns {string} empty or URL; `null` if invalid when non-empty */
function normalizeTestimonialImageUrl(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (s.length > 2048) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  return s;
}

exports.getPublicTestimonials = async (req, res) => {
  try {
    await ensureDefaultTestimonials();
    const items = await LandingTestimonial.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('name role image text')
      .lean();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to load testimonials',
    });
  }
};

exports.listAdminTestimonials = async (req, res) => {
  try {
    await ensureDefaultTestimonials();
    const items = await LandingTestimonial.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to list testimonials',
    });
  }
};

exports.createTestimonial = async (req, res) => {
  try {
    const { name, role, image, text, sortOrder, isPublished } = req.body || {};
    if (!name || !role || !text) {
      return res.status(400).json({
        success: false,
        message: 'name, role, and text are required',
      });
    }
    let imageStr = '';
    if (image != null && String(image).trim() !== '') {
      const norm = normalizeTestimonialImageUrl(image);
      if (norm === null) {
        return res.status(400).json({
          success: false,
          message: 'Photo URL must be http(s) and at most 2048 characters.',
        });
      }
      imageStr = norm;
    }
    const doc = await LandingTestimonial.create({
      name: String(name).trim(),
      role: String(role).trim(),
      image: imageStr,
      text: String(text).trim(),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isPublished: isPublished !== false,
    });
    res.status(201).json({ success: true, data: doc.toObject() });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create testimonial',
    });
  }
};

exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid testimonial id' });
    }
    const { name, role, image, text, sortOrder, isPublished } = req.body || {};

    const doc = await LandingTestimonial.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (name != null) doc.name = String(name).trim();
    if (role != null) doc.role = String(role).trim();
    if (image != null) {
      const norm = normalizeTestimonialImageUrl(image);
      if (norm === null) {
        return res.status(400).json({
          success: false,
          message: 'Photo URL must be http(s) and at most 2048 characters.',
        });
      }
      doc.image = norm;
    }
    if (text != null) doc.text = String(text).trim();
    if (sortOrder !== undefined) {
      const n = Number(sortOrder);
      if (Number.isFinite(n)) doc.sortOrder = n;
    }
    if (isPublished !== undefined) doc.isPublished = Boolean(isPublished);

    await doc.save();
    res.json({ success: true, data: doc.toObject() });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update testimonial',
    });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid testimonial id' });
    }
    const result = await LandingTestimonial.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete testimonial',
    });
  }
};
