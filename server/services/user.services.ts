import { NextFunction, Response } from "express";
import User from "../models/user.model";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/errorHandler";

// get user by id
export const getUserId = async (res: Response, id: string) => {
  const userJson = await redis.get(`user - ${id}`);

  if (userJson) {
    const user = JSON.parse(userJson);

    res.status(200).json({ success: true, user });
  }
};

// get all users
export const getALLUsersService = async (res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({ success: true, users });
};

// get all admins
export const getAllAdminsService = async (res: Response) => {
  const admins = await User.find({ role: "admin" })
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, admins });
};

// update user role - admin only
export const updateUserRoleService = async (
  res: Response,
  email: string,
  role: string,
  next: NextFunction
) => {
  const user = await User.findOneAndUpdate(
    { email },
    {
      role,
    },
    { new: true }
  );

  if (!user) return next(new ErrorHandler("User not found", 404));

  await redis.set(`user - ${user.id}`, JSON.stringify(user));

  res.status(200).json({ success: true, user });
};
