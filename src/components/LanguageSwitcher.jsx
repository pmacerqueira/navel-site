import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../constants'
import { changeLanguage } from '../i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null)
  const ref = useRef(null)

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  async function handleSelect(code) {
    if (code === i18n.language) {
      setOpen(false)
      return
    }
    setLoading(code)
    try {
      await changeLanguage(code)
      setOpen(false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="lang-switcher" ref={ref} role="group" aria-label={t('language.label')}>
      <button
        type="button"
        className="lang-switcher__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('language.label')}
        title={t(current.labelKey)}
      >
        <img src={current.flag} alt="" className="lang-switcher__flag" aria-hidden="true" width="24" height="17" />
      </button>
      {open && (
        <ul className="lang-switcher__dropdown" role="listbox" aria-label={t('language.label')}>
          {LANGUAGES.map(({ code, labelKey, flag }) => (
            <li key={code} role="option" aria-selected={i18n.language === code}>
              <button
                type="button"
                className={'lang-switcher__option' + (i18n.language === code ? ' lang-switcher__option--active' : '')}
                onClick={() => handleSelect(code)}
                disabled={loading === code}
                lang={code}
                title={t(labelKey)}
                aria-label={t(labelKey)}
              >
                <img src={flag} alt="" className="lang-switcher__flag" width="24" height="17" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
