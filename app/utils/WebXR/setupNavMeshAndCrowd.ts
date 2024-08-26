import * as THREE from "three";
import { Mesh } from "three";
import { Crowd, CrowdAgent, NavMeshQuery } from "recast-navigation";
import { threeToSoloNavMesh } from "recast-navigation/three";

export function setupNavMeshAndCrowd(grounds: Mesh[]) {
  return new Promise<
    {
      crowd: Crowd;
      agent: CrowdAgent;
      navMeshQuery: NavMeshQuery;
      lowestGround: Mesh | null;
    }
  >((resolve) => {
    setTimeout(() => {
      let lowestGround: Mesh | null = null;
      grounds.forEach((mesh: Mesh) => {
        if (!lowestGround || mesh.position.y < lowestGround.position.y) {
          lowestGround = mesh;
        }
      });

      const { navMesh } = threeToSoloNavMesh(grounds);
      console.log(navMesh);
      if (!navMesh) return;

      const maxAgents = 1;
      const maxAgentRadius = 0.6;

      const crowd = new Crowd(navMesh, { maxAgents, maxAgentRadius });
      const navMeshQuery = new NavMeshQuery(navMesh);

      const agent = crowd.addAgent(new THREE.Vector3(0, 0, 0), {
        radius: 0.25,
        height: 1.25,
        maxAcceleration: 4.0,
        maxSpeed: 0.5,
        collisionQueryRange: 0.5,
        pathOptimizationRange: 0.0,
        separationWeight: 1.0,
      });

      console.log(agent);

      resolve({ crowd, agent, navMeshQuery, lowestGround });
    }, 5000);
  });
}
