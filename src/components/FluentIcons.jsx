/**
 * Ícones Fluent UI (família usada em M365 / Copilot) — um tamanho e cor coerentes via currentColor.
 */
import {
  Add20Regular,
  ArrowDownload20Regular,
  ArrowLeft20Regular,
  ArrowSync20Regular,
  ArrowUpload20Regular,
  Chat20Regular,
  ChevronDown20Regular,
  Cloud20Regular,
  CloudArrowDown20Regular,
  CloudArrowUp20Regular,
  Attach20Regular,
  DocumentPdf20Regular,
  DocumentText20Regular,
  Folder20Regular,
  FolderOpen20Regular,
  Heart20Filled,
  Heart20Regular,
  Image20Regular,
  MoreHorizontal20Regular,
  Search20Regular,
  Share20Regular,
  Camera20Regular,
  WrenchScrewdriver20Regular,
} from '@fluentui/react-icons'

function wrap(Icon) {
  return function FluentIconWrapped({
    size = 20,
    className = '',
    style,
    title,
    ...rest
  }) {
    return (
      <Icon
        className={['navel-fluent-icon', className].filter(Boolean).join(' ')}
        title={title}
        style={{ fontSize: size, verticalAlign: 'middle', ...style }}
        {...rest}
      />
    )
  }
}

export const IconAdd = wrap(Add20Regular)
export const IconArrowDownload = wrap(ArrowDownload20Regular)
export const IconArrowLeft = wrap(ArrowLeft20Regular)
export const IconArrowSync = wrap(ArrowSync20Regular)
export const IconArrowUpload = wrap(ArrowUpload20Regular)
export const IconCamera = wrap(Camera20Regular)
export const IconChat = wrap(Chat20Regular)
export const IconChevronDown = wrap(ChevronDown20Regular)
export const IconCloud = wrap(Cloud20Regular)
export const IconCloudArrowDown = wrap(CloudArrowDown20Regular)
export const IconCloudArrowUp = wrap(CloudArrowUp20Regular)
export const IconAttach = wrap(Attach20Regular)
export const IconDocumentPdf = wrap(DocumentPdf20Regular)
export const IconDocumentText = wrap(DocumentText20Regular)
export const IconFolder = wrap(Folder20Regular)
export const IconFolderOpen = wrap(FolderOpen20Regular)
export const IconHeart = wrap(Heart20Regular)
export const IconHeartFilled = wrap(Heart20Filled)
export const IconImage = wrap(Image20Regular)
export const IconMoreHorizontal = wrap(MoreHorizontal20Regular)
export const IconSearch = wrap(Search20Regular)
export const IconShare = wrap(Share20Regular)
export const IconWrenchScrewdriver = wrap(WrenchScrewdriver20Regular)

export function IconFileType({ type, size = 22, className = '' }) {
  const p = { size, className, 'aria-hidden': true }
  switch (type) {
    case 'pdf':
      return <IconDocumentPdf {...p} />
    case 'image':
      return <IconImage {...p} />
    case 'document':
      return <IconDocumentText {...p} />
    default:
      return <IconAttach {...p} />
  }
}
