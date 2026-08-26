const appUrl = () => new URL(process.env.APP_URL ?? "http://localhost:3000");

export const rpName = "White Production";
export const rpID = () => appUrl().hostname;
export const rpOrigin = () => appUrl().origin;
export const adminUserName = "admin";
