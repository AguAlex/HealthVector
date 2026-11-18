import { DarkModeRounded, LightModeRounded } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import type { ColorTheme } from '../utils/storage'

type Props = {
  theme: ColorTheme
  onToggle: () => void
  className?: string
}

export default function ThemeToggle({ theme, onToggle, className }: Props) {
  const targetTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip title={`Switch to ${targetTheme} mode`}>
      <IconButton
        className={className}
        onClick={onToggle}
        aria-label={`Switch to ${targetTheme} mode`}
      >
        {theme === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
      </IconButton>
    </Tooltip>
  )
}
