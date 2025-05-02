import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import randomstring from 'randomstring';
import userServices from '../services/userServices.js';
import profileServices from '../services/profileServices.js';
import upload from '../utils/multer.js';

const userController = {
  getUsers: async (req, res) => {
    try {
      const users = await userServices.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await userServices.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createUser: [
    body('firstName', 'First name must be a minimum of 2 characters')
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body('lastName', 'Last name must be a minimum of 2 characters')
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body('email')
      .trim()
      .escape()
      .custom(async (value) => {
        const user = await userServices.getUserByEmail(value);
        if (user && user.facebookId) {
          throw new Error(
            'An account with this email already exists using the Facebook sign in option',
          );
        } else if (user && user.googleId) {
          throw new Error(
            'An account with this email already exists using the Google sign in option',
          );
        } else if (user) {
          throw new Error('An account with this email already exists');
        }
        return true;
      }),
    body('password', 'Password must be a minimum of 3 characters')
      .trim()
      .isLength({ min: 6 })
      .escape(),
    body('confirmPassword', 'Passwords must match')
      .trim()
      .escape()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          return false;
        }
        return true;
      }),

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      } else {
        try {
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          const userData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPassword,
          };
          const newUser = await userServices.createUser(userData);

          const defaultProfile = await profileServices.createOrUpdateProfile(
            {
              id: 'null',
              username: newUser.username,
              petName: 'Default',
              active: true,
            },
            newUser.id,
          );
          res.status(200).json({ newUser, defaultProfile });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    },
  ],

  createGuestUser: async (req, res, next) => {
    try {
      const uniqueIdentifier = randomstring.generate({
        length: 8,
        charset: 'numeric',
      });

      const hashedPassword = await bcrypt.hash(uniqueIdentifier, 10);
      const guestData = {
        firstName: 'Human',
        lastName: uniqueIdentifier,
        email: `Human${uniqueIdentifier}@pawprint.com`,
        password: hashedPassword,
      };
      const newGuestUser = await userServices.createGuestUser(guestData);

      const profile = await profileServices.createOrUpdateProfile(
        {
          id: null,
          username: newGuestUser.username,
          petName: 'Default',
          active: true,
        },
        newGuestUser.id,
      );

      req.body.email = newGuestUser.email;
      req.body.password = uniqueIdentifier;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  editUser: [
    upload.none(),
    body('firstName', 'First name must be a minimum of 2 characters')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body('lastName', 'Last name must be a minimum of 2 characters')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body('email')
      .optional()
      .trim()
      .escape()
      .custom(async (value, { req }) => {
        const user = await userServices.getUserById(req.user.id);
        if (user && user.facebookId) {
          throw new Error(
            'You cannot change your email since it is linked to the Facebook sign in option',
          );
        } else if (user && user.googleId) {
          throw new Error(
            'You cannot change your email since it is linked to the Google sign in option',
          );
        }
        return true;
      }),
    body('password')
      .optional()
      .trim()
      .isLength({ min: 6 })
      .withMessage('New password must be a minimum of 6 characters')
      .escape()
      .custom(async (value, { req }) => {
        const user = await userServices.getUserById(req.user.id);
        if (user && user.facebookId) {
          throw new Error(
            'You cannot change your password since it is linked to the Facebook sign in option',
          );
        } else if (user && user.googleId) {
          throw new Error(
            'You cannot change your password since it is linked to the Google sign in option',
          );
        }
        if (value && !req.body.confirmPassword) {
          throw new Error(
            'Confirm password is required when setting a new password',
          );
        }
        return true;
      }),
    body('confirmPassword', 'New passwords must match')
      .optional()
      .trim()
      .escape()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          return false;
        }
        return true;
      }),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      } else {
        try {
          const formData = {};
          if (req.body.firstName) formData.firstName = req.body.firstName;
          if (req.body.lastName) formData.lastName = req.body.lastName;
          if (req.body.email) formData.email = req.body.email;
          if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            formData.password = hashedPassword;
          }
          const updatedUser = await userServices.editUser(formData, req.user);
          res
            .status(200)
            .json({ updatedUser, message: 'Successfully updated account' });
        } catch (error) {
          res.status(500).json({ message: error.message });
        }
      }
    },
  ],

  deleteUser: async (req, res) => {
    try {
      const userId = req.userId || req.user.id;
      console.log(userId);

      const user = await userServices.deleteUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ user, message: 'Successfully deleted user' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteExpiredGuests: async () => {
    try {
      const result = await userServices.deleteExpiredGuests();
      console.log(`Deleted ${result.count} expired guests`);
    } catch (error) {
      console.error(error.message);
    }
  },

  authenticateUser: [
    body('email', 'Email does not exist')
      .trim()
      .escape()
      .custom(async (value) => {
        const user = await userServices.getUserByEmail(value);

        if (user && user.googleId) {
          throw new Error(
            'An account with this email already exists using the Google sign in option',
          );
        } else if (user && user.facebookId) {
          throw new Error(
            'An account with this email already exists using the Facebook sign in option',
          );
        } else if (!user) {
          throw new Error('An account using this email does not exist');
        }
        return true;
      }),
    body('password', 'Incorrect password')
      .trim()
      .escape()
      .custom(async (value, { req }) => {
        const user = await userServices.getUserByEmail(req.body.email);
        if (!user || user.facebookId) {
          return false;
        }
        const match = await bcrypt.compare(value, user.password);
        if (!match) {
          throw new Error('Incorrect password');
        }
        return true;
      }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      } else {
        next();
      }
    },
  ],
};

export default userController;
