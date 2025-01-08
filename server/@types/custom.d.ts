import { Request } from "express";
import { IUser } from "../models/user.model";
import { File } from "formidable";

declare global {
  namespace Express {
    interface Request {
      user: IUser;
      files: { [key: string]: File | File[] };
    }
  }
}
