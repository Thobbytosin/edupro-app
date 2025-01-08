import { NextFunction, Request, Response } from "express";
import catchAsyncError from "./catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { redis } from "../utils/redis";
import { console } from "inspector";

dotenv.config();

export const isAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access_token = req.headers["access-token"] as string;
      // console.log("also reached here");
      // console.log("TOKEN", access_token);

      if (!access_token)
        return next(new ErrorHandler("Please login to proceed", 401));

      const decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN_SIGN_IN || ""
      ) as any;

      if (!decoded) return next(new ErrorHandler("Invalid access token", 400));

      const user = await redis.get(`user - ${decoded.id}`);

      if (!user)
        return next(new ErrorHandler("Please login to access this", 404));

      req.user = JSON.parse(user);

      return next();
    } catch (error: any) {
      return next(
        new ErrorHandler("Session has expired. Kindly refresh your page.", 404)
      );
      // console.log("LOGIN ERROR", error);
      // console.log("LOGIN ERROR", error.name);
      // console.log("LOGIN ERROR", error.message);
    }
  }
);

// authorize user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is restricted to access this`,
          403
        )
      );
    }
    next();
  };
};
