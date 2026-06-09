"use client";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export interface UploadResult {
  url: string;
  publicId: string;
}

// Cloudinary unsigned 업로드.
// 압축/최적화는 업로드 프리셋(Incoming Transformation: q_auto, f_auto, c_limit, w_1200)에서 처리.
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary 환경변수가 설정되지 않았습니다.");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`이미지 업로드 실패: ${text}`);
  }
  const data = await res.json();
  return { url: data.secure_url as string, publicId: data.public_id as string };
}

// 표시용 변환 URL (썸네일/카드용으로 추가 압축)
export function thumbUrl(url: string | null, width = 400): string | null {
  if (!url) return null;
  // .../upload/ 뒤에 변환 파라미터 삽입
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
