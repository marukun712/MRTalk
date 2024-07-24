import { LoadVRM } from "./LoadVRM";

export async function getVRMThumbnail(url: string): Promise<string> {
    const model = await LoadVRM(url);
    const img: string = model.userData.vrm.meta.thumbnailImage.src;

    return img
} 