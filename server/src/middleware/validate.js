const { body, validationResult } = require('express-validator');

/**
 * Validation rules for POST /api/chat
 * express-validator returns middleware arrays — we spread them into the route.
 */
const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 5000 })
    .withMessage('Message must be under 5000 characters'),

  body('persona')
    .trim()
    .notEmpty()
    .withMessage('Persona is required')
    .isIn(['Legal Expert', 'Medical Consultant', 'Education Tutor'])
    .withMessage('Invalid persona'),

  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid conversation ID'),
];

/**
 * Middleware that checks validation results and returns 400 if any fail.
 * Placed after the validation rules in the route chain.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Validation failed');
    err.statusCode = 400;
    err.details = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: err.details,
      },
    });
  }
  next();
}

module.exports = { chatValidation, handleValidationErrors };
