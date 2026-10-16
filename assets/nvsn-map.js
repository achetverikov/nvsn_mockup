'use strict';

const COUNTRY_IDS = new Set(['208', '578', '752', '246', '352', '428']);
const CITIES = [
  { city: 'Reykjavik', lat: 64.15, lon: -21.94, country: 'Iceland', side: 'r' },
  { city: 'Bergen', lat: 60.39, lon: 5.32, country: 'Norway', side: 'l' },
  { city: 'Oslo', lat: 59.91, lon: 10.75, country: 'Norway', side: 'r' },
  { city: 'Stockholm', lat: 59.33, lon: 18.07, country: 'Sweden', side: 'r' },
  { city: 'Helsinki', lat: 60.17, lon: 24.94, country: 'Finland', side: 'l', dy: -12 },
  { city: 'Riga', lat: 56.95, lon: 24.1, country: 'Latvia', side: 'r' },
  { city: 'Lund', lat: 55.7, lon: 13.19, country: 'Sweden', side: 'r', dy: -6 },
  { city: 'Copenhagen', lat: 55.68, lon: 12.57, country: 'Denmark', side: 'r', dy: 12 },
  { city: 'Aalborg', lat: 57.05, lon: 9.92, country: 'Denmark', side: 'l' },
  { city: 'Aarhus', lat: 56.16, lon: 10.2, country: 'Denmark', side: 'r', dy: -12 },
  { city: 'Odense', lat: 55.4, lon: 10.39, country: 'Denmark', side: 'l' }
];
const members = [...window.NVSN_CONTENT.labs, ...window.NVSN_CONTENT.youngScientists];
for (const city of CITIES) city.members = members.filter(member => member.city === city.city);
const topology = window.NVSN_WORLD;
const world = topojson.feature(topology, topology.objects.countries);
const svg = d3.select('#m');
const popup = document.getElementById('map-popup');
const choices = document.getElementById('member-choices');
const parentOrigin = location.origin === 'null' ? '*' : location.origin;
let state = { filter: 'All', selectedId: null };
let projection, popupCity;

function openMember(member) {
  closePopup(false);
  parent.postMessage({ type: 'nvsn-map-open-member', id: member.id }, parentOrigin);
}

function closePopup(restoreFocus) {
  popup.hidden = true;
  if (restoreFocus && popupCity) document.querySelector(`.pin[data-city="${popupCity.city}"]`)?.focus();
  popupCity = null;
}

function activateCity(city) {
  if (city.members.length === 1) {
    openMember(city.members[0]);
    return;
  }
  popupCity = city;
  document.getElementById('popup-title').textContent = city.city;
  document.getElementById('popup-description').textContent = 'Choose a lab to see its details.';
  choices.replaceChildren();
  for (const member of city.members) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'member-choice';
    button.dataset.memberId = member.id;
    const title = document.createElement('strong');
    title.textContent = member.name;
    const university = document.createElement('small');
    university.textContent = member.uni;
    button.append(title, university);
    button.addEventListener('click', () => openMember(member));
    choices.append(button);
  }
  popup.hidden = false;
  const [x, y] = projection([city.lon, city.lat]);
  const bounds = popup.getBoundingClientRect();
  popup.style.left = Math.max(12, Math.min(innerWidth - bounds.width - 12, x + 14)) + 'px';
  popup.style.top = Math.max(12, Math.min(innerHeight - bounds.height - 12, y + 14)) + 'px';
  choices.querySelector('button').focus();
}

document.getElementById('popup-close').addEventListener('click', () => closePopup(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !popup.hidden) {
    event.preventDefault();
    closePopup(true);
  }
});
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'nvsn-map-state') return;
  const next = { filter: event.data.filter, selectedId: event.data.selectedId ?? null };
  if (next.filter === state.filter && next.selectedId === state.selectedId) return;
  state = next;
  closePopup(false);
  draw();
});
window.addEventListener('resize', () => { closePopup(false); draw(); });
svg.on('click', event => { if (!event.target.closest('.pin')) closePopup(false); });

