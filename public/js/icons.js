// Original line-icon set, 24x24 viewBox, 1.8 stroke, round caps/joins.
// currentColor throughout so icons inherit their container's text color.
// No external icon font or CDN - keeps the app working fully offline.

const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const Icons = {
  package: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z"/>
    <path d="M3.5 7.5 12 12l8.5-4.5"/>
    <path d="M12 12v9"/>
    <path d="M7.5 5.2 16 9.8"/>
  </svg>`,

  truck: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M2.5 6.5h10v9h-10z"/>
    <path d="M12.5 10h4l3 3v2.5h-7z"/>
    <circle cx="6" cy="17.5" r="1.7"/>
    <circle cx="16.5" cy="17.5" r="1.7"/>
  </svg>`,

  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z"/>
    <circle cx="12" cy="9.5" r="2.4"/>
  </svg>`,

  phone: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M5 3.5h3.2L9.7 8 7.5 9.4a11 11 0 0 0 5.1 5.1l1.4-2.2 4.5 1.5V17a2 2 0 0 1-2 2C10.5 19 3 11.5 3 5.5a2 2 0 0 1 2-2Z"/>
  </svg>`,

  user: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <circle cx="12" cy="8" r="3.6"/>
    <path d="M4.5 20c1.4-3.8 4.4-5.8 7.5-5.8s6.1 2 7.5 5.8"/>
  </svg>`,

  clock: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M12 7.5V12l3 2"/>
  </svg>`,

  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M8.3 12.3l2.4 2.4 5-5.4"/>
  </svg>`,

  alertCircle: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <circle cx="12" cy="12" r="8.5"/>
    <path d="M12 7.5v5.2"/>
    <circle cx="12" cy="16" r="0.15" fill="currentColor"/>
  </svg>`,

  logOut: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"/>
    <path d="M14 16.5 19 12l-5-4.5"/>
    <path d="M19 12H9"/>
  </svg>`,

  plus: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M12 5v14M5 12h14"/>
  </svg>`,

  scan: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"/>
    <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"/>
    <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16"/>
    <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/>
    <path d="M4 12h16"/>
  </svg>`,

  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M9 5l7 7-7 7"/>
  </svg>`,

  refresh: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 8.5"/>
    <path d="M19.5 4.5v4h-4"/>
    <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15.5"/>
    <path d="M4.5 19.5v-4h4"/>
  </svg>`,

  inbox: `<svg xmlns="http://www.w3.org/2000/svg" ${ICON_ATTRS}>
    <path d="M4 12.5 6.5 5h11l2.5 7.5"/>
    <path d="M4 12.5v5A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-5"/>
    <path d="M4 12.5h5l1 2h4l1-2h5"/>
  </svg>`,

  // Brand mark: a "W" traced as a delivery route (echoes the dashed
  // shop-to-doorstep path on the login screen), plus a drop pin dotting
  // the final ascent. currentColor so it inherits --white inside .mark.
  brandMark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 7.5 8.2 17 12 8.7 15.8 17l3.3-8"/>
    <circle cx="19.6" cy="6.4" r="1.4" fill="currentColor" stroke="none"/>
  </svg>`,
};

function icon(name, opts = {}) {
  const size = opts.size || 20;
  const svg = Icons[name];
  if (!svg) return "";
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
}
