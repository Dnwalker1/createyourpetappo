import { createHttpApi } from './http';
import { createMockApi } from './mock';
import type { DesignYourPetApi } from './types';

export * from './types';

// Set EXPO_PUBLIC_API_BASE_URL (https://www.goodwookie.com) to use the real
// website backend, and EXPO_PUBLIC_DESIGN_APP_KEY to the DESIGN_APP_KEY secret
// in Wix. Without a base URL the app runs on the built-in mock.
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const appKey = process.env.EXPO_PUBLIC_DESIGN_APP_KEY;

export const usingMockApi = !baseUrl;
export const api: DesignYourPetApi = baseUrl ? createHttpApi(baseUrl, appKey) : createMockApi();
export { MOCK_CHECKOUT_URL } from './mock';
