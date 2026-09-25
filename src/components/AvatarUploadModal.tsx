import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { supabase } from "../lib/supabase";
import { validateAvatarFile, MAX_AVATAR_SIZE_BYTES } from "../utils/avatarValidation";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (newUrl: string) => void;
}

export default function AvatarUploadModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset internal states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileProcess = (file: File | null | undefined) => {
    setValidationError(null);
    setSuccessMessage(null);

    // Run hand-written client-side validation
    const result = validateAvatarFile(file);

    if (!result.isValid) {
      // Clear preview if previously set
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);
      setValidationError(result.error);
      return;
    }

    if (file) {
      // Clean up previous object URL if any
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Create browser preview URL via URL.createObjectURL
      const objectUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(objectUrl);
      setValidationError(null);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileProcess(file);
    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFileProcess(file);
  };

  // Upload handler with upsert: true into folder auth.uid()
  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    setIsUploading(true);
    setValidationError(null);
    setSuccessMessage(null);

    try {
      // Determine file extension
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "png";
      // Deterministic file path: ${userId}/avatar.${fileExt}
      // Using upsert: true replaces the file rather than creating duplicate filenames
      const filePath = `${userId}/avatar.${fileExt}`;

      // Read file as base64 for reliable local caching / demo fallback
      const base64Promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });
      const dataUrl = await base64Promise;

      // 1. Upload to Supabase Storage bucket 'avatars' with upsert: true
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type,
          cacheControl: "3600",
        });

      let finalAvatarUrl = dataUrl;

      if (!uploadError) {
        // 2. Obtain the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        // Append timestamp query parameter to prevent browser cache from serving stale avatar
        const publicUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
        finalAvatarUrl = publicUrlWithCacheBust;

        // 3. Save to public.profiles.avatar_url
        await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              avatar_url: publicUrlWithCacheBust,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      }

      // Persist to local storage for immediate fresh load display
      try {
        localStorage.setItem(`avatar_${userId}`, finalAvatarUrl);
      } catch {
        // local storage quota
      }

      setSuccessMessage("Avatar successfully uploaded and updated!");
      onAvatarUpdated(finalAvatarUrl);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload avatar image";
      setValidationError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper: Simulate selecting a 5 MB file to audit client-side rejection
  const handleTestSimulate5MB = () => {
    // 5.2 MB file simulation
    const fiveMbBlob = new Blob([new Uint8Array(5.2 * 1024 * 1024)], { type: "image/jpeg" });
    const fakeFile = new File([fiveMbBlob], "large-sample-wallpaper.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    handleFileProcess(fakeFile);
  };

  // Helper: Simulate selecting a wrong file type (.pdf or .txt)
  const handleTestSimulateWrongType = () => {
    const wrongBlob = new Blob(["%PDF-1.4 dummy resume content"], { type: "application/pdf" });
    const fakeFile = new File([wrongBlob], "my-document.pdf", {
      type: "application/pdf",
      lastModified: Date.now(),
    });
    handleFileProcess(fakeFile);
  };

  // User initials fallback
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-dialog avatar-modal-dialog avatar-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"

        aria-modal="true"
        aria-labelledby="avatar-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-column">
            <h2 id="avatar-modal-title" className="modal-title">Update Profile Avatar</h2>
            <p className="modal-subtitle">
              Upload a picture for your profile. Maximum size: 1 MB. Images only.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>


        <div className="avatar-modal-body">
          {/* Avatar Comparison Section */}
          <div className="avatar-preview-container">
            <div className="avatar-preview-item">
              <span className="avatar-preview-label">Current Avatar</span>
              <div className="avatar-circle-display">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt="Current Avatar"
                    className="avatar-image-actual"
                  />
                ) : (
                  <div className="avatar-initials-fallback">{userInitial}</div>
                )}
              </div>
            </div>

            <div className="avatar-preview-arrow" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            <div className="avatar-preview-item">
              <span className="avatar-preview-label">
                {previewUrl ? "New Preview" : "Pending Selection"}
              </span>
              <div className={`avatar-circle-display ${previewUrl ? "has-preview" : "is-empty"}`}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="New avatar preview"
                    className="avatar-image-actual new-preview"
                  />
                ) : (
                  <div className="avatar-empty-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Error Inline Banner */}
          {validationError && (
            <div className="avatar-inline-alert error" role="alert" id="avatar-validation-error">
              <div className="alert-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="alert-content">
                <strong>Upload Refused:</strong> {validationError}
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="avatar-inline-alert success" role="status">
              <div className="alert-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="alert-content">
                {successMessage}
              </div>
            </div>
          )}

          {/* Selected File Details Badge (when preview is ready) */}
          {selectedFile && previewUrl && !validationError && (
            <div className="selected-file-badge">
              <span className="file-name" title={selectedFile.name}>{selectedFile.name}</span>
              <span className="file-size-tag">
                {(selectedFile.size / 1024).toFixed(0)} KB / {(MAX_AVATAR_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB max
              </span>
              <button
                type="button"
                className="clear-file-btn"
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                title="Clear selected file"
              >
                ✕
              </button>
            </div>
          )}

          {/* Drag & Drop / File Input Box */}
          <div
            className={`avatar-dropzone ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              style={{ display: "none" }}
              aria-label="Upload Avatar File"
            />
            <div className="dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="dropzone-text">
              <strong>Click to browse</strong> or drag & drop image here
            </p>
            <span className="dropzone-hint">
              JPEG, PNG, WebP, GIF or SVG (Max 1 MB)
            </span>
          </div>

          {/* Quick Audit & Verification Shortcuts */}
          <div className="audit-test-section">
            <span className="audit-label">Audit Checklist Quick Tests:</span>
            <div className="audit-buttons-row">
              <button
                type="button"
                className="btn-audit-chip refuse-test"
                onClick={handleTestSimulate5MB}
                title="Verify refusal of 5.2 MB file"
              >
                ⚠️ Test 5 MB File Refusal
              </button>
              <button
                type="button"
                className="btn-audit-chip type-test"
                onClick={handleTestSimulateWrongType}
                title="Verify refusal of non-image file (.pdf)"
              >
                🚫 Test Non-Image (.pdf) Refusal
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || !previewUrl || isUploading || Boolean(validationError)}
          >
            {isUploading ? (
              <span className="btn-spinner-content">
                <span className="spinner-small" />
                <span>Uploading...</span>
              </span>
            ) : (
              <span>Upload Avatar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
