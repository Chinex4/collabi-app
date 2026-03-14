import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { FileResource } from '@/types';
import { generateId } from '@/utils/helpers';

import { simulate } from './base';

const createFile = (
  name: string,
  type: string,
  context: FileResource['context'],
  uploadedBy: string
): FileResource => ({
  id: generateId('file'),
  name,
  type,
  context,
  url: `https://files.collabi.mock/${encodeURIComponent(name)}`,
  sizeKb: Math.floor(Math.random() * 900) + 80,
  uploadedAt: new Date().toISOString(),
  uploadedBy,
});

export const uploadService = {
  async pickDocument(uploadedBy: string, context: FileResource['context']) {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: false,
    });
    if (result.canceled) {
      return null;
    }
    const asset = result.assets[0];
    return simulate(
      () =>
        createFile(asset.name, asset.mimeType ?? 'application/octet-stream', context, uploadedBy),
      900
    );
  },
  async pickImage(uploadedBy: string, context: FileResource['context']) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) {
      return null;
    }
    const asset = result.assets[0];
    return simulate(
      () =>
        createFile(
          asset.fileName ?? 'image.jpg',
          asset.mimeType ?? 'image/jpeg',
          context,
          uploadedBy
        ),
      900
    );
  },
  async uploadMock(
    uploadedBy: string,
    context: FileResource['context'],
    fileName = 'mock-upload.txt'
  ) {
    return simulate(() => createFile(fileName, 'text/plain', context, uploadedBy), 900);
  },
};
