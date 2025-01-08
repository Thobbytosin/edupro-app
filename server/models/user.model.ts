import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const emailRegexPattern: RegExp =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

//   check password strenght
const isPasswordStrong = (password: any) => {
  // check password strength
  const hasAlphabet = () => !!password.match(/[a-zA-Z]/);
  const hasNumber = () => !!password.match(/[0-9]/);

  // Password Test
  const passwordIsArbitrarilyStrongEnough = hasNumber() && hasAlphabet();

  return passwordIsArbitrarilyStrongEnough;
};

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: {
    id: string;
    url: string;
  };
  role: string;
  emailVerified: boolean;
  isVerified: boolean;
  courses: Array<{ courseId: string }>;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      validate: {
        validator: function (value: string) {
          return emailRegexPattern.test(value);
        },
        message: "Please enter a valid email address",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minlength: [6, "Password must be at least 6 characters"],
      validate: {
        validator: function (value: any) {
          return isPasswordStrong(value);
        },
        message: "Password must be alphanumeric(contain letters & numbers)",
      },
      select: false,
    },
    avatar: {
      id: String,
      url: String,
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseId: String,
        progress: [{ videoId: String, viewed: Boolean }],
        reviewed: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

// hash password before saving
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// sign access token
userSchema.methods.SignAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SIGN_IN || "", {
    expiresIn: "59m",
  });
};
// sign Refresh token
userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SIGN_IN || "", {
    expiresIn: "4d",
  });
};

// compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User: Model<IUser> = mongoose.model("User", userSchema);

export default User;
