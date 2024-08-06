import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { SkinnedMesh } from "three";

export async function LoadMMD(path: string): Promise<SkinnedMesh> {
  const loader = new MMDLoader();

  const model: SkinnedMesh = await new Promise((resolve, reject) => {
    loader.load(
      path,
      (mesh) => resolve(mesh),
      undefined,
      (error) => reject(error),
    );
  });

  return model;
}
