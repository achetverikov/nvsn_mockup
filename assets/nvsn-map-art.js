'use strict';

// Imagegen line drawings follow the live map projection, beneath land
// and markers. Decoration is excluded from interaction and accessibility trees.
window.drawNvsnChart = function(svg, projection, positions, width, height) {
  const defs = svg.append('defs');
  const mask = defs.append('mask').attr('id', 'chart-open-water')
    .attr('maskUnits', 'userSpaceOnUse').attr('x', 0).attr('y', 0).attr('width', width).attr('height', height);
  mask.append('rect').attr('width', width).attr('height', height).attr('fill', 'white');
  mask.selectAll('circle').data([...positions.values()]).join('circle')
    .attr('cx', d => d.marker[0]).attr('cy', d => d.marker[1]).attr('r', 21).attr('fill', 'black');
  const art = svg.append('g').attr('class', 'chart-decoration').attr('aria-hidden', 'true').attr('mask', 'url(#chart-open-water)');
  const scale = Math.min(width / 560, height / 420);
  for (const [name, lon, lat, size] of [
    ['compass', -24, 55, 52], ['serpent', -14, 60, 94],
    ['kraken', -6, 70, 70], ['ship', -3, 63, 52]
  ]) {
    const [x, y] = projection([lon, lat]);
    const edge = size * scale;
    // Luminance preserves the fine white strokes without opaque backgrounds.
    const sprite = defs.append('mask').attr('id', 'chart-sprite-' + name).attr('maskUnits', 'objectBoundingBox')
      .attr('maskContentUnits', 'objectBoundingBox').attr('x', 0).attr('y', 0).attr('width', 1).attr('height', 1).attr('mask-type', 'luminance');
    sprite.append('image').attr('href', 'assets/nvsn/map-' + name + '.webp')
      .attr('width', 1).attr('height', 1).attr('preserveAspectRatio', 'xMidYMid meet');
    art.append('rect').attr('class', 'chart-ornament chart-' + name).attr('fill', '#e8ecf0')
      .attr('mask', 'url(#chart-sprite-' + name + ')')
      .attr('x', Math.max(16, Math.min(width - edge - 16, x - edge / 2)))
      .attr('y', Math.max(16, Math.min(height - edge - 16, y - edge / 2)))
      .attr('width', edge).attr('height', edge);
  }
  return {
    finish(labels) {
      for (const label of labels) mask.append('rect').attr('x', label.x - 4).attr('y', label.y - 3)
        .attr('width', label.width + 8).attr('height', label.height + 6).attr('fill', 'black');
    }
  };
};
