// Front-facing square in metres. Keep the same framing for the entire clip.
export function atlasPlane(asset, bend) {
  const minX = -asset.width * (asset.burst ? 1.17 : .94);
  const maxX = asset.width * (.98 + bend * 2.35 + (asset.burst ? .19 : 0));
  const minY = Math.max(-.007, asset.base - asset.height * (asset.burst ? .22 : .14));
  const maxY = asset.base + asset.height * 2.04;
  const size = Math.max(maxX - minX, maxY - minY) * 1.10;
  const x = (minX + maxX) / 2;
  const y = (minY + maxY) / 2;
  return {
    projection: 'orthographic', viewDirection: [0, 0, -1], up: [0, 1, 0],
    widthMeters: size, heightMeters: size,
    // Location of the model's floor origin in a cell, measured from its top left.
    pivotUV: [.5 - x / size, .5 + y / size],
    center: [x, y, 0],
  };
}