function draw() {
  const width = innerWidth, height = innerHeight;
  svg.attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();
  const box = { type: 'MultiPoint', coordinates: [[-24.5, 66.5], [-24.5, 63.3], [28.5, 61], [27, 55.6], [8, 54.6], [15, 66.5]] };
  projection = d3.geoConicConformal().parallels([55, 65]).rotate([-5, 0]).fitExtent([[28, 28], [width - 28, height - 28]], box).clipExtent([[0, 0], [width, height]]);
  const path = d3.geoPath(projection);
  const positions = new Map();
  const placedPoints = [];
  for (const city of [...CITIES].sort((a, b) => b.lat - a.lat)) {
    const point = projection([city.lon, city.lat]);
    const angles = city.side === 'l' ? [180, 135, 225, 90, 270, 0, 45, 315] : [0, 45, 315, 90, 270, 180, 135, 225];
    const offsets = [[0, 0], ...[28, 42, 56, 70].flatMap(radius => angles.map(angle => [Math.cos(angle * Math.PI / 180) * radius, Math.sin(angle * Math.PI / 180) * radius]))];
    const offset = offsets.find(([dx, dy]) => {
      const x = point[0] + dx, y = point[1] + dy;
      return x > 15 && x < width - 15 && y > 15 && y < height - 15 && placedPoints.every(other => Math.hypot(x - other[0], y - other[1]) >= 29);
    });
    const marker = [point[0] + offset[0], point[1] + offset[1]];
    positions.set(city.city, { point, marker });
    placedPoints.push(marker);
  }
  const chart = window.drawNvsnChart(svg, projection, positions, width, height);
  svg.append('g').attr('aria-hidden', 'true').selectAll('path').data(world.features).join('path')
    .attr('d', path).attr('fill', d => COUNTRY_IDS.has(d.id) ? '#13243f' : '#0b1527')
    .attr('stroke', d => COUNTRY_IDS.has(d.id) ? 'rgba(232,236,240,.38)' : 'rgba(232,236,240,.12)')
    .attr('stroke-width', .6).attr('stroke-linejoin', 'round');
  const latitudeLines = svg.append('g').attr('aria-hidden', 'true');
  for (const latitude of [55, 57.5, 60, 62.5, 65]) {
    const coordinates = d3.range(-45, 46).map(longitude => [longitude, latitude]);
    latitudeLines.append('path').attr('d', path({ type: 'LineString', coordinates }))
      .attr('fill', 'none').attr('stroke', 'rgba(169,182,195,.2)').attr('stroke-dasharray', '3 4');
    const points = coordinates.map(projection).filter(p => p[0] > width - 70 && p[0] < width - 10);
    if (points.length) latitudeLines.append('text').attr('x', width - 10).attr('y', points[points.length - 1][1] - 5)
      .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', '#6f8399').text(latitude + '° N');
  }
  const selected = members.find(member => member.id === state.selectedId);
  svg.append('g').attr('aria-hidden', 'true').selectAll('line').data(CITIES.filter(city => {
    const { point, marker } = positions.get(city.city);
    return Math.hypot(point[0] - marker[0], point[1] - marker[1]) > 1;
  })).join('line').attr('x1', city => positions.get(city.city).point[0]).attr('y1', city => positions.get(city.city).point[1])
    .attr('x2', city => positions.get(city.city).marker[0]).attr('y2', city => positions.get(city.city).marker[1])
    .attr('stroke', '#769b96').attr('stroke-width', .8);
  // Keep every point above the labels so a neighboring label cannot steal its click.
  const cityLabels = svg.append('g').attr('class', 'city-labels').attr('aria-hidden', 'true').selectAll('text').data(CITIES).join('text')
    .attr('class', 'pin-label').attr('transform', city => `translate(${positions.get(city.city).marker})`)
    .attr('x', city => city.side === 'l' ? -12 : 12).attr('y', city => city.dy ?? 0)
    .attr('text-anchor', city => city.side === 'l' ? 'end' : 'start').attr('dominant-baseline', 'middle').text(city => city.city)
    .on('click', (event, city) => { event.stopPropagation(); activateCity(city); });
  const pins = svg.append('g').selectAll('g').data(CITIES).join('g')
    .attr('class', city => 'pin' + (city.city === selected?.city ? ' is-selected' : ''))
    .attr('data-city', city => city.city).attr('role', 'button').attr('tabindex', 0)
    .attr('aria-label', city => city.city + ': ' + city.members.map(member => member.name).join(', '))
    .attr('aria-haspopup', city => city.members.length > 1 ? 'dialog' : null)
    .attr('aria-pressed', city => city.city === selected?.city ? 'true' : 'false')
    .attr('transform', city => `translate(${positions.get(city.city).marker})`)
    .attr('opacity', city => state.filter === 'All' || state.filter === city.city || state.filter === city.country || city.city === selected?.city ? 1 : .4)
    .on('click', (event, city) => { event.stopPropagation(); activateCity(city); })
    .on('keydown', (event, city) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateCity(city); }
    });
  pins.append('title').text(city => city.city + ': ' + city.members.map(member => member.name).join(', '));
  pins.append('circle').attr('class', 'pin-ring').attr('r', 14).attr('fill', 'transparent');
  pins.append('circle').attr('r', city => city.members.length > 1 ? 8 : 4).attr('fill', '#cfe3da').attr('pointer-events', 'none');
  pins.filter(city => city.members.length > 1).append('text').attr('class', 'cluster-count')
    .attr('text-anchor', 'middle').attr('dy', '.35em').text(city => city.members.length);
  // Keep nearby city labels readable without moving their geographic points.
  const labels = [];
  cityLabels.each(function(city) {
    const label = d3.select(this), box = this.getBBox();
    const [x, y] = positions.get(city.city).marker;
    const left = Math.max(5, Math.min(width - box.width - 5, x + box.x));
    label.attr('x', +label.attr('x') + left - x - box.x);
    labels.push({ label, x: left, y: y + box.y, width: box.width, height: box.height, originalY: +label.attr('y') });
  });
  labels.sort((a, b) => a.y - b.y);
  const placed = [];
  for (const label of labels) {
    let shift = 0, collision = true;
    while (collision) {
      collision = false;
      for (const other of placed) {
        if (label.x < other.x + other.width + 2 && label.x + label.width + 2 > other.x && label.y + shift < other.y + other.height && label.y + shift + label.height > other.y) {
          shift = other.y + other.height + 2 - label.y;
          collision = true;
        }
      }
    }
    label.label.attr('y', label.originalY + shift);
    placed.push({ ...label, y: label.y + shift });
  }
  chart.finish(placed);
}

draw();
document.getElementById('map-status').hidden = true;
parent.postMessage({ type: 'nvsn-map-ready' }, parentOrigin);
