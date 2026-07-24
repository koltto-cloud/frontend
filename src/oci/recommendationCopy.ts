import type { TFunction } from 'i18next'

/** Recommendation kinds returned by the OCI recommendations API. */
export type RecommendationKind =
  | 'idle'
  | 'oversized'
  | 'overutilized'
  | 'idle_storage'
  | 'idle_lb'
  | 'unattached_volume'

/**
 * Localized "what to do" copy for a recommendation.
 * Backend still returns English `recommendation` text; we prefer kind-based i18n.
 */
export function recommendationAdvice(
  t: TFunction,
  item: {
    kind: string
    resource_type?: string | null
    resource_id?: string | null
    recommendation?: string | null
  },
): string {
  const rid = item.resource_id ?? ''
  const isBoot = rid.includes('.bootvolume.')

  switch (item.kind as RecommendationKind) {
    case 'idle':
      return t('recommendations.advice.idle')
    case 'oversized':
      return t('recommendations.advice.oversized')
    case 'overutilized':
      return t('recommendations.advice.overutilized')
    case 'idle_lb':
      return t('recommendations.advice.idleLb')
    case 'unattached_volume':
      return t(
        isBoot
          ? 'recommendations.advice.unattachedBoot'
          : 'recommendations.advice.unattachedBlock',
      )
    case 'idle_storage':
      if (item.resource_type === 'file_storage') {
        return t('recommendations.advice.idleFileSystem')
      }
      return t(
        isBoot
          ? 'recommendations.advice.idleBootVolume'
          : 'recommendations.advice.idleVolume',
      )
    default:
      return item.recommendation?.trim() || t('common.emDash')
  }
}
