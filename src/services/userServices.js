import prisma from '../config/database.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

const userServices = {
  getAllUsers: async () => {
    try {
      const users = await prisma.user.findMany({
        select: { username: true, id: true },
      });
      return users;
    } catch (error) {
      throw new Error('Failed to fetch users');
    }
  },

  getUserByEmail: async (email) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      return user;
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  getUserById: async (userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          id: true,
        },
      });
      return user;
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  editUser: async (formData, user) => {
    try {
      const updateData = {};

      if (formData.firstName) {
        updateData.firstName = formData.firstName;
      }
      if (formData.lastName) {
        updateData.lastName = formData.lastName;
      }
      if (formData.email) {
        updateData.email = formData.email;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }

      await prisma.user.update({
        where: { id: Number(user.id) },
        data: updateData,
      });
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  deleteUserById: async (userId) => {
    try {
      const profiles = await prisma.profile.findMany({
        where: { userId: Number(userId) },
        select: { id: true, profilePicUploadId: true },
      });

      const profileIds = profiles.map((profile) => profile.id);

      const postPublicIdFields = await Promise.all(
        profileIds.map((id) =>
          prisma.post.findMany({
            where: { profileId: id },
            select: { mediaUploadId: true },
          }),
        ),
      );

      const postPublicIds = postPublicIdFields.map((array) => {
        if (array[0]) {
          return array[0].mediaUploadId;
        }
        return null;
      });

      const profilePublicIds = profiles.map(
        (profile) => profile.profilePicUploadId,
      );

      const allPublicIds = profilePublicIds.concat(postPublicIds);

      await Promise.all(
        allPublicIds.map((id) => {
          if (id) {
            return deleteFromCloudinary(id);
          }
        }),
      );

      const user = await prisma.user.delete({
        where: { id: Number(userId) },
      });

      return user;
    } catch (error) {
      throw new Error('Failed to delete user');
    }
  },

  deleteExpiredGuests: async () => {
    try {
      const currentTime = new Date();
      const cutoffTime = new Date(currentTime.getTime() - 60 * 60 * 1000 * 4);
      const expiredGuests = await prisma.user.deleteMany({
        where: {
          role: 'GUEST',
          createdAt: {
            lt: cutoffTime,
          },
        },
      });
      return expiredGuests;
    } catch (error) {
      throw new Error('Failed to delete expired guests');
    }
  },

  createUser: async (userData) => {
    try {
      const email = userData.email.split('@');
      const username = email[0];

      const newUser = await prisma.user.create({
        data: {
          username,
          googleId: userData.googleId,
          facebookId: userData.facebookId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          role: 'USER',
        },
      });
      return newUser;
    } catch (error) {
      throw new Error('Failed to create user');
    }
  },

  createGuestUser: async (guestData) => {
    try {
      const email = guestData.email.split('@');
      const username = email[0];

      const newUser = await prisma.user.create({
        data: {
          username,
          firstName: guestData.firstName,
          lastName: guestData.lastName,
          email: guestData.email,
          password: guestData.password,
          role: 'GUEST',
        },
      });

      return newUser;
    } catch (error) {
      throw new Error('Failed to create user');
    }
  },
};

export default userServices;
