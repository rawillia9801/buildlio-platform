export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
export const choiceToBuildType = (choice: any) => String(choice);
export const isDocSnapshot = (snap: any) => false;
