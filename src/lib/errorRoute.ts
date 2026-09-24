import { ApiError } from '../api/types';

// Maps a backend error to the problem screen it triggers
// (docs/app-spec.md > Error states). Text rejections are shown inline on the
// style screen, so they have no route here.
export function problemRoute(error: unknown): string {
  if (!(error instanceof ApiError)) return '/problem/upload-failed';
  const at = error.unlocksAt ? `?unlocksAt=${error.unlocksAt}` : '';
  switch (error.code) {
    case 'UPLOAD_FAILED':
    case 'NETWORK':
      return '/problem/upload-failed';
    case 'CHECKER_UNAVAILABLE':
      return '/problem/checker-down';
    case 'NO_PET':
      return '/problem/no-pet';
    case 'PHOTO_REJECTED':
      return `/problem/photo-rejected?reason=${encodeURIComponent(error.message)}`;
    case 'DESIGN_FAILED':
      return '/problem/design-failed';
    case 'LIMIT_REACHED':
      return `/problem/limit${at}`;
    case 'TRIES_LIMIT':
      return `/problem/tries${at}`;
    case 'STUDIO_BUSY':
      return '/problem/busy';
    default:
      return '/problem/design-failed';
  }
}
