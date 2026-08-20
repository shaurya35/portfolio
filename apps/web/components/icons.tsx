import type { SVGProps } from "react";
import type { SocialIconName } from "@/types/site";

type IconProps = SVGProps<SVGSVGElement>;

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M208,216H160L48,40H96Z" opacity={0.2} />
      <path d="M214.75,211.71l-62.6-98.38,61.77-67.95a8,8,0,0,0-11.84-10.76L143.24,99.34,102.75,35.71A8,8,0,0,0,96,32H48a8,8,0,0,0-6.75,12.3l62.6,98.37-61.77,68a8,8,0,1,0,11.84,10.76l58.84-64.72,40.49,63.63A8,8,0,0,0,160,224h48a8,8,0,0,0,6.75-12.29ZM164.39,208,62.57,48h29L193.43,208Z" />
    </svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path
        d="M224,40V216a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8H216A8,8,0,0,1,224,40Z"
        opacity={0.2}
      />
      <path d="M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24Zm0,192H40V40H216V216ZM96,112v64a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm88,28v36a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140ZM100,84A12,12,0,1,1,88,72,12,12,0,0,1,100,84Z" />
    </svg>
  );
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path
        d="M208,104v8a48,48,0,0,1-48,48H136a32,32,0,0,1,32,32v40H104V192a32,32,0,0,1,32-32H112a48,48,0,0,1-48-48v-8a49.28,49.28,0,0,1,8.51-27.3A51.92,51.92,0,0,1,76,32a52,52,0,0,1,43.83,24h32.34A52,52,0,0,1,196,32a51.92,51.92,0,0,1,3.49,44.7A49.28,49.28,0,0,1,208,104Z"
        opacity={0.2}
      />
      <path d="M208.3,75.68A59.74,59.74,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58,58,0,0,0,208.3,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.76,41.76,0,0,1,200,104Z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M224,56l-96,88L32,56Z" opacity={0.2} />
      <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M3 9.5h18M8 3v3M16 3v3" />
    </svg>
  );
}

const ARROW_PATH =
  "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z";

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d={ARROW_PATH} />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path transform="scale(-1,1) translate(-256,0)" d={ARROW_PATH} />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17.5" cy="6" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
      <path strokeLinecap="round" d="M8.2 10.8 15.3 7.2M8.2 13.2l7.1 3.6" />
    </svg>
  );
}

export function MediumIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <circle cx="72" cy="128" r="52" />
      <ellipse cx="164" cy="128" rx="30" ry="52" />
      <ellipse cx="222" cy="128" rx="14" ry="52" />
    </svg>
  );
}

export function NativeIcon(props: IconProps) {
  // A pencil, not a document. This renders at 12px beside the category label,
  // and the previous file-with-three-text-lines glyph carried far too much
  // detail to survive at that size — the strokes collapsed into a grey smudge.
  // Two strokes read cleanly when small, and "written here" distinguishes an
  // original post from the X / Medium logos used for syndicated ones.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7.5 18.5l-4 1 1-4Z" />
      <path d="M14.5 5.5l3 3" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path
        d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,112a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"
        opacity={0.2}
      />
      <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
    </svg>
  );
}

export function EyeSlashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path
        d="M74,68.51C36.68,89.62,16.52,124.19,16,128s32,72,112,72a114.24,114.24,0,0,0,45.24-9.12L74,68.51Z"
        opacity={0.2}
      />
      <path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.4,127.4,0,0,0,52.07-10.9l21.61,23.78a8,8,0,1,0,11.84-10.76Zm47.55,52.22,50.6,55.65a32,32,0,0,1-50.6-55.65ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,65.61,65.61l14.03,15.44A112,112,0,0,1,128,192Zm6.53-116.13a8,8,0,0,1,3.9-15.87,90.32,90.32,0,0,1,68.68,39.42,133.46,133.46,0,0,1,23.11,30.58,8,8,0,0,1,0,6.5c-.29.65-6.11,13.6-18.15,28.28a8,8,0,0,1-12.36-10.16c8.05-9.79,13.16-19,15.65-24.19a133.33,133.33,0,0,0-19-24.34C176.85,71.5,157.66,58.86,134.53,75.87Z" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...props}
    >
      <path
        strokeLinecap="round"
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      />
      <path
        strokeLinecap="round"
        d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
      />
      <path strokeLinecap="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

export const socialIcons: Record<
  SocialIconName,
  (props: IconProps) => React.JSX.Element
> = {
  x: XIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  medium: MediumIcon,
  mail: MailIcon,
};
