// Line icons drawn for MealCrafter: 24px grid, 1.75px ink stroke, no fills,
// so they sit with the wireframe look. Decorative by default (aria-hidden).
import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "fridge"
  | "calendar"
  | "user"
  | "chevron-left"
  | "chevron-right"
  | "plus"
  | "minus"
  | "video"
  | "camera"
  | "receipt"
  | "pencil"
  | "check"
  | "x"
  | "clock"
  | "info"
  | "snowflake"
  | "pan"
  | "undo"
  | "logout"
  | "eye-off"
  | "flash"
  | "alert";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9v10.5h4.5V15h3v4.5H18V9" />
    </>
  ),
  fridge: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M6 10h12M9 6v2M9 13v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.75 20c.9-3.6 3.8-5.5 7.25-5.5s6.35 1.9 7.25 5.5" />
    </>
  ),
  "chevron-left": <path d="M14.5 6 8.5 12l6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  video: (
    <>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.75L9.75 4h4.5l1.5 2h1.75A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.25-2 1.25-2-1.25-2 1.25-2-1.25-2 1.25z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  pencil: (
    <>
      <path d="m15 5 4 4L9 19H5v-4z" />
      <path d="m13 7 4 4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75v.5" />
    </>
  ),
  snowflake: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
  pan: (
    <>
      <path d="M3.5 11.5h13v1.5a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5z" />
      <path d="M16.5 12.5h4" />
    </>
  ),
  undo: (
    <>
      <path d="M8.5 7 4.5 11l4 4" />
      <path d="M4.5 11H14a5.5 5.5 0 0 1 0 11h-2" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5v15H14" />
      <path d="m16 8.5 3.5 3.5-3.5 3.5M19.5 12H10" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M3.5 12s3-6 8.5-6c1.6 0 3 .5 4.2 1.2M20.5 12s-3 6-8.5 6c-1.6 0-3-.5-4.2-1.2" />
      <path d="M4.5 4.5l15 15" />
    </>
  ),
  flash: <path d="M13 3 6 13.5h5.5L10.5 21 18 10.5h-5.5z" />,
  alert: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.5M12 17v.5" />
    </>
  ),
};

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
