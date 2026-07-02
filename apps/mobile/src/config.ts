import { Platform } from 'react-native';

const PROD_API = 'https://api.generalhome.tech/api';

function devApiBase() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';
}

export const API_BASE = __DEV__ ? devApiBase() : PROD_API;

export const COMPANY_SLUG = 'generalhome';

export const APP_META = {
  company: 'General Home',
  city: 'Santo Domingo, República Dominicana',
  developer: 'renace.tech',
  developerUrl: 'https://renace.tech',
};

export function fileUrl(path: string) {
  if (path.startsWith('http')) return path;
  const origin = API_BASE.replace(/\/api$/, '');
  return `${origin}${path}`;
}
