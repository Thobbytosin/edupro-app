"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLast12MonthsData = void 0;
const generateLast12MonthsData = async (model) => {
    const last12Months = [];
    const currentDate = new Date(); // 22 august 2024
    currentDate.setDate(currentDate.getDate() + 1); // 23 august 2024
    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(currentDate.getFullYear(), // 2024
        currentDate.getMonth(), // August
        currentDate.getDate() - i * 28 // 23 - 11 * 28  = 308 days (this will give around November 18, 2023) (first iteration), 23 - 10 * 28 = 280 days (December 16, 2023)  (second iteration), 23 - 9 * 28  (third iteration),....,.....
        );
        const startDate = new Date(endDate.getFullYear(), // first iteration = November 18,2023 - year will be 2023, second iteration = December 16, 2023 - year will be 2023
        endDate.getMonth(), // November first iteration, December second iteration
        endDate.getDate() - 28 // November 18, 2023 - 28 days = october 21 2023, // December, 16 2023 - 28 days = November 18, 2023 // .....
        );
        const monthYear = endDate.toLocaleString("default", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate, // October 21, 2023 (first iteration)
                $lt: endDate, // November 18, 2023 (first iteration)
            },
        });
        last12Months.push({ month: monthYear, count });
    }
    return { last12Months };
};
exports.generateLast12MonthsData = generateLast12MonthsData;
