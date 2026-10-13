// The selected upload exists only in memory. Registration drafts store a local
// URI, never image contents. A restart can require reselecting this optional photo.
let pendingPhoto: string | null = null;
export function setPendingProfilePhoto(dataUrl: string | null) { pendingPhoto = dataUrl; }
export function takePendingProfilePhoto() {
  const photo = pendingPhoto;
  pendingPhoto = null;
  return photo;
}
