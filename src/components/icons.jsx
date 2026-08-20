const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconHome = (props) => (
  <svg {...base} {...props}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

export const IconSearch = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconCart = (props) => (
  <svg {...base} {...props}>
    <circle cx="9" cy="20" r="1.6" />
    <circle cx="17.5" cy="20" r="1.6" />
    <path d="M2.5 3.5h2.2l2.2 12h10.4l2-8.5H6.1" />
  </svg>
)

export const IconGauge = (props) => (
  <svg {...base} {...props}>
    <path d="M12 20a8 8 0 1 1 8-8" />
    <path d="M12 12l5-3" />
    <path d="M12 20a2 2 0 0 1 0-4 2 2 0 0 1 0 4Z" />
  </svg>
)

export const IconWrench = (props) => (
  <svg {...base} {...props}>
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6a2.1 2.1 0 0 0 3 3l5.7-5.7a4.5 4.5 0 0 0 5.6-6l-2.9 2.9-2.6-.7-.7-2.6 2.6-2.2Z" />
  </svg>
)

export const IconTruck = (props) => (
  <svg {...base} {...props}>
    <path d="M2 6h12v10H2z" />
    <path d="M14 10h4l3 3.5V16h-7" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="16.5" cy="17.5" r="1.8" />
  </svg>
)

export const IconShield = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3 4 6v5c0 4.7 3.4 8.4 8 10 4.6-1.6 8-5.3 8-10V6l-8-3Z" />
    <path d="m9 11.5 2 2 4-4" />
  </svg>
)

export const IconLock = (props) => (
  <svg {...base} {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const IconBolt = (props) => (
  <svg {...base} {...props}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

export const IconClock = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const IconFilter = (props) => (
  <svg {...base} {...props}>
    <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
  </svg>
)

export const IconX = (props) => (
  <svg {...base} {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const IconChevronRight = (props) => (
  <svg {...base} {...props}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const IconChevronLeft = (props) => (
  <svg {...base} {...props}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const IconChevronDown = (props) => (
  <svg {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconMenu = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export const IconCar = (props) => (
  <svg {...base} {...props}>
    <path d="M4 16v-4.5L6 7h12l2 4.5V16" />
    <path d="M4 16h16v3H4z" />
    <circle cx="7.5" cy="16" r="0.5" fill="currentColor" />
    <circle cx="16.5" cy="16" r="0.5" fill="currentColor" />
    <path d="M9 11h6" />
  </svg>
)

export const IconStar = (props) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.5 14.8 8.6l6.7.7-5 4.4 1.4 6.6-5.9-3.3-5.9 3.3 1.4-6.6-5-4.4 6.7-.7L12 2.5Z" />
  </svg>
)

export const IconCheck = (props) => (
  <svg {...base} {...props}>
    <path d="m5 12 4.5 4.5L19 7.5" />
  </svg>
)

export const IconUser = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
)

export const IconBox = (props) => (
  <svg {...base} {...props}>
    <path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" />
    <path d="M4 6.5 12 11l8-4.5" />
    <path d="M12 22V11" />
  </svg>
)

export const IconTag = (props) => (
  <svg {...base} {...props}>
    <path d="M3 3h7l11 11-7 7L3 10V3Z" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export const IconPlus = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconMinus = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
)

export const IconTrash = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
)

export const IconArrowRight = (props) => (
  <svg {...base} {...props}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </svg>
)

export const IconMapPin = (props) => (
  <svg {...base} {...props}>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const IconPhone = (props) => (
  <svg {...base} {...props}>
    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
)

export const IconBuilding = (props) => (
  <svg {...base} {...props}>
    <path d="M4 21V5l8-3v19M12 8h8v13H4M4 21h16" />
    <path d="M8 8h2M8 12h2M8 16h2" />
  </svg>
)

export const IconPackage = (props) => (
  <svg {...base} {...props}>
    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
    <path d="M3 7l9 5 9-5M12 22V12" />
  </svg>
)

export const IconFilterFlat = (props) => (
  <svg {...base} {...props}>
    <rect x="7" y="3" width="10" height="8" rx="1.5" />
    <path d="M9 7h6M9 14h6M9 11h6M9 18h6M9 15h6" opacity="0.5" />
    <rect x="4" y="13" width="10" height="6" rx="1.5" />
    <rect x="10" y="20" width="10" height="6" rx="1.5" />
  </svg>
)

export const IconSpark = (props) => (
  <svg {...base} {...props}>
    <path d="M13 3 5 14h6l-2 7 8-11h-6l2-7Z" />
  </svg>
)

export const IconDroplet = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3s6.5 6.6 6.5 11a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3Z" />
    <path d="M9 14a3 3 0 0 0 3 3" opacity="0.6" />
  </svg>
)

export const IconBattery = (props) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="8" width="16" height="8" rx="1.5" />
    <path d="M21.5 11v2" strokeLinecap="round" />
    <path d="M7 10l-2 4h4l-2 4" opacity="0.6" />
  </svg>
)

export const IconGear = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
  </svg>
)

export const IconHeart = (props) => (
  <svg {...base} {...props}>
    <path d="M12 20s-7-4.6-9-8.6C1.4 8 3 5 6 5c2 0 3.4 1.2 4 2.4C10.6 6.2 12 5 14 5c3 0 4.6 3 3 6.4-2 4-5 8.6-5 8.6Z" />
  </svg>
)

export const IconDownload = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3v11M7 9l5 5 5-5" />
    <path d="M4 17v3h16v-3" />
  </svg>
)

export const IconRotateCw = (props) => (
  <svg {...base} {...props}>
    <path d="M21 8V4l-2.3 2.3A9 9 0 1 0 21 12" />
    <path d="M21 8h-5" />
  </svg>
)

export const IconGlobe = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.4 4 5.7 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.7-4-9s1.5-6.6 4-9Z" />
  </svg>
)

export const IconRefreshCw = (props) => (
  <svg {...base} {...props}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v4h-4" />
  </svg>
)

export const IconTool = (props) => (
  <svg {...base} {...props}>
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6a2.1 2.1 0 0 0 3 3l5.7-5.7a4.5 4.5 0 0 0 5.6-6l-2.9 2.9-2.6-.7-.7-2.6 2.6-2.2Z" />
    <path d="M14 10l3-3 1 1 3-3-1-1-3 3-2-2" opacity="0.7" />
  </svg>
)

export const IconArrowLeft = (props) => (
  <svg {...base} {...props}>
    <path d="M20 12H4M11 5l-7 7 7 7" />
  </svg>
)

export const IconPackageOpen = (props) => (
  <svg {...base} {...props}>
    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
    <path d="M3 7l9 5 9-5M12 22V12" />
    <path d="M8 4.5l8 4.5M12 12v0" opacity="0" />
  </svg>
)
