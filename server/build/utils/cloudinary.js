"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudApi = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CLOUD_NAME = process.env.CLOUDINARY_NAME;
const CLOUD_SECRET = process.env.CLOUDINARY_SECRET;
const CLOUD_KEY = process.env.CLOUDINARY_KEY;
cloudinary_1.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
});
const cloudUploader = cloudinary_1.v2.uploader;
exports.cloudApi = cloudinary_1.v2.api;
exports.default = cloudUploader;
