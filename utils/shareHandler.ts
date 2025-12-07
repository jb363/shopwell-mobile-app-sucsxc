
import * as Linking from 'expo-linking';

export interface SharedContent {
  type: 'url' | 'text' | 'image';
  data: string;
}

export async function handleSharedContent(content: SharedContent) {
  console.log('Handling shared content:', content);
  
  const params: Record<string, string> = {};
  
  switch (content.type) {
    case 'url':
      params.url = content.data;
      break;
    case 'text':
      params.text = content.data;
      break;
    case 'image':
      params.image = content.data;
      break;
  }
  
  // Navigate to the share-target route with the shared data
  const url = Linking.createURL('/share-target', { queryParams: params });
  await Linking.openURL(url);
}

export function parseSharedUrl(url: string): SharedContent | null {
  try {
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'share-target' && queryParams) {
      if (queryParams.url) {
        return { type: 'url', data: queryParams.url as string };
      }
      if (queryParams.text) {
        return { type: 'text', data: queryParams.text as string };
      }
      if (queryParams.image) {
        return { type: 'image', data: queryParams.image as string };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing shared URL:', error);
    return null;
  }
}
