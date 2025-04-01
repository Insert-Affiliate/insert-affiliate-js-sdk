// src/utils/asyncStorage.ts
export const saveValue = async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
};

export const getValue = async (key: string): Promise<string | null> => {
    return localStorage.getItem(key);
};
  