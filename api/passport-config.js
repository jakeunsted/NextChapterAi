const passport = require('passport');
const { ExtractJwt, Strategy: JwtStrategy } = require('passport-jwt');
const jwt = require('jsonwebtoken');
const userService = require('./database/services/user.service');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_KEY
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    // Here you can fetch the user from your database if needed
    try {
      const user = await userService.getUserById(jwt_payload.id);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }

    // return done(null, jwt_payload); // just generates a token
  })
);

const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err || !user) {
      console.log('not authorized');
      return res.status(401).send('Unauthorized');
    }
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Generate a JWT token
 * @param {*} payload 
 * @param {*} expiresIn 
 * @returns 
 */
const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn });
};

/**
 * Invalidate the token
 */
const invalidateToken = (req) => {
  req.logout();
}

module.exports = {
  initialize: () => passport.initialize(),
  authenticate,
  generateToken,
  invalidateToken
};
