"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const emailRegexPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//   check password strenght
const isPasswordStrong = (password) => {
    // check password strength
    const hasAlphabet = () => !!password.match(/[a-zA-Z]/);
    const hasNumber = () => !!password.match(/[0-9]/);
    // Password Test
    const passwordIsArbitrarilyStrongEnough = hasNumber() && hasAlphabet();
    return passwordIsArbitrarilyStrongEnough;
};
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name"],
    },
    email: {
        type: String,
        required: [true, "Please enter your email"],
        validate: {
            validator: function (value) {
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
            validator: function (value) {
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
}, { timestamps: true });
// hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
// sign access token
userSchema.methods.SignAccessToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, process.env.ACCESS_TOKEN_SIGN_IN || "", {
        expiresIn: "59m",
    });
};
// sign Refresh token
userSchema.methods.SignRefreshToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, process.env.REFRESH_TOKEN_SIGN_IN || "", {
        expiresIn: "4d",
    });
};
// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
