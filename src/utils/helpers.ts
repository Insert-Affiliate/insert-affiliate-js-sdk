// src/utils/helpers.ts
export const generateShortDeviceID = (): string => {
  const hashed = Math.abs(generateUUID().hashCode()) % 0xffffff;
  return hashed.toString(16).padStart(6, '0').toUpperCase();
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Ensure we only patch String.prototype once
if (!String.prototype.hasOwnProperty('hashCode')) {
  String.prototype.hashCode = function (): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const chr = this.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };
}

declare global {
  interface String {
    hashCode(): number;
  }
}
