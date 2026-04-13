import { useEffect, useRef, useState } from "react";

import { nameToInitials, publicUploadUrl } from "../../lib/avatarUtils";
import { Button } from "../ui/button";

/**
 * @param {object} props
 * @param {string} props.name
 * @param {string} [props.profilePhoto] — path like /uploads/avatars/...
 * @param {boolean} [props.editable]
 * @param {boolean} [props.uploading]
 * @param {(file: File) => void} [props.onFileSelected]
 * @param {() => void} [props.onRemovePhoto]
 * @param {string} [props.frameClass] — size wrapper, e.g. h-28 w-28 (circular frame)
 * @param {number} [props.photoCacheBust] — bump after upload to avoid stale browser cache
 */
export function ProfileAvatarBlock({
  name,
  profilePhoto,
  editable = false,
  uploading = false,
  onFileSelected,
  onRemovePhoto,
  frameClass = "h-28 w-28 sm:h-32 sm:w-32",
  photoCacheBust = 0,
}) {
  const inputRef = useRef(null);
  const raw = profilePhoto && String(profilePhoto).trim() ? String(profilePhoto).trim() : "";
  const baseUrl = raw ? publicUploadUrl(raw) : "";
  const withBust =
    baseUrl && photoCacheBust
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${photoCacheBust}`
      : baseUrl;
  const src = withBust || null;
  const initials = nameToInitials(name);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [raw, photoCacheBust]);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-slate-800 shadow-lg ${frameClass}`}
      >
        {src && !imgBroken ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {initials}
          </div>
        )}
      </div>
      {editable ? (
        <div className="flex max-w-xs flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f && onFileSelected) onFileSelected(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </Button>
          {raw && onRemovePhoto ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              disabled={uploading}
              onClick={onRemovePhoto}
            >
              Remove photo
            </Button>
          ) : null}
                   <p className="text-xs text-slate-500">JPEG, PNG, WebP or GIF · max 25 MB</p>
        </div>
      ) : null}
    </div>
  );
}
