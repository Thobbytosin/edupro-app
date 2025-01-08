import { NextFunction, Request, Response } from "express";
import formidable from "formidable";

export const fileParser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const form = formidable();

  const [fields, files] = await form.parse(req as any);

  if (!req.files) req.files = {};

  for (let key in files) {
    const filesNeeded = files[key];

    if (!filesNeeded) break;

    if (filesNeeded.length > 1) {
      req.files[key] = filesNeeded;
    } else {
      req.files[key] = filesNeeded[0];
    }
  }

  next();
};
