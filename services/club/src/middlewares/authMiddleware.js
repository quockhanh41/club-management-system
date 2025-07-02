export const extractUserFromHeaders = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const userFullName = req.headers['x-user-full-name'];
  const userRoles = req.headers['x-user-roles'];
  const emailVerified = req.headers['x-user-email-verified'];

  req.user = {
    id: userId,
    email: userEmail,
    fullName: userFullName,
    roles: userRoles,
    emailVerified: emailVerified
  };

  next();
};
