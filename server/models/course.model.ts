import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./user.model";

interface IAnswer extends Document {
  user: IUser;
  answer: string;
}

interface IComment extends Document {
  user: IUser;
  question: string;
  questionReplies: IAnswer[];
}

interface IReplyReview extends Document {
  user: IUser;
  reply: string;
}

interface IReview extends Document {
  user: IUser;
  rating: number;
  comment: string;
  commentReplies?: IReplyReview[];
}

interface ILink extends Document {
  title: string;
  url: string;
}

interface IObjective extends Document {
  title: string;
}

interface ICourseData extends Document {
  title: string;
  description: string;
  videoUrl: string;
  videoThumbnail: object;
  videoSection: string;
  videoDescription: string;
  videoDuration: number;
  videoPlayer: string;
  links: ILink[];
  objectives: IObjective[];
  suggestion: string;
  questions: IComment[];
}

interface ICourse extends Document {
  name: string;
  description: string;
  price: number;
  estimatedPrice: number;
  thumbnail: object;
  tags: string;
  level: string;
  demoUrl: string;
  category: string;
  benefits: { title: string[] };
  prerequisites: { title: string[] };
  reviews: IReview[];
  courseData: ICourseData[];
  ratings: number;
  purchase: number;
}

const answerSchema = new Schema<IAnswer>(
  {
    user: Object,
    answer: String,
  },
  { timestamps: true }
);

const replyReviewSchema = new Schema<IReplyReview>(
  {
    user: Object,
    reply: String,
  },
  { timestamps: true }
);

const reviewSChema = new Schema<IReview>(
  {
    user: Object,
    rating: {
      type: Number,
      default: 0,
    },
    comment: String,
    commentReplies: [replyReviewSchema],
  },
  { timestamps: true }
);

const linkSchema = new Schema<ILink>({
  title: String,
  url: String,
});

const objectiveSchema = new Schema<IObjective>({
  title: String,
});

const commentSchema = new Schema<IComment>(
  {
    user: Object,
    question: String,
    questionReplies: [answerSchema],
  },
  { timestamps: true }
);

const courseDataSchema = new Schema<ICourseData>({
  videoUrl: String,
  title: String,
  videoDuration: Number,
  videoDescription: String,
  videoSection: String,
  videoPlayer: String,
  links: [linkSchema],
  objectives: [objectiveSchema],
  suggestion: String,
  questions: [commentSchema],
});

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    estimatedPrice: {
      type: Number,
    },
    thumbnail: {
      id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    tags: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    demoUrl: {
      type: String,
    },
    category: { type: String, required: true },
    benefits: [{ title: String }],
    prerequisites: [{ title: String }],
    reviews: [reviewSChema],
    courseData: [courseDataSchema],
    ratings: {
      type: Number,
      default: 0,
    },
    purchase: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Course: Model<ICourse> = mongoose.model("Course", courseSchema);

export default Course;
