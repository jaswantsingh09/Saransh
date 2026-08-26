/**
 * Redesign design-system barrel.
 * Import shared chrome + primitives from here, e.g.
 *   import { Button, Card, TopBar } from '@/components/redesign';
 */
export { TitleBar } from './TitleBar';
export type { TitleBarProps } from './TitleBar';

export { SidebarRail } from './SidebarRail';
export type { SidebarRailProps, NavKey } from './SidebarRail';

export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';

export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Avatar, AvatarGroup } from './Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarGroupMember } from './Avatar';

export { Badge, badgeVariants } from './Badge';
export type { BadgeProps } from './Badge';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Toast } from './Toast';
export type { ToastProps } from './Toast';
