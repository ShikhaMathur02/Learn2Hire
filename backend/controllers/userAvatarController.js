const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { notifyPlatformAdmins } = require('../utils/notificationService');

const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

function extFromMimetype(mimetype) {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  return '.jpg';
}

function removeExistingAvatars(userId) {
  const base = String(userId);
  let names = [];
  try {
    names = fs.readdirSync(AVATAR_DIR);
  } catch (_) {
    return;
  }
  for (const name of names) {
    const isLegacy = name.startsWith(`${base}.`);
    const isVersioned = name.startsWith(`${base}-`);
    if (!isLegacy && !isVersioned) continue;
    try {
      fs.unlinkSync(path.join(AVATAR_DIR, name));
    } catch (_) {
      /* ignore */
    }
  }
}

// @desc    Upload profile photo (student or faculty)
// @route   POST /api/profile/photo
// @access  Private
exports.uploadMyProfilePhoto = async (req, res) => {
  try {
    if (!['student', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students and faculty can upload a profile photo.',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please choose an image file (JPEG, PNG, WebP, or GIF).',
      });
    }

    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    removeExistingAvatars(req.user._id);

    const ext = extFromMimetype(req.file.mimetype);
    // Unique name per upload so browsers never show a stale cached image at the same URL.
    const filename = `${String(req.user._id)}-${Date.now()}${ext}`;
    const finalPath = path.join(AVATAR_DIR, filename);
    fs.writeFileSync(finalPath, req.file.buffer);

    const publicPath = `/uploads/avatars/${filename}`;
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: publicPath });

    try {
      await notifyPlatformAdmins({
        title: 'Profile photo updated',
        message: `${req.user.name} (${req.user.email}, ${req.user.role}) uploaded a new profile photo.`,
        category: 'system',
        type: 'user_avatar_updated',
        actionUrl: '/dashboard',
        metadata: { userId: req.user._id },
      });
    } catch (e) {
      console.error('[Learn2Hire] avatar admin notify:', e.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Profile photo updated.',
      data: { profilePhoto: publicPath },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Remove profile photo (revert to initials in UI)
// @route   DELETE /api/profile/photo
// @access  Private
exports.deleteMyProfilePhoto = async (req, res) => {
  try {
    if (!['student', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students and faculty can update profile photos.',
      });
    }

    removeExistingAvatars(req.user._id);
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: '' });

    try {
      await notifyPlatformAdmins({
        title: 'Profile photo removed',
        message: `${req.user.name} (${req.user.email}, ${req.user.role}) removed their profile photo.`,
        category: 'system',
        type: 'user_avatar_removed',
        actionUrl: '/dashboard',
        metadata: { userId: req.user._id },
      });
    } catch (e) {
      console.error('[Learn2Hire] avatar admin notify:', e.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Profile photo removed.',
      data: { profilePhoto: '' },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};
