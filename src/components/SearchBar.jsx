import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BRANDS } from '../data/brands'
import { CATEGORY_KEYS, CATEGORY_IDS } from '../constants'

export default function SearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef(null)

  const q = query.trim().toLowerCase()
  const hasQuery = q.length >= 2

  const brandMatches = hasQuery
    ? BRANDS.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 6)
    : []
  const categoryMatches = hasQuery
    ? CATEGORY_KEYS.filter((_, i) => {
        const name = t(CATEGORY_KEYS[i].name).toLowerCase()
        return name.includes(q)
      }).map((_, i) => ({ key: CATEGORY_KEYS[i].name, id: CATEGORY_IDS[i] }))
    : []

  const hasResults = brandMatches.length > 0 || categoryMatches.length > 0
  const showDropdown = open && (hasQuery || focused) && (hasResults || hasQuery)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (brandMatches.length > 0) {
      navigate('/marcas')
      setOpen(false)
      setQuery('')
    } else if (categoryMatches.length > 0) {
      navigate('/produtos')
      setOpen(false)
      setQuery('')
    } else if (q) {
      navigate('/produtos')
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="search-bar" ref={containerRef}>
      <form
        className="search-bar__form"
        onSubmit={handleSubmit}
        role="search"
        aria-label={t('search.ariaLabel')}
      >
        <input
          type="search"
          className="search-bar__input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setFocused(true)
            setOpen(true)
          }}
          onBlur={() => setFocused(false)}
          aria-expanded={showDropdown}
          aria-controls="search-results"
          aria-autocomplete="list"
          autoComplete="off"
        />
        <button type="submit" className="search-bar__btn" aria-label={t('search.submit')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </form>
      {showDropdown && (
        <div id="search-results" className="search-bar__dropdown" role="listbox">
          {hasResults ? (
            <>
              {brandMatches.length > 0 && (
                <div className="search-bar__group">
                  <span className="search-bar__group-label">{t('search.brands')}</span>
                  {brandMatches.map((b) => (
                    <Link
                      key={b.id}
                      to="/marcas"
                      className="search-bar__item"
                      role="option"
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      {b.name}
                    </Link>
                  ))}
                </div>
              )}
              {categoryMatches.length > 0 && (
                <div className="search-bar__group">
                  <span className="search-bar__group-label">{t('search.categories')}</span>
                  {categoryMatches.map((c) => (
                    <Link
                      key={c.id}
                      to="/produtos"
                      className="search-bar__item"
                      role="option"
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      {t(c.key)}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="search-bar__empty">{t('search.noResults')}</div>
          )}
        </div>
      )}
    </div>
  )
}
