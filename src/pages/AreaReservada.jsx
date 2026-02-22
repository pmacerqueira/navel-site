import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BUCKET = 'documentos'

function isFile(item) {
  return item.metadata?.mimetype != null || (item.metadata?.size != null && item.metadata?.size > 0)
}

export default function AreaReservada() {
  const { t } = useTranslation()
  const { user, signOut, isAdmin } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPath, setCurrentPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState(null)
  const [uploadFolder, setUploadFolder] = useState('')

  const [bucketMissing, setBucketMissing] = useState(false)

  const loadFiles = useCallback(async (path = '') => {
    if (!supabase) {
      setLoading(false)
      setError(t('auth.supabaseNotConfigured'))
      return
    }
    setLoading(true)
    setError(null)
    setBucketMissing(false)
    const { data, error: err } = await supabase.storage.from(BUCKET).list(path, { limit: 200 })
    setLoading(false)
    if (err) {
      const isBucketNotFound = err.message?.includes('Bucket not found') || err.message?.includes('not found')
      setBucketMissing(isBucketNotFound)
      setError(isBucketNotFound ? t('auth.bucketNotFound') : err.message)
      setFiles([])
      return
    }
    const items = (data || []).filter((f) => f.name && !f.name.startsWith('.'))
    setFiles(items)
  }, [t])

  const handleCreateBucket = async () => {
    if (!supabase || !isAdmin) return
    setUploading(true)
    setError(null)
    const { error: err } = await supabase.storage.createBucket(BUCKET, { public: false })
    setUploading(false)
    if (err) {
      setError(err.message)
      return
    }
    setBucketMissing(false)
    setError(null)
    loadFiles('')
  }

  useEffect(() => {
    loadFiles(currentPath)
  }, [currentPath, loadFiles])

  const handleDownload = async (path) => {
    if (!supabase) return
    const safePath = String(path || '').replace(/\.\./g, '').replace(/[\/\\]/g, '')
    if (!safePath) return
    const fullPath = currentPath ? `${currentPath}/${safePath}` : safePath
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleFolderClick = (name) => {
    const safe = String(name || '').replace(/\.\./g, '').replace(/[\/\\]/g, '')
    if (!safe) return
    setCurrentPath((p) => (p ? `${p}/${safe}` : safe))
  }

  const handleBack = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/'))
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !supabase || !isAdmin) return
    setUploading(true)
    setUploadFeedback(null)
    const folder = uploadFolder.trim().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').replace(/\.\./g, '')
    const basePath = currentPath ? `${currentPath}/` : ''
    const folderPath = folder ? `${folder}/` : ''
    const safeName = file.name.replace(/\.\./g, '').replace(/[\/\\]/g, '')
    if (!safeName) {
      setUploadFeedback({ type: 'error', msg: t('auth.uploadInvalidName') })
      setUploading(false)
      return
    }
    const uploadPath = `${basePath}${folderPath}${safeName}`
    if (uploadPath.includes('..')) {
      setUploadFeedback({ type: 'error', msg: t('auth.uploadInvalidName') })
      setUploading(false)
      return
    }
    const { error: err } = await supabase.storage.from(BUCKET).upload(uploadPath, file, { upsert: true })
    setUploading(false)
    e.target.value = ''
    if (err) {
      setUploadFeedback({ type: 'error', msg: err.message })
      return
    }
    setUploadFeedback({ type: 'success', msg: t('auth.uploadSuccess') })
    setUploadFolder('')
    loadFiles(currentPath)
    setTimeout(() => setUploadFeedback(null), 3000)
  }

  return (
    <div className="area-reservada-page">
      <section className="section">
        <div className="container">
        <div className="area-reservada">
          <div className="area-reservada__header">
            <div className="area-reservada__title-row">
              <h1>{t('auth.areaTitle')}</h1>
              {isAdmin && (
                <Link to="/admin" className="btn btn--outline btn--sm">{t('auth.adminPanel')}</Link>
              )}
            </div>
            <p className="text-muted">{t('auth.areaLead')}</p>
            <div className="area-reservada__user">
              <span>{user?.email ?? ''}</span>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => signOut()}>
                {t('auth.signOut')}
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="area-reservada__upload">
              <div className="area-reservada__upload-row">
                <input
                  type="text"
                  className="area-reservada__folder-input"
                  placeholder={t('auth.uploadFolderPlaceholder')}
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  disabled={uploading}
                />
                <label className="btn btn--outline btn--sm">
                  {uploading ? t('auth.loading') : t('auth.uploadFile')}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleUpload} disabled={uploading} hidden />
                </label>
              </div>
              <p className="area-reservada__upload-hint text-muted">{t('auth.uploadFolderHint')}</p>
              {currentPath && (
                <span className="area-reservada__path text-muted">/{currentPath}</span>
              )}
              {uploadFeedback && (
                <span className={uploadFeedback.type === 'success' ? 'area-reservada__feedback--ok' : 'area-reservada__feedback--err'}>
                  {uploadFeedback.msg}
                </span>
              )}
            </div>
          )}

          <div className="area-reservada__docs">
            {currentPath && (
              <button type="button" className="btn btn--outline btn--sm area-reservada__back" onClick={handleBack}>
                ← {t('auth.back')}
              </button>
            )}
            <h2>{t('auth.documentsTitle')}</h2>
            {error && (
              <div className="area-reservada__error" role="alert">
                {error}
                <p className="text-muted">{t('auth.bucketHint')}</p>
                {bucketMissing && isAdmin && (
                  <button type="button" className="btn btn--primary btn--sm" onClick={handleCreateBucket} disabled={uploading}>
                    {uploading ? t('auth.loading') : t('auth.createBucket')}
                  </button>
                )}
              </div>
            )}
            {loading && <p className="text-muted">{t('auth.loading')}</p>}
            {!loading && !error && files.length === 0 && (
              <p className="text-muted">{t('auth.noDocuments')}</p>
            )}
            {!loading && !error && files.length > 0 && (
              <ul className="doc-list">
                {files.map((item) => (
                  <li key={item.name} className="doc-list__item">
                    <span className="doc-list__name">
                      {item.metadata?.mimetype == null && item.name ? (
                        <button type="button" className="doc-list__folder" onClick={() => handleFolderClick(item.name)}>
                          📁 {item.name}
                        </button>
                      ) : (
                        item.name
                      )}
                    </span>
                    {isFile(item) && (
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => handleDownload(item.name)}>
                        {t('auth.download')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
    </div>
  )
}
