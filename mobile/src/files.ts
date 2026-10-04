import { Platform } from "react-native";

export async function formFile(uri: string, name: string, type: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Could not read the selected file");
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || type });
  }
  return { uri, name, type } as unknown as Blob;
}
