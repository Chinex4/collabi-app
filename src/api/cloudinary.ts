import { ApiError } from './errors';
import { supabase } from './supabase';

type CloudinaryAsset = {
  uri: string;
  mimeType?: string | null;
  name?: string | null;
};

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  context: string;
};

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  resource_type: string;
  bytes: number;
  format?: string;
  original_filename?: string;
  created_at: string;
};

const getSignedUpload = async (context: string) => {
  const { data, error } = await supabase.functions.invoke<SignedUpload>('cloudinary-signature', {
    body: { context },
  });

  if (error || !data) {
    throw new ApiError(error?.message ?? 'Unable to authorize upload', 502);
  }

  return data;
};

export const uploadToCloudinary = async (
  asset: CloudinaryAsset,
  context: string,
  _uploadedBy: string
) => {
  const signed = await getSignedUpload(context);
  const formData = new FormData();

  formData.append('api_key', signed.apiKey);
  formData.append('timestamp', String(signed.timestamp));
  formData.append('signature', signed.signature);
  formData.append('folder', signed.folder);
  formData.append('context', signed.context);
  formData.append('file', {
    uri: asset.uri,
    name: asset.name ?? 'upload',
    type: asset.mimeType ?? 'application/octet-stream',
  } as any);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<CloudinaryUploadResult> & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    throw new ApiError(
      payload?.error?.message ?? `Cloudinary upload failed with status ${response.status}`,
      response.status
    );
  }

  return payload as CloudinaryUploadResult;
};
