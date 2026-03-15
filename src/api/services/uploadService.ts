import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { FileResource } from '@/types';

import { apiRequest } from '../http';
import { mapFileResource } from '../mappers';

type Context = FileResource['context'];

const uploadAsset = async (
  asset: {
    uri: string;
    mimeType?: string | null;
    name?: string | null;
  },
  context: Context
) => {
  const formData = new FormData();
  formData.append('contextType', context);
  formData.append('file', {
    uri: asset.uri,
    name: asset.name ?? 'upload',
    type: asset.mimeType ?? 'application/octet-stream',
  } as any);

  const response = await apiRequest<any>('/files/upload', {
    method: 'POST',
    auth: true,
    body: formData,
  });

  return mapFileResource(response.data);
};

export const uploadService = {
  async pickDocument(_uploadedBy: string, context: Context) {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return uploadAsset(
      {
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.name,
      },
      context
    );
  },
  async pickImage(_uploadedBy: string, context: Context) {
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
      {
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.fileName ?? 'image.jpg',
      },
      context
    );
  },
  async uploadMock(uploadedBy: string, context: Context) {
    return this.pickDocument(uploadedBy, context);
  },
};
