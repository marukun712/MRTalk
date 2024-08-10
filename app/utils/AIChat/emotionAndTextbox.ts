import * as THREE from "three";
import { VRM } from "@pixiv/three-vrm";

export function resetEmotion(
  currentMixer: THREE.AnimationMixer,
  animations: Record<string, THREE.AnimationClip>,
  vrm?: VRM,
) {
  Object.values(animations).forEach((anim) =>
    currentMixer.clipAction(anim).stop()
  );
  if (vrm) {
    vrm.expressionManager?.setValue("happy", 0);
    vrm.expressionManager?.setValue("sad", 0);
    vrm.expressionManager?.setValue("angry", 0);
    vrm.expressionManager?.setValue("neutral", 1);
  }
}

export function setEmotion(
  emotion: string,
  currentMixer: THREE.AnimationMixer,
  animations: Record<string, THREE.AnimationClip>,
  vrm?: VRM,
) {
  resetEmotion(currentMixer, animations, vrm);

  switch (emotion) {
    case "fun":
      currentMixer.clipAction(animations.idle).play();
      break;
    case "joy":
      currentMixer.clipAction(animations.joy).play();
      vrm?.expressionManager?.setValue("happy", 1);
      break;
    case "sorrow":
      currentMixer.clipAction(animations.sorrow).play();
      vrm?.expressionManager?.setValue("sad", 1);
      break;
    case "angry":
      currentMixer.clipAction(animations.angry).play();
      vrm?.expressionManager?.setValue("angry", 1);
      break;
  }
}
