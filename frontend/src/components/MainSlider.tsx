import {
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  ChatBubbleOutlineRounded,
  DashboardRounded,
  FavoriteRounded,
  MedicationOutlined,
} from '@mui/icons-material'
import type { AppPage } from '../types'

type Props = {
  activePage: AppPage
  onNavigate: (page: AppPage) => void
  open: boolean
  onClose: () => void
}

const navigation: { id: AppPage; label: string; icon: typeof DashboardRounded }[] = [
  { id: 'overview', label: 'Overview', icon: DashboardRounded },
  { id: 'schedule', label: 'My schedule', icon: CalendarMonthRounded },
  { id: 'medications', label: 'Medications', icon: MedicationOutlined },
  { id: 'assistant', label: 'AI assistant', icon: ChatBubbleOutlineRounded },
]

export default function MainSlider({ activePage, onNavigate, open, onClose }: Props) {
  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close menu" />}
      <aside className={`main-slider ${open ? 'is-open' : ''}`}>
        <div className="sidebar-section-label">MENU</div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-link ${activePage === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id)
                onClose()
              }}
            >
              <Icon fontSize="small" />
              <span>{label}</span>
              {id === 'schedule' && <span className="sidebar-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help-card">
            <div className="help-sparkle"><AutoAwesomeRounded fontSize="small" /></div>
            <strong>Need a hand?</strong>
            <p>Your medication routine, made a little easier.</p>
            <button onClick={() => {
              onNavigate('assistant')
              onClose()
            }}>Ask the assistant <ArrowForwardRounded fontSize="small" /></button>
          </div>
          <div className="sidebar-footer">A little more care, every day <FavoriteRounded fontSize="small" /></div>
        </div>
      </aside>
    </>
  )
}
