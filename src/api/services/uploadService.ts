import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { uploadToCloudinary } from '@/api/cloudinary';
import { FileResource } from '@/types';

type Context = FileResource['context'];

const mimeFromCloudinary = (resourceType: string, format?: string, fallback?: string | null) => {
  if (fallback) {
    return fallback;
  }
  if (resourceType === 'image' && format) {
    return `image/${format === 'jpg' ? 'jpeg' : format}`;
  }
  if (resourceType === 'video' && format) {
    return `video/${format}`;
  }
  return 'application/octet-stream';
};

const makeFileName = (name: string | null | undefined, resultName: string | undefined) =>
  name ?? (resultName ? `${resultName}` : 'Upload');

const uploadAsset = async (
  uploadedBy: string,
  asset: {
    uri: string;
    mimeType?: string | null;
    name?: string | null;
    size?: number | null;
  },
  context: Context
): Promise<FileResource> => {
  const result = await uploadToCloudinary(asset, context, uploadedBy);

  return {
    id: result.public_id,
    name: makeFileName(asset.name, result.original_filename),
    url: result.secure_url,
    type: mimeFromCloudinary(result.resource_type, result.format, asset.mimeType),
    sizeKb: Math.max(1, Math.ceil((asset.size ?? result.bytes ?? 0) / 1024)),
    uploadedAt: result.created_at,
    uploadedBy,
    context,
  };
};

export const uploadService = {
  async pickDocument(uploadedBy: string, context: Context) {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return uploadAsset(
      uploadedBy,
      {
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.name,
        size: asset.size,
      },
      context
    );
  },
  async pickImage(uploadedBy: string, context: Context) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return uploadAsset(
      uploadedBy,
      {
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.fileName ?? 'image.jpg',
        size: asset.fileSize,
      },
      context
    );
  },
  async uploadMock(uploadedBy: string, context: Context) {
    return this.pickDocument(uploadedBy, context);
  },
};
