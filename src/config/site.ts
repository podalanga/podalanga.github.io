export const site = {
  name: 'Podalanga',
  title: 'Podalanga — Joshua John L',
  tagline: 'I build machines that balance, swim and see.',
  description:
    'Robotics & control-systems engineer — NIT Trichy ICE + IIT Madras BS Data Science. Case files, archive and field log.',
  url: 'https://podalanga.github.io',
  email: 'joshuajohn.nitt@gmail.com',
  socials: {
    github: 'https://github.com/podalanga',
    linkedin: 'https://www.linkedin.com/in/joshuajohnl/',
  },
  nav: [
    { label: 'INDEX', index: '00', href: '/' },
    { label: 'PROFILE', index: '01', href: '/profile' },
    { label: 'ARCHIVE', index: '02', href: '/archive' },
    { label: 'BLOG', index: '03', href: '/blog' },
  ],
  // epoch for the UPTIME telemetry counter — start of work history
  epoch: '2023-08-01T00:00:00+05:30',
  telemetry: {
    coords: [
      { label: 'NIT Trichy', value: '10.7589°N 78.8132°E' },
      { label: 'EPFL', value: '46.5191°N 6.5668°E' },
      { label: 'IIT Madras', value: '12.9915°N 80.2336°E' },
    ],
  },
} as const;
