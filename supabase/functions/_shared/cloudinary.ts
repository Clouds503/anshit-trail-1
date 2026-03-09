export async function uploadImageToCloudinary(imageUrl: string, cloudName: string, uploadPreset: string): Promise<string> {
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // Attempt 1: URL-based upload (fast path).
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: imageUrl, upload_preset: uploadPreset }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.secure_url) return data.secure_url as string;
    }
  } catch {
    // Fall through to binary upload.
  }

  // Attempt 2: Download and multipart upload (works when remote fetch is blocked by preset settings).
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to download generated image: ${imageRes.status}`);
  const imageBlob = await imageRes.blob();

  const form = new FormData();
  form.append("upload_preset", uploadPreset);
  form.append("file", imageBlob, "generated-image.png");

  const uploadRes = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text().catch(() => "");
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${errorBody}`);
  }

  const uploadData = await uploadRes.json().catch(() => null);
  return uploadData?.secure_url || imageUrl;
}

function extensionFromMimeType(mimeType: string): string {
  const normalized = `${mimeType || ""}`.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  return "png";
}

export async function uploadImageBytesToCloudinary(
  imageBytes: Uint8Array,
  mimeType: string,
  cloudName: string,
  uploadPreset: string,
): Promise<string> {
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const extension = extensionFromMimeType(mimeType);
  const blob = new Blob([imageBytes], { type: mimeType || "image/png" });
  const form = new FormData();
  form.append("upload_preset", uploadPreset);
  form.append("file", blob, `generated-image.${extension}`);

  const uploadRes = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text().catch(() => "");
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${errorBody}`);
  }

  const uploadData = await uploadRes.json().catch(() => null);
  const secureUrl = uploadData?.secure_url?.toString?.() || "";
  if (!secureUrl) throw new Error("Cloudinary upload succeeded but secure_url was missing.");
  return secureUrl;
}
