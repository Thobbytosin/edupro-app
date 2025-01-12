import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/errorHandler";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getALLUsersService,
  getAllAdminsService,
  getUserId,
  updateUserRoleService,
} from "../services/user.services";
import cloudUploader, { cloudApi } from "../utils/cloudinary";
import Course from "../models/course.model";
import { isValidObjectId } from "mongoose";

dotenv.config();

////////////////////////////////////////////////////////////////////////
// Register user
interface IRegistration {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as IRegistration;

      if (!name || !email || !password)
        return next(new ErrorHandler("All fields are required", 422));

      const isEmailExists = await User.findOne({ email });

      // console.log(isEmailExists);

      if (isEmailExists)
        return next(new ErrorHandler("Email already exists", 500));

      // console.log("reach this?");

      const user: IRegistration = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        console.log(error);
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      console.log(error);
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

// function to create an activation token and activation code
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  // activation token to be used for email activation
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode };
};

////////////////////////////////////////////////////////////////////////

// activate user
interface IActivationRequest {
  activationCode: string;
  activationToken: string;
}

export const activateUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activationCode, activationToken } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activationCode)
        return next(new ErrorHandler("Invalid activation code", 422));

      const { name, email, password } = newUser.user;

      const userExists = await User.findOne({ email });

      if (userExists)
        return next(new ErrorHandler("Account already exists", 422));

      // const hashPassword = bcrypt.hashSync(password, 10);

      const user = await User.create({
        name,
        email,
        password,
        emailVerified: true,
      });
      res.status(201).json({ success: true, message: "Account created" });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// login user

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password)
        return next(
          new ErrorHandler("Please enter your email and password", 400)
        );

      const user = await User.findOne({ email }).select("+password");

      if (!user)
        return next(new ErrorHandler("Invalid username or password", 404));

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch)
        return next(new ErrorHandler("Invalid credentials", 404));

      // to avoid sending password
      const userr = await User.findOne({ email });

      if (!userr)
        return next(new ErrorHandler("Invalid username or password", 404));

      sendToken(userr, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// logout user

export const logoutUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_Token", "", { maxAge: 1 });

      res.cookie("refresh_Token", "", { maxAge: 1 });

      const userId = (req.user._id as string) || "";

      await redis.del(`user - ${userId}`);

      res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update access token : MIDDLEWARE ONLY

export const updateAccessToken = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.headers["refresh-token"] as string;
      // console.log("Here");

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN_SIGN_IN as string
      ) as JwtPayload;

      if (!decoded)
        return next(new ErrorHandler("could not refresh token", 400));

      const session = await redis.get(`user - ${decoded.id as string}`);

      if (!session)
        return next(new ErrorHandler("Session not found / has expired", 422));

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SIGN_IN as string,
        {
          expiresIn: "59m",
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SIGN_IN as string,
        {
          expiresIn: "4d",
        }
      );

      // Update the user also whenever the token is updated
      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      // this will help with cache maintenance to prevent redis from overload
      await redis.set(
        `user - ${user._id as string}`,
        JSON.stringify(user),
        "EX",
        604800
      ); // 7day expiry

      // res.status(200).json({ success: true, accessToken });
      next();
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update access token

export const updateAccessTokenEveryPage = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.headers["refresh-token"] as string;
      // console.log(refresh_token);

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN_SIGN_IN as string
      ) as JwtPayload;

      if (!decoded)
        return next(new ErrorHandler("could not refresh token", 400));

      const session = await redis.get(`user - ${decoded.id as string}`);

      if (!session)
        return next(new ErrorHandler("session not found / has expired", 404));

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SIGN_IN as string,
        {
          expiresIn: "59m",
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SIGN_IN as string,
        {
          expiresIn: "4d",
        }
      );

      // Update the user also whenever the token is updated
      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      // this will help with cache maintenance to prevent redis from overload
      await redis.set(
        `user - ${user._id as string}`,
        JSON.stringify(user),
        "EX",
        604800
      ); // 7day expiry

      res.status(200).json({ success: true, accessToken, refreshToken });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// get user information

export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id as any;
      getUserId(res, userId);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// social authentication

interface ISocialAuthBody {
  name: string;
  email: string;
  avatar?: string;
}

