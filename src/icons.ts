// Custom SVG icon set — consistent on every OS, replaces emoji.
// Mono icons use currentColor so they inherit the button's text color;
// the colorful ones carry the game's candy palette.

const svg = (body: string, viewBox = '0 0 24 24') =>
  `<svg class="icon" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`

export const ICONS: Record<string, () => string> = {
  heart: () => svg(
    `<path d="M12 20.5C6.2 16.3 2.8 12.9 2.8 9.2 2.8 6.3 5 4.2 7.6 4.2c1.7 0 3.3 1 4.4 2.6 1.1-1.6 2.7-2.6 4.4-2.6 2.6 0 4.8 2.1 4.8 5 0 3.7-3.4 7.1-9.2 11.3z" fill="#ff5c9e" stroke="#c73a78" stroke-width="1.4" stroke-linejoin="round"/>`
  ),

  star: () => svg(
    `<path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z" fill="#ffc93c" stroke="#e0a614" stroke-width="1.4" stroke-linejoin="round"/>`
  ),

  sparkle: () => svg(
    `<path d="M12 3l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z" fill="#ffe066" stroke="#e0a614" stroke-width="1.2" stroke-linejoin="round"/>`
  ),

  magnet: () => svg(
    `<path d="M5 10a7 7 0 0 0 14 0V3.5h-5V10a2 2 0 0 1-4 0V3.5H5z" fill="#ff5c5c" stroke="#c93a3a" stroke-width="1.3" stroke-linejoin="round"/>
     <rect x="5" y="3.5" width="5" height="3.4" rx="0.8" fill="#fff4d6" stroke="#cbb98f" stroke-width="1"/>
     <rect x="14" y="3.5" width="5" height="3.4" rx="0.8" fill="#fff4d6" stroke="#cbb98f" stroke-width="1"/>`
  ),

  coin: () => svg(
    `<circle cx="12" cy="12" r="8.6" fill="#ffc93c" stroke="#e0a614" stroke-width="1.6"/>
     <circle cx="12" cy="12" r="5" fill="none" stroke="#e0a614" stroke-width="1.3"/>`
  ),

  lock: () => svg(
    `<path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10" fill="none" stroke="#5a3e6b" stroke-width="2" stroke-linecap="round"/>
     <rect x="5.5" y="10" width="13" height="9.5" rx="2.2" fill="#ffc93c" stroke="#e0a614" stroke-width="1.4"/>
     <circle cx="12" cy="14.2" r="1.6" fill="#5a3e6b"/>`
  ),

  pause: () => svg(
    `<rect x="6" y="4.5" width="4.2" height="15" rx="1.8" fill="currentColor"/>
     <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.8" fill="currentColor"/>`
  ),

  play: () => svg(
    `<path d="M7.5 5.6c0-1.2 1.3-1.9 2.3-1.3l9.6 6.4c.9.6.9 2 0 2.6l-9.6 6.4c-1 .6-2.3-.1-2.3-1.3z" fill="currentColor"/>`
  ),

  home: () => svg(
    `<path d="M4 11.2L12 4l8 7.2V19a1.6 1.6 0 0 1-1.6 1.6H14.2v-5.2H9.8v5.2H5.6A1.6 1.6 0 0 1 4 19z" fill="currentColor"/>`
  ),

  speakerOn: () => svg(
    `<path d="M4 9.4h3.4L12 5.4v13.2l-4.6-4H4z" fill="currentColor"/>
     <path d="M14.8 9.2a4.2 4.2 0 0 1 0 5.6M17.4 6.8a7.6 7.6 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`
  ),

  speakerOff: () => svg(
    `<path d="M4 9.4h3.4L12 5.4v13.2l-4.6-4H4z" fill="currentColor"/>
     <path d="M15.2 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`
  ),

  chevronLeft: () => svg(
    `<path d="M14.8 4.8L7.6 12l7.2 7.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`
  ),

  chevronRight: () => svg(
    `<path d="M9.2 4.8l7.2 7.2-7.2 7.2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`
  ),

  car: () => svg(
    `<rect x="4.5" y="5" width="19" height="8" rx="4" fill="#ff8fb8" stroke="#c73a78" stroke-width="1.4"/>
     <rect x="1.5" y="9.5" width="25" height="7.5" rx="3.6" fill="#ff5c9e" stroke="#c73a78" stroke-width="1.4"/>
     <circle cx="7.5" cy="17.5" r="3.2" fill="#3d2f4f"/><circle cx="7.5" cy="17.5" r="1.4" fill="#fff4d6"/>
     <circle cx="20.5" cy="17.5" r="3.2" fill="#3d2f4f"/><circle cx="20.5" cy="17.5" r="1.4" fill="#fff4d6"/>`,
    '0 0 28 22'
  ),

  crown: () => svg(
    `<path d="M5 25L8.5 9l8.5 8L24 4.5 31 17l8.5-8L43 25z" fill="#ffc93c" stroke="#e0a614" stroke-width="2" stroke-linejoin="round"/>
     <rect x="5" y="25" width="38" height="5" rx="2.4" fill="#f0b429" stroke="#e0a614" stroke-width="1.4"/>
     <circle cx="14" cy="27.5" r="1.9" fill="#7fe08f"/>
     <circle cx="24" cy="27.5" r="2.3" fill="#ff5c9e"/>
     <circle cx="34" cy="27.5" r="1.9" fill="#6fc3ff"/>`,
    '0 0 48 32'
  ),

  trophy: () => svg(
    `<path d="M7 3.5h10V10a5 5 0 0 1-10 0z" fill="#ffc93c" stroke="#e0a614" stroke-width="1.4" stroke-linejoin="round"/>
     <path d="M7 5.5H4.2a3.4 3.4 0 0 0 3 5.3M17 5.5h2.8a3.4 3.4 0 0 1-3 5.3" fill="none" stroke="#e0a614" stroke-width="1.6" stroke-linecap="round"/>
     <rect x="10.4" y="14.6" width="3.2" height="3" fill="#f0b429"/>
     <rect x="7.5" y="17.6" width="9" height="2.9" rx="1.2" fill="#ffc93c" stroke="#e0a614" stroke-width="1.3"/>
     <path d="M12 6l.9 1.9 2.1.3-1.5 1.4.4 2L12 10.6l-1.9 1 .4-2L9 8.2l2.1-.3z" fill="#fff4d6"/>`
  ),

  turtle: () => svg(
    `<path d="M5 13.5a9 8.5 0 0 1 18 0z" fill="#7fc98f" stroke="#4f9c63" stroke-width="1.4" stroke-linejoin="round"/>
     <path d="M10 7.5l1.8 5m4.4-5l-1.8 5M8 13.5h12" fill="none" stroke="#4f9c63" stroke-width="1.1"/>
     <circle cx="25" cy="12.2" r="2.7" fill="#a8dcb0" stroke="#4f9c63" stroke-width="1.2"/>
     <circle cx="25.8" cy="11.6" r="0.6" fill="#2f5c3d"/>
     <rect x="7" y="13.5" width="3" height="2.6" rx="1.2" fill="#a8dcb0" stroke="#4f9c63" stroke-width="1"/>
     <rect x="17.5" y="13.5" width="3" height="2.6" rx="1.2" fill="#a8dcb0" stroke="#4f9c63" stroke-width="1"/>`,
    '0 0 30 18'
  ),

  rabbit: () => svg(
    `<ellipse cx="9" cy="7.5" rx="2.7" ry="6.2" transform="rotate(-14 9 7.5)" fill="#ffffff" stroke="#c9a3b8" stroke-width="1.2"/>
     <ellipse cx="9.2" cy="7.8" rx="1.2" ry="4" transform="rotate(-14 9.2 7.8)" fill="#ffd1e3"/>
     <ellipse cx="15" cy="7.5" rx="2.7" ry="6.2" transform="rotate(14 15 7.5)" fill="#ffffff" stroke="#c9a3b8" stroke-width="1.2"/>
     <ellipse cx="14.8" cy="7.8" rx="1.2" ry="4" transform="rotate(14 14.8 7.8)" fill="#ffd1e3"/>
     <circle cx="12" cy="17" r="7" fill="#ffffff" stroke="#c9a3b8" stroke-width="1.2"/>
     <circle cx="9.6" cy="16" r="0.9" fill="#5a3e6b"/>
     <circle cx="14.4" cy="16" r="0.9" fill="#5a3e6b"/>
     <path d="M12 18.2l-1.2 1.4h2.4z" fill="#ff8fb8"/>`,
    '0 0 24 26'
  ),
}

/** Replace every `[data-icon="name"]` placeholder with its SVG. */
export function hydrateIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((node) => {
    const make = ICONS[node.dataset.icon ?? '']
    if (make) node.innerHTML = make()
  })
}
