import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { 
  getRotationArcParameters, 
  createLayerCollarGeometry,
  FACE_NORMALS 
} from '../../src/components/Cube3DViewer';
import type { Face } from '../../src/solver/cubeTypes';

describe('Tier 1: F12 - Exterior Orbiting Indicator Arcs', () => {
  it('F12-1: Rotation indicator arc radius is exactly 1.90, extending beyond the 1.50 cube boundary', () => {
    const params = getRotationArcParameters('U');
    assert.strictEqual(params.arcRadius, 1.90, 'Indicator arc radius must be 1.90 units');
    
    // Cube outer boundary is 1.50
    const cubeBoundary = 1.50;
    const exteriorMargin = params.arcRadius - cubeBoundary;
    assert.strictEqual(Number(exteriorMargin.toFixed(2)), 0.40, 'Arc wings must orbit 0.40 units outside cube silhouette');
  });

  it('F12-2: 180° double turns construct a clean unidirectional 195° arc without ambiguous opposing arrowheads', () => {
    const doubleMoves = ['U2', 'D2', 'F2', 'B2', 'L2', 'R2'];
    for (const move of doubleMoves) {
      const params = getRotationArcParameters(move);
      assert.strictEqual(params.isDouble, true, `${move} must be flagged as double turn`);
      
      const sweepDegrees = Math.round(Math.abs(params.sweepAngle) * (180 / Math.PI));
      assert.strictEqual(sweepDegrees, 195, `${move} must sweep exactly 195° in a single continuous arc`);
    }
  });

  it('F12-3: Single 90° clockwise and prime counter-clockwise turns have proper directional signs', () => {
    const cwParams = getRotationArcParameters('R');
    const ccwParams = getRotationArcParameters("R'");

    assert.strictEqual(cwParams.isPrime, false);
    assert.strictEqual(ccwParams.isPrime, true);

    // Clockwise decreases theta (negative sweep), counter-clockwise increases theta (positive sweep)
    assert.ok(cwParams.sweepAngle < 0, 'Clockwise turn must have negative sweep angle');
    assert.ok(ccwParams.sweepAngle > 0, 'Counter-clockwise turn must have positive sweep angle');
  });

  it('F12-4: Rotation arc sampled 3D vertices lie strictly on or outside the 1.50 boundary plane', () => {
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    for (const face of faces) {
      const params = getRotationArcParameters(face);
      const { startAngle, sweepAngle, arcRadius } = params;
      const numPoints = 36;
      let maxExtInPlane = 0;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const angle = startAngle + sweepAngle * t;
        const x = arcRadius * Math.cos(angle);
        const y = arcRadius * Math.sin(angle);
        const dist = Math.sqrt(x * x + y * y);
        if (dist > maxExtInPlane) maxExtInPlane = dist;
      }

      assert.strictEqual(Number(maxExtInPlane.toFixed(2)), 1.90, 'Arc vertices must orbit at radius 1.90');
      assert.ok(maxExtInPlane > 1.50, 'Max radial distance must exceed the 1.50 cube boundary');
    }
  });

  it('F12-5: Layer collar geometry surrounds active slice perimeter with half-extent >= 1.55', () => {
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    for (const face of faces) {
      const geom = createLayerCollarGeometry(face);
      assert.ok(geom instanceof THREE.BufferGeometry, `${face} collar must be a valid BufferGeometry`);
      
      const posAttr = geom.attributes.position;
      assert.ok(posAttr && posAttr.count > 0, `${face} collar must have position vertices`);

      const bbox = new THREE.Box3().setFromBufferAttribute(posAttr);
      const spanX = bbox.max.x - bbox.min.x;
      const spanY = bbox.max.y - bbox.min.y;
      const spanZ = bbox.max.z - bbox.min.z;

      // Collar spans at least 3.10 units across the perpendicular plane (half-extent 1.55)
      const spans = [spanX, spanY, spanZ].sort((a, b) => b - a);
      assert.ok(spans[0] >= 3.09, `${face} collar longest span must be >= 3.09 units`);
      assert.ok(spans[1] >= 3.09, `${face} collar second span must be >= 3.09 units`);

      geom.dispose();
    }
  });

  it('F12-6: Layer collar forms an exterior halo around slice boundary without penetrating cube interior core', () => {
    // For U face (slice centered at y = 1.0):
    const geomU = createLayerCollarGeometry('U');
    const posAttr = geomU.attributes.position;
    const vertex = new THREE.Vector3();

    // Check that vertices form an exterior perimeter: no vertex can be inside the interior core cube [-1.45, 1.45]^3
    let hasCorePenetration = false;
    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      // If a point has |x| < 1.45 AND |z| < 1.45 AND |y| < 1.45, it would be inside the core
      if (Math.abs(vertex.x) < 1.45 && Math.abs(vertex.z) < 1.45 && Math.abs(vertex.y) < 1.45) {
        hasCorePenetration = true;
        break;
      }
    }

    assert.strictEqual(hasCorePenetration, false, 'Collar halo must never penetrate inside the cube core');
    geomU.dispose();
  });
});
