"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catchAsyncError = (theFunc) => (req, res, next) => {
    Promise.resolve(theFunc(req, res, next)).catch(next);
};
exports.default = catchAsyncError;
