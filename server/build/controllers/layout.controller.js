"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayoutByType = exports.editLayout = exports.createLayout = void 0;
const catchAsyncErrors_1 = __importDefault(require("../middlewares/catchAsyncErrors"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const cloudinary_1 = __importStar(require("../utils/cloudinary"));
const layout_model_1 = __importDefault(require("../models/layout.model"));
////////////////////////////////////////////////////////////////////////////////////////////////
// create layout
exports.createLayout = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (!type)
            return next(new errorHandler_1.default("Invalid type", 422));
        const isTypeExist = await layout_model_1.default.findOne({ type });
        if (isTypeExist)
            return next(new errorHandler_1.default(`${type} already exist`, 403));
        // if data is banner
        if (type === "Banner") {
            const { image, title, subTitle } = req.body;
            // upload to cloudinary
            const folderPath = `byWay/banner`;
            //
            const cloud = await cloudinary_1.default.upload(image, {
                folder: folderPath,
            }, async (error, result) => {
                if (error)
                    return next(new errorHandler_1.default(error.message, 400));
            });
            const imageId = cloud?.public_id?.split("/").pop();
            const imageUrl = cloud?.secure_url;
            const banner = {
                type: "Banner",
                banner: {
                    image: {
                        id: imageId,
                        url: imageUrl,
                    },
                    title,
                    subTitle,
                },
            };
            // create banner after uploading
            await layout_model_1.default.create(banner);
        }
        // if data is for faqs
        if (type === "FAQ") {
            const { faq } = req.body; // this is an array\
            const faqItems = await Promise.all(faq.map(async (item) => {
                // this returns an array of Promise, await Promise.all resovele each pomise
                return {
                    question: item.question,
                    answer: item.answer,
                };
            }));
            await layout_model_1.default.create({ type: "FAQ", faq: faqItems });
        }
        // if data is for categories
        if (type === "Categories") {
            const { categories } = req.body;
            const categoryiesItems = await Promise.all(categories.map(async (item) => {
                // this returns an array of Promise, await Promise.all resovele each pomise
                return {
                    title: item.title,
                };
            }));
            await layout_model_1.default.create({
                type: "Categories",
                categories: categoryiesItems,
            });
        }
        res
            .status(200)
            .json({ success: true, message: "Layout created successfully" });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// edit layout
exports.editLayout = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (!type)
            return next(new errorHandler_1.default("Invalid type", 422));
        // type banner
        if (type === "Banner") {
            const { image, title, subTitle } = req.body;
            const bannerData = await layout_model_1.default.findOne({ type: "Banner" });
            if (!bannerData)
                return next(new errorHandler_1.default("Banner not yet available", 422));
            // delete the old avatar from the cloudinary db
            if (bannerData) {
                const folderPath = `byWay/banner`;
                await cloudinary_1.cloudApi.delete_resources_by_prefix(folderPath);
                // await cloudApi.delete_folder(folderPath);
            }
            // upload to cloudinary
            const folderPath = `byWay/banner`;
            //
            const cloud = await cloudinary_1.default.upload(image, {
                folder: folderPath,
            }, async (error, result) => {
                console.log(error);
                if (error)
                    return next(new errorHandler_1.default(error.message, 400));
            });
            const imageId = cloud.public_id?.split("/").pop();
            const imageUrl = cloud.secure_url;
            const banner = {
                image: {
                    id: imageId,
                    url: imageUrl,
                },
                title,
                subTitle,
            };
            await layout_model_1.default.findByIdAndUpdate(bannerData.id, { banner });
        }
        // type faq
        if (type === "FAQ") {
            const { faq } = req.body; // this is an array
            const faqItemData = await layout_model_1.default.findOne({ type: "FAQ" });
            if (!faqItemData)
                return next(new errorHandler_1.default("FAQs not yet available", 422));
            const faqItems = await Promise.all(faq.map(async (item) => {
                // this returns an array of Promise, await Promise.all resovele each pomise
                return {
                    question: item.question,
                    answer: item.answer,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(faqItemData._id, {
                type: "FAQ",
                faq: faqItems,
            });
        }
        // type categories
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await layout_model_1.default.findOne({ type: "Categories" });
            if (!categoriesData)
                return next(new errorHandler_1.default("Categories not yet available", 422));
            const categoryiesItems = await Promise.all(categories.map(async (item) => {
                // this returns an array of Promise, await Promise.all resovele each pomise
                return {
                    title: item.title,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(categoriesData._id, {
                type: "Categories",
                categories: categoryiesItems,
            });
        }
        res
            .status(200)
            .json({ success: true, message: "Layout created successfully" });
    }
    catch (error) {
        console.log("ERRO!!!:", error);
        return next(new errorHandler_1.default(error.name, 400));
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////
// get layout by type
exports.getLayoutByType = (0, catchAsyncErrors_1.default)(async (req, res, next) => {
    try {
        const { type } = req.params;
        const layout = await layout_model_1.default.findOne({ type });
        res.status(200).json({ success: true, layout });
        //
    }
    catch (error) {
        return next(new errorHandler_1.default(error.name, 400));
    }
});
