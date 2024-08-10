import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";

export function setupControllers(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5),
  ]);

  const controller1 = renderer.xr.getController(0);
  controller1.add(new THREE.Line(geometry));
  scene.add(controller1);

  const controller2 = renderer.xr.getController(1);
  controller2.add(new THREE.Line(geometry));
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1),
  );
  scene.add(controllerGrip1);

  const hand1 = renderer.xr.getHand(0);
  hand1.add(handModelFactory.createHandModel(hand1));

  scene.add(hand1);

  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2),
  );
  scene.add(controllerGrip2);

  const hand2 = renderer.xr.getHand(1);
  hand2.add(handModelFactory.createHandModel(hand2));
  scene.add(hand2);

  return { controller1, controller2, controllerGrip1, controllerGrip2 };
}
