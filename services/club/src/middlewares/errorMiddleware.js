export const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle custom validation errors
  if (err.message && err.message.includes('Invalid')) {
    return res.status(400).json({
      status: 400,
      error: 'VALIDATION_ERROR',
      message: err.message
    });
  }

  // Handle not found errors
  if (err.name === 'NotFoundError' || err.error === 'CLUB_NOT_FOUND') {
    return res.status(404).json({
      status: 404,
      error: 'CLUB_NOT_FOUND',
      message: 'Club not found'
    });
  }

  // Default error
  res.status(500).json({
    status: 500,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
};
