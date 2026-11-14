import { Avatar, IconButton, Tooltip } from '@mui/material'
import { MenuRounded, NotificationsNoneRounded } from '@mui/icons-material'
import type { User } from '../types'

type Props = {
  user: User
  now: Date
  onMenuClick: () => void
  onSignOut: () => void
}

export default function MainHeader({ user, now, onMenuClick, onSignOut }: Props) {
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
        <Tooltip title="Notifications">
          <IconButton className="header-icon-button" aria-label="Notifications">
            <NotificationsNoneRounded />
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
