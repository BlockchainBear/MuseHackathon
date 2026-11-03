"use client";

import React from "react";

type P = { className?: string };

function Base({ children, className = "h-4 w-4" }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const MapIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </Base>
);

export const MapPinIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Base>
);

export const SparklesIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />
    <path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" />
  </Base>
);

export const ImageIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M4 18l5-5 3 3 3-3 5 5" />
  </Base>
);

export const UsersIcon = ({ className }: P) => (
  <Base className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 15.2c2.6.3 4.5 2 4.5 4.8" />
  </Base>
);

export const CompassIcon = ({ className }: P) => (
  <Base className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-2 5-4 1 2-5z" />
  </Base>
);

export const CheckSquareIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8.5 12.5l2.5 2.5 5-5.5" />
  </Base>
);

export const BoxIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </Base>
);

export const MessageIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5z" />
  </Base>
);

export const BookIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
    <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
  </Base>
);

export const PencilIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
  </Base>
);

export const RefreshIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 3v4h-4" />
  </Base>
);

export const ZapIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </Base>
);

export const SaveIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M5 3h12l4 4v14H5z" />
    <path d="M8 3v5h8V3" />
    <path d="M8 21v-8h8v8" />
  </Base>
);

export const FolderIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Base>
);

export const FileIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </Base>
);

export const ArchiveIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="3" y="4" width="18" height="5" rx="1" />
    <path d="M5 9v11h14V9" />
    <path d="M10 13h4" />
  </Base>
);

export const PrinterIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </Base>
);

export const DownloadIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 3v12" />
    <path d="M6 11l6 6 6-6" />
    <path d="M4 21h16" />
  </Base>
);

export const UploadIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 21V9" />
    <path d="M6 13l6-6 6 6" />
    <path d="M4 3h16" />
  </Base>
);

export const LinkIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </Base>
);

export const LayoutGridIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Base>
);

export const EyeIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const CopyIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Base>
);

export const TrashIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 14h10l1-14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Base>
);

export const PlusIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Base>
);

export const XIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Base>
);

export const CheckIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Base>
);

export const AlertIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.5" />
  </Base>
);

export const ClockIcon = ({ className }: P) => (
  <Base className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const ArrowLeftIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Base>
);

export const ChevronDownIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const HorizonIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M3 13a9 9 0 0 1 18 0" />
    <rect x="2" y="13" width="20" height="7" rx="3.5" />
    <circle cx="9" cy="16.5" r="1" />
    <circle cx="15" cy="16.5" r="1" />
  </Base>
);

export const RobloxIcon = ({ className }: P) => (
  <Base className={className}>
    <rect x="6" y="6" width="12" height="12" rx="1" transform="rotate(12 12 12)" />
    <rect x="10.4" y="10.4" width="3.2" height="3.2" transform="rotate(12 12 12)" />
  </Base>
);

export const FortniteIcon = ({ className }: P) => (
  <Base className={className}>
    <path d="M6 3h12v4h-3v3h3v4h-3v7l-4-4v-3H8v-3h3V7H6z" />
  </Base>
);
