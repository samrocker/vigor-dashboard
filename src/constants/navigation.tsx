import { NavigationItem } from "@/types/sidebar";

export const navigationItems: NavigationItem[] = [
  {
    name: "User",
    path: "/users",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-user"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    name: "Admin",
    path: "/admin",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-shield-half"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    name: "Categories",
    path: "/category",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-tag"
      >
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L14.586 22.414a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828Z" />
        <path d="M7 7h.01" />
      </svg>
    ),
  },
  {
    name: "Subcategories",
    path: "/subcategory",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-tags"
      >
        <path d="M9 18H5a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2v-4l5.5-5.5L16.5 6.5l-4-4L2 12V20a2 2 0 0 0 2 2h4" />
        <path d="M7 10h.01" />
      </svg>
    ),
  },
  {
    name: "Orders",
    path: "/order",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-package"
      >
        <path d="m7.5 4.27 9 5.14" />
        <path d="M2.86 9.69a2 2 0 0 0 0 2.62l6.37 3.63a2 2 0 0 0 1.8 0l6.37-3.63a2 2 0 0 0 0-2.62L10.3 6.06a2 2 0 0 0-1.8 0Z" />
        <path d="m16.5 13.94 9 5.14" />
        <path d="m7.5 13.94 9 5.14" />
        <path d="m16.5 4.27 9 5.14" />
        <path d="M2.86 19.69a2 2 0 0 0 0 2.62l6.37 3.63a2 2 0 0 0 1.8 0l6.37-3.63a2 2 0 0 0 0-2.62L10.3 16.06a2 2 0 0 0-1.8 0Z" />
      </svg>
    ),
  },
  {
    name: "Images",
    path: "/image",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-image"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    name: "Products",
    path: "/product",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-package"
      >
        <path d="m7.5 4.27 9 5.14" />
        <path d="M2.86 9.69a2 2 0 0 0 0 2.62l6.37 3.63a2 2 0 0 0 1.8 0l6.37-3.63a2 2 0 0 0 0-2.62L10.3 6.06a2 2 0 0 0-1.8 0Z" />
        <path d="m16.5 13.94 9 5.14" />
        <path d="m7.5 13.94 9 5.14" />
        <path d="m16.5 4.27 9 5.14" />
        <path d="M2.86 19.69a2 2 0 0 0 0 2.62l6.37 3.63a2 2 0 0 0 1.8 0l6.37-3.63a2 2 0 0 0 0-2.62L10.3 16.06a2 2 0 0 0-1.8 0Z" />
      </svg>
    ),
  },
  {
    name: "Variants",
    path: "/variant",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-git-branch"
      >
        <path d="M6 3v12" />
        <path d="M18 9v12" />
        <path d="M12 3v7" />
        <path d="M6 15a6 6 0 0 0 6 6v-3" />
        <path d="M12 10a6 6 0 0 0 6-6V3" />
      </svg>
    ),
  },
  {
    name: "Carts",
    path: "/cart",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-shopping-cart"
      >
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    name: "Blogs",
    path: "/blog",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-text"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    name: "Settings",
    path: "/setting",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-settings"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 0-2 0l-.15-.08a2 2 0 0 0-2.73 2.73l.08.15a2 2 0 0 0 0 2l-.25.43a2 2 0 0 1-1.73 1H2a2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2h.18a2 2 0 0 1 1.73 1l.25.43a2 2 0 0 0 0 2l-.08.15a2 2 0 0 0 2.73 2.73l.15-.08a2 2 0 0 0 2 0l.43-.25a2 2 0 0 1 1-1.73V22a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 0 2 0l.15.08a2 2 0 0 0 2.73-2.73l-.08-.15a2 2 0 0 0 0-2l.25-.43a2 2 0 0 1 1.73-1H22a2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2h-.18a2 2 0 0 1-1.73-1l-.25-.43a2 2 0 0 0 0-2l.08-.15a2 2 0 0 0-2.73-2.73l-.15.08a2 2 0 0 0-2 0l-.43.25a2 2 0 0 1-1-1.73V2a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export const appItems: NavigationItem[] = [
  {
    name: "Webflow",
    path: "/webflow",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-webhook"
      >
        <path d="M18.7 10.3a2.41 2.41 0 0 0 0 3.4l2.6 2.6a2.41 2.41 0 0 0 3.4 0 2.41 2.41 0 0 0 0-3.4l-2.6-2.6a2.41 2.41 0 0 0-3.4 0Z" />
        <path d="M7.3 13.7a2.41 2.41 0 0 0 0-3.4l-2.6-2.6a2.41 2.41 0 0 0-3.4 0 2.41 2.41 0 0 0 0 3.4l2.6 2.6a2.41 2.41 0 0 0 3.4 0Z" />
        <path d="M13.7 7.3a2.41 2.41 0 0 0-3.4 0l-2.6 2.6a2.41 2.41 0 0 0 0 3.4 2.41 2.41 0 0 0 3.4 0l2.6-2.6a2.41 2.41 0 0 0 0-3.4Z" />
        <path d="m10.3 18.7a2.41 2.41 0 0 0 3.4 0l2.6-2.6a2.41 2.41 0 0 0 0-3.4 2.41 2.41 0 0 0-3.4 0l-2.6 2.6a2.41 2.41 0 0 0 0 3.4Z" />
      </svg>
    ),
  },
  {
    name: "Framer",
    path: "/framer",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-layout"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="9" x2="9" y1="21" y2="9" />
      </svg>
    ),
  },
  {
    name: "Typeform",
    path: "/typeform",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-form-input"
      >
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <path d="M12 12h.01" />
        <path d="M17 12h.01" />
        <path d="M7 12h.01" />
      </svg>
    ),
  },
];
