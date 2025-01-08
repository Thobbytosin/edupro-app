import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middlewares/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import cloudUploader, { cloudApi } from "../utils/cloudinary";
import Layout from "../models/layout.model";

////////////////////////////////////////////////////////////////////////////////////////////////
// create layout

export const createLayout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (!type) return next(new ErrorHandler("Invalid type", 422));

      const isTypeExist = await Layout.findOne({ type });

      if (isTypeExist)
        return next(new ErrorHandler(`${type} already exist`, 403));

      // if data is banner
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;

        // upload to cloudinary
        const folderPath = `byWay/banner`;
        //
        const cloud = await cloudUploader.upload(
          image,
          {
            folder: folderPath,
          },
          async (error: any, result) => {
            if (error) return next(new ErrorHandler(error.message, 400));
          }
        );

        const imageId = cloud?.public_id?.split("/").pop() as string;

        const imageUrl = cloud?.secure_url as string;

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
        await Layout.create(banner);
      }

      // if data is for faqs
      if (type === "FAQ") {
        const { faq } = req.body; // this is an array\

        const faqItems = await Promise.all(
          faq.map(async (item: any) => {
            // this returns an array of Promise, await Promise.all resovele each pomise
            return {
              question: item.question,
              answer: item.answer,
            };
          })
        );

        await Layout.create({ type: "FAQ", faq: faqItems });
      }

      // if data is for categories
      if (type === "Categories") {
        const { categories } = req.body;

        const categoryiesItems = await Promise.all(
          categories.map(async (item: any) => {
            // this returns an array of Promise, await Promise.all resovele each pomise
            return {
              title: item.title,
            };
          })
        );

        await Layout.create({
          type: "Categories",
          categories: categoryiesItems,
        });
      }

      res
        .status(200)
        .json({ success: true, message: "Layout created successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// edit layout

export const editLayout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (!type) return next(new ErrorHandler("Invalid type", 422));

      // type banner
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;

        const bannerData = await Layout.findOne({ type: "Banner" });

        if (!bannerData)
          return next(new ErrorHandler("Banner not yet available", 422));

        // delete the old avatar from the cloudinary db
        if (bannerData) {
          const folderPath = `byWay/banner`;
          await cloudApi.delete_resources_by_prefix(folderPath);
          // await cloudApi.delete_folder(folderPath);
        }

        // upload to cloudinary
        const folderPath = `byWay/banner`;
        //
        const cloud = await cloudUploader.upload(
          image,
          {
            folder: folderPath,
          },
          async (error: any, result) => {
            console.log(error);
            if (error) return next(new ErrorHandler(error.message, 400));
          }
        );

        const imageId = cloud.public_id?.split("/").pop() as string;

        const imageUrl = cloud.secure_url as string;

        const banner = {
          image: {
            id: imageId,
            url: imageUrl,
          },
          title,
          subTitle,
        };

        await Layout.findByIdAndUpdate(bannerData.id, { banner });
      }

      // type faq
      if (type === "FAQ") {
        const { faq } = req.body; // this is an array

        const faqItemData = await Layout.findOne({ type: "FAQ" });

        if (!faqItemData)
          return next(new ErrorHandler("FAQs not yet available", 422));

        const faqItems = await Promise.all(
          faq.map(async (item: any) => {
            // this returns an array of Promise, await Promise.all resovele each pomise
            return {
              question: item.question,
              answer: item.answer,
            };
          })
        );

        await Layout.findByIdAndUpdate(faqItemData._id, {
          type: "FAQ",
          faq: faqItems,
        });
      }

      // type categories
      if (type === "Categories") {
        const { categories } = req.body;

        const categoriesData = await Layout.findOne({ type: "Categories" });

        if (!categoriesData)
          return next(new ErrorHandler("Categories not yet available", 422));

        const categoryiesItems = await Promise.all(
          categories.map(async (item: any) => {
            // this returns an array of Promise, await Promise.all resovele each pomise
            return {
              title: item.title,
            };
          })
        );

        await Layout.findByIdAndUpdate(categoriesData._id, {
          type: "Categories",
          categories: categoryiesItems,
        });
      }

      res
        .status(200)
        .json({ success: true, message: "Layout created successfully" });
    } catch (error: any) {
      console.log("ERRO!!!:", error);
      return next(new ErrorHandler(error.name, 400));
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////////////////
// get layout by type

export const getLayoutByType = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;

      const layout = await Layout.findOne({ type });

      // console.log(layout);

      res.status(200).json({ success: true, layout });
      //
    } catch (error: any) {
      return next(new ErrorHandler(error.name, 400));
    }
  }
);
