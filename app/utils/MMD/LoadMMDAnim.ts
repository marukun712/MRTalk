import { AnimationClip, SkinnedMesh } from "three";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";

export async function LoadMMDAnim(
  path: string,
  model: SkinnedMesh,
): Promise<AnimationClip> {
  const loader = new MMDLoader();

  const anim: AnimationClip = await new Promise((resolve, reject) => {
    loader.loadAnimation(
      path,
      model,
      (animation) => resolve(animation as AnimationClip),
      undefined,
      (error) => reject(error),
    );
  });

  return anim;
}
