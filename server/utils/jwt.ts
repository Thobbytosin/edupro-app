import dotenv from "dotenv";
import { redis } from "./redis";
import { IUser } from "../models/user.model";
import { Response } from "express";

dotenv.config();

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "none" | "lax" | "strict" | undefined;
  secure?: boolean;
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "60", 10);

const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

const isProduction = process.env.NODE_ENV === "production";
// console.log(isProduction);
//   options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 1000, // expires in minutes
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000, // expires in days
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction, // for production
};

export const sendToken = async (
  user: IUser,
  statusCode: number,
  res: Response
) => {
  // login with access and refresh token
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  //   upload session to redis
  await redis.set(`user - ${user?._id as string}`, JSON.stringify(user) as any);

  // parse environment variables to integrate fallback values

  //   only set secure to true in production
  // if (process.env.NODE_ENV === "production") {
  //   accessTokenOptions.secure = true;
  // }

  // save the tokens in the cookie
  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res
    .status(statusCode)
    .json({ success: true, user, accessToken, refreshToken });
};
