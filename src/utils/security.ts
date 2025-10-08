import { AES, enc } from 'crypto-js';

const SECURITY_KEY = 'f@lc0x-tr@d1ng-b0t-2025';

export const encrypt = (text: string): string => {
  return AES.encrypt(text, SECURITY_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
  const bytes = AES.decrypt(ciphertext, SECURITY_KEY);
  return bytes.toString(enc.Utf8);
};

export const obfuscateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const generateNonce = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export const verifyIntegrity = (data: any): boolean => {
  try {
    const serialized = JSON.stringify(data);
    const hash = Array.from(serialized).reduce(
      (h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0
    ).toString(16);
    return hash === localStorage.getItem('data_integrity');
  } catch {
    return false;
  }
};

export const updateIntegrity = (data: any): void => {
  try {
    const serialized = JSON.stringify(data);
    const hash = Array.from(serialized).reduce(
      (h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0
    ).toString(16);
    localStorage.setItem('data_integrity', hash);
  } catch {
    // Silent fail
  }
};