import mongoose, { Document, Model, Schema } from "mongoose";
import { idText } from "typescript";

interface IFaqItem extends Document {
  question: string;
  answer: string;
}

interface ICategory extends Document {
  title: string;
}

interface IFeature extends Document {
  title: string;
  subtitle: string;
  description: string;
}

interface IBannerImage extends Document {
  id: string;
  url: string;
}

interface ILayout extends Document {
  type: string;
  faq: IFaqItem[];
  categories: ICategory[];
  banner: {
    image: IBannerImage;
    title: string;
    subTitle: string;
  };
  features: IFeature[];
}

const faqSchema = new Schema<IFaqItem>({
  question: { type: String },
  answer: { type: String },
});

const categorySchema = new Schema<ICategory>({
  title: { type: String },
});

const featuresSchema = new Schema<IFeature>({
  title: { type: String },
  subtitle: { type: String },
  description: { type: String },
});

const bannerImageSchema = new Schema<IBannerImage>({
  id: { type: String },
  url: { type: String },
});

const layoutSchema = new Schema<ILayout>({
  type: { type: String },
  faq: [faqSchema],
  categories: [categorySchema],
  banner: {
    image: bannerImageSchema,
    title: { type: String },
    subTitle: { type: String },
  },
  features: [featuresSchema],
});

const Layout: Model<ILayout> = mongoose.model("Layout", layoutSchema);

export default Layout;