export const socialAuth = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body as ISocialAuthBody;

      if (!name || !email)
        return next(new ErrorHandler("Please provide name and email", 400));

      const user = await User.findOne({ email });

      if (!user) {
        // generate password (password is required for login)

        const generatePassword = Math.random().toString(36).slice(-10);

        const newUser = await User.create({
          name,
          email,
          password: generatePassword,
          avatar,
        });
        // to remove the password from being sent to the frontend
        const user = await User.findOne({ email: newUser.email }).select(
          "-password"
        );

        if (!user) return next(new ErrorHandler("No user found", 404));

        // login user
        sendToken(user, 200, res);
      } else {
        // means user has an account already

        // so just login
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update user info

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;

      const userId = req.user?._id as any;

      const user = await User.findById(userId);

      if (!user) return next(new ErrorHandler("User not found", 404));

      if (email) {
        const isEmailExists = await User.findOne({ email });

        if (isEmailExists)
          return next(new ErrorHandler("Email already exists", 406));

        user.email = email;
      }

      if (name) {
        user.name = name;
      }

      await user.save();

      await redis.set(`user - ${userId}`, JSON.stringify(user));

      res.status(201).json({ success: true, user });
    } catch (error: any) {
      console.log(error.message);
      console.log(error.name);
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update user password

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newPassword, oldPassword } = req.body as IUpdatePassword;

      if (!newPassword || !oldPassword)
        return next(new ErrorHandler("Please enter old and new password", 400));

      const userId = req.user?._id as any;

      const user = await User.findById(userId).select("+password");

      if (!user) return next(new ErrorHandler("Invalid user", 404));

      const isPasswordMatch = await user.comparePassword(oldPassword);

      if (!isPasswordMatch)
        return next(new ErrorHandler("Invalid old password", 400));

      if (newPassword === oldPassword)
        return next(
          new ErrorHandler(
            "New password must be different from old passwprd",
            422
          )
        );

      user.password = newPassword;

      await user.save();

      await redis.set(`user - ${userId}`, JSON.stringify(user));

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update profile picture

interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.files;

      // console.log(avatar);

      if (!avatar)
        return next(new ErrorHandler("Please provide an image", 422));

      const userId = req?.user._id as any;

      if (!userId)
        return next(new ErrorHandler("Please log in to upload picture.", 403));

      const user = await User.findById(userId);

      if (!user) return next(new ErrorHandler("User not found", 404));

      if (Array.isArray(avatar))
        return next(new ErrorHandler("Multiple images not allowed", 422));

      if (!avatar.mimetype?.startsWith("image"))
        return next(
          new ErrorHandler(
            "Invalid image format. File must be an image(.jpg, .png, .jpeg)",
            404
          )
        );

      // delete the old avatar from the cloudinary db
      if (user.avatar.id) {
        const folderPath = `byWay/users/${user.name + " - " + user._id}`;
        await cloudApi.delete_resources_by_prefix(folderPath);
      }

      // upload the new avatar to the cloudinary db

      // create a folder and subfolder for each user
      const folderPath = `byWay/users/${user.name + " - " + user._id}`;

      // upload the new avatar to the cloudinary db
      await cloudUploader.upload(
        avatar.filepath,
        {
          folder: folderPath,
          transformation: {
            width: 500,
            height: 500,
            crop: "thumb",
            gravity: "face",
          },
        },
        async (error: any, result) => {
          if (error) return next(new ErrorHandler(error.message, 400));

          const publicId = result?.public_id;

          const imageId = publicId?.split("/").pop();

          const imageUrl = result?.secure_url;

          user.avatar.url = imageUrl || "";
          user.avatar.id = imageId || "";

          await redis.set(`user - ${userId}`, JSON.stringify(user));

          await user.save();
        }
      );
      res.status(201).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// get all users - admin only

export const getAllUsers = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getALLUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// get all admin - admin only

export const getAllAdmins = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllAdminsService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// get all admin - without logged in

export const getAdmins = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await User.find({ role: "admin" })
        .select("-password")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, admins });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update user role - admin only

export const updateUserRole = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) return next(new ErrorHandler("Invalid entry", 422));

      // if (!isValidObjectId(userId))
      //   return next(new ErrorHandler("Invalid id", 422));

      updateUserRoleService(res, email, role, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// delete user - admin only

export const deleteUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      console.log(userId);

      const user = await User.findById(userId);

      if (!user) return next(new ErrorHandler("User not found", 404));

      await user.deleteOne();

      await redis.del(`user - ${userId}`);

      res
        .status(200)
        .json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// verify user latest role
export const getAllUsersLatestInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await User.find().select(
        "-courses -isVerified -createdAt -updatedAt -_v -email"
      );

      if (!users) return next(new ErrorHandler("User not found", 404));

      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// update mark video as viewed

export const markVideoAsViewed = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id as any;

      if (!isValidObjectId(userId))
        return next(new ErrorHandler("Invalid user id", 422));

      const { courseId, videoId } = req.body;

      const user = await User.updateOne(
        {
          _id: userId,
          "courses.courseId": courseId,
          "courses.progress.videoId": videoId,
        },
        { $set: { "courses.$.progress.$[video].viewed": true } },
        { arrayFilters: [{ "video.videoId": videoId }] }
      );

      if (!user) return next(new ErrorHandler("User not found", 404));

      const newUser = await User.findById(userId);

      //   update user to redis
      await redis.set(
        `user - ${newUser?._id as string}`,
        JSON.stringify(newUser) as any
      );

      res.status(200).json({ success: true, user });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);
