import { useTranslation } from 'react-i18next'
import { MANUT_DASHBOARD_URL } from '../constants'

export default function NavelDashboardButton() {
  const { t } = useTranslation()
  return (
    <a
      href={MANUT_DASHBOARD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="navel-dashboard-btn"
      aria-label={t('navelDashboard.ariaLabel')}
      title={t('navelDashboard.title')}
    >
      <span className="navel-dashboard-btn__tooltip">{t('navelDashboard.title')}</span>
      <img
        src="/images/navel-icon.png"
        alt=""
        aria-hidden="true"
        width="32"
        height="32"
        className="navel-dashboard-btn__icon"
      />
    </a>
  )
}
