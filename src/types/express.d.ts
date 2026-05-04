import "express";
import { Express } from "express";

declare global {
  namespace Express {
    interface User {
      _id: string;
      email: string;
    }

    interface Request {
      user?: User;
      file?: Express.Multer.File;
    }
  }
}
