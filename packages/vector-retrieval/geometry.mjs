import {normalizeVector,dot,squaredL2} from './vectors.mjs';
export function compareGeometry(a,b) {
  const unitA=normalizeVector(a),unitB=normalizeVector(b);
  const normA=Math.hypot(...a),normB=Math.hypot(...b),product=dot(a,b);
  return {normA,normB,dot:product,cosine:product/(normA*normB),squaredL2:squaredL2(a,b),unitA,unitB,unitDot:dot(unitA,unitB),unitCosine:dot(unitA,unitB)/(Math.hypot(...unitA)*Math.hypot(...unitB)),unitSquaredL2:squaredL2(unitA,unitB)};
}
export function toyVectors(degrees,scale) {
  if(!Number.isFinite(degrees)||degrees<-180||degrees>180||!Number.isFinite(scale)||scale<.25||scale>4)throw Error('Toy slider limits');
  const angle=degrees*Math.PI/180;
  return {a:[scale,0],b:[Math.cos(angle),Math.sin(angle)]};
}
