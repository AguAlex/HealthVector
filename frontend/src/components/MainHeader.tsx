import { Avatar, IconButton, Tooltip } from '@mui/material'
import { MenuRounded, NotificationsNoneRounded } from '@mui/icons-material'
import type { User } from '../types'
import type { ColorTheme } from '../utils/storage'
import ThemeToggle from './ThemeToggle'

type Props = {
  user: User
  now: Date
  theme: ColorTheme
  dueCount: number
  onToggleTheme: () => void
  onMenuClick: () => void
  onSignOut: () => void
  onOpenSchedule: () => void
}

export default function MainHeader({
  user, now, theme, dueCount, onToggleTheme, onMenuClick, onSignOut, onOpenSchedule,
}: Props) {
  return (
    <header className="main-header">
      <div className="header-brand">
        <IconButton className="mobile-menu-button" onClick={onMenuClick} aria-label="Open menu">
          <MenuRounded />
        </IconButton>
        <a href="/" className="brand-mark" aria-label="HealthVector home">
          <span className="brand-icon">+</span>
          <span>HealthVector</span>
        </a>
      </div>
      <div className="header-actions">
        <span className="header-date">{new Intl.DateTimeFormat('en', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(now)}</span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="header-icon-button" />
        <Tooltip title={dueCount ? `${dueCount} dose time${dueCount === 1 ? '' : 's'} reached` : 'Notifications'}>
          <IconButton className="header-icon-button" aria-label="Dose alerts" onClick={onOpenSchedule}>
            <NotificationsNoneRounded />
            {dueCount > 0 && <span className="due-badge">{dueCount}</span>}
          </IconButton>
        </Tooltip>
        <button className="profile-button" onClick={onSignOut} title="Sign out" aria-label="Sign out of HealthVector">
          <Avatar className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</Avatar>
          <span className="profile-name">{user.email}</span>
        </button>
      </div>
    </header>
  )
}
