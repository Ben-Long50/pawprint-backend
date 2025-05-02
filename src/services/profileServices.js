import prisma from '../config/database.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

const profileServices = {
  getProfiles: async (userId) => {
    try {
      const profiles = await prisma.profile.findMany({
        where: { userId },
        orderBy: {
          username: 'asc',
        },
      });
      return profiles;
    } catch (error) {
      throw new Error('Failed to fetch profiles');
    }
  },

  createOrUpdateProfile: async (profileData, userId) => {
    try {
      const {
        id,
        imageURL,
        publicId,
        username,
        petName,
        bio,
        species,
        breed,
        active,
      } = profileData;

      if (id !== null) {
        return await prisma.profile.update({
          where: { id: Number(id) },
          data: {
            profilePicUrl: imageURL,
            profilePicUploadId: publicId,
            username,
            petName,
            bio,
            species,
            breed,
          },
        });
      }
      return await prisma.profile.create({
        data: {
          username,
          profilePicUrl: imageURL,
          profilePicUploadId: publicId,
          petName,
          bio,
          species,
          breed,
          active,
          userId,
        },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update or create a profile');
    }
  },

  getActiveProfile: async (userId) => {
    try {
      return await prisma.profile.findFirst({
        where: { userId: Number(userId), active: true },
        include: {
          followers: {
            select: {
              followerId: true,
              following: true,
            },
          },
          following: {
            select: {
              profileId: true,
              follower: true,
            },
          },
          bookmarks: {
            select: {
              postId: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to find active profile');
    }
  },

  setActiveProfile: async (userId, profileId) => {
    try {
      const currentActiveProfile = await prisma.profile.findFirst({
        where: { userId, active: true },
      });
      if (currentActiveProfile) {
        await prisma.profile.update({
          where: { id: currentActiveProfile.id },
          data: { active: false },
        });
      }
      return await prisma.profile.update({
        where: { id: Number(profileId) },
        data: { active: true },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update active profile');
    }
  },

  deleteProfile: async (profileId) => {
    try {
      const posts = await prisma.post.findMany({
        where: { profileId: Number(profileId) },
        select: { mediaUploadId: true },
      });
      const postPublicIds = posts.map((post) => post.mediaUploadId);

      await Promise.all(
        postPublicIds.map((id) => {
          if (id) {
            return deleteFromCloudinary(id);
          }
        }),
      );

      await prisma.profile.delete({
        where: { id: Number(profileId) },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to delete profile');
    }
  },

  getProfile: async (profileId) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: Number(profileId) },
        include: {
          followers: {
            select: {
              followerId: true,
              following: true,
            },
          },
          following: {
            select: {
              profileId: true,
              follower: true,
            },
          },
          posts: true,
        },
      });
      return profile;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to find profile');
    }
  },

  getFollowStatus: async (activeId, profileId) => {
    try {
      const status = await prisma.follow.findUnique({
        where: {
          followId: {
            profileId: Number(profileId),
            followerId: Number(activeId),
          },
        },
      });
      console.log(status);

      return !!status;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to follow profile');
    }
  },

  followProfile: async (activeId, profileId) => {
    try {
      await prisma.follow.create({
        data: { profileId: Number(profileId), followerId: Number(activeId) },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to follow profile');
    }
  },

  unfollowProfile: async (activeId, profileId) => {
    try {
      await prisma.follow.delete({
        where: {
          followId: {
            profileId: Number(profileId),
            followerId: Number(activeId),
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to unfollow profile');
    }
  },

  getPosts: async (profileId) => {
    try {
      const posts = await prisma.post.findMany({
        where: { profileId: Number(profileId) },
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          likes: true,
          comments: {
            include: {
              profile: true,
              likes: true,
            },
          },
        },
      });
      return posts;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to follow profile');
    }
  },

  createPost: async (postData) => {
    try {
      const { imageURL, publicId, caption, author } = postData;
      const post = await prisma.post.create({
        data: {
          mediaUrl: imageURL,
          mediaUploadId: publicId,
          body: caption,
          profileId: Number(author),
        },
      });
      return post;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to create post');
    }
  },

  getBookmarks: async (activeId) => {
    try {
      const bookmarks = await prisma.bookmark.findMany({
        where: {
          profileId: Number(activeId),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              profile: true,
              likes: true,
              comments: {
                include: {
                  profile: true,
                  likes: true,
                },
              },
            },
          },
        },
      });
      return bookmarks;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to find bookmarks');
    }
  },

  createBookmark: async (activeId, postId) => {
    try {
      const bookmark = await prisma.bookmark.create({
        data: {
          profileId: Number(activeId),
          postId: Number(postId),
        },
      });
      return bookmark;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to create bookmark');
    }
  },

  deleteBookmark: async (activeId, postId) => {
    try {
      await prisma.bookmark.delete({
        where: {
          profileId_postId: {
            profileId: Number(activeId),
            postId: Number(postId),
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to delete bookmark');
    }
  },

  deleteAllBookmarks: async (activeId) => {
    try {
      await prisma.bookmark.deleteMany({
        where: {
          profileId: Number(activeId),
        },
      });
    } catch (error) {
      console.error(error);
      throw new Error('Failed to delete all bookmarks');
    }
  },

  getNotifications: async (profileId) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { notifiedProfileId: Number(profileId) },
        include: {
          profile: {
            select: {
              id: true,
              username: true,
              profilePicUrl: true,
              petName: true,
            },
          },
          newFollow: true,
          newComment: {
            include: { post: { include: { likes: true, profile: true } } },
          },
          newPostLike: {
            include: { post: { include: { likes: true, profile: true } } },
          },
          newCommentLike: {
            include: {
              comment: {
                include: { post: { include: { likes: true, profile: true } } },
              },
            },
          },
          newPostShare: {
            include: { likes: true, profile: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return notifications;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to find notifications');
    }
  },
};

export default profileServices;
