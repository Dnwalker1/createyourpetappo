import { createHttpApi } from './http';
import { createMockApi } from './mock';
import type { DesignYourPetApi } from './types';

export * from './types';

// Set EXPO_PUBLIC_API_BASE_URL (for example https://www.goodwookie.com) to use
// the real website backend. Without it the app runs on the built-in mock.
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const usingMockApi = !baseUrl;
export const api: DesignYourPetApi = baseUrl ? createHttpApi(baseUrl) : createMockApi();
