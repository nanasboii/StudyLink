export const formatDateDisplay = (value, fallback = '') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString()
}

export const formatDateValue = (value, fallback = '', locale, formatOptions) => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString(locale, formatOptions)
}

export const formatDateTimeValue = (value, fallback = '', locale, formatOptions) => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString(locale, formatOptions)
}

export const normalizeAssetUrl = (rawUrl) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`
}

export const normalizeTutorVerification = (item) => ({
  id: item.id,
  courseCode: item.course_code || item.courseCode || 'Unspecified Subject',
  status: String(item.status || 'PENDING').toUpperCase(),
  createdAt: formatDateDisplay(item.created_at, 'Unknown date'),
  reviewNotes: item.review_notes || item.reviewNotes || '',
  proofUrl: item.proof_url || item.proofUrl || ''
})

export const normalizeAdminVerification = (item) => ({
  id: item.id,
  userName: item.user_name || item.tutor_name || item.userName || item.tutorName || 'Unknown',
  courseCode: item.course_code || item.courseCode || '',
  createdAt: formatDateDisplay(item.created_at, ''),
  status: String(item.status || 'PENDING').toUpperCase(),
  documentUrl: item.document_url || item.documentUrl || '',
  reviewNotes: item.review_notes || item.reviewNotes || '',
  proofUrl: item.proof_url || item.proofUrl || '',
  hasProofFile: Boolean(item.has_proof_file ?? item.hasProofFile)
})

export const normalizeAdminReview = (item) => ({
  id: item.id,
  reviewType: String(item.review_type || item.reviewType || 'review').toLowerCase(),
  rating: Number(item.rating || 0),
  comment: item.comment || '',
  createdAt: item.created_at || item.createdAt || '',
  reviewerName: item.reviewer_name || item.reviewerName || 'Anonymous',
  reviewerRole: item.reviewer_role || item.reviewerRole || '',
  subjectId: item.subject_id || item.subjectId || '',
  subjectTitle: item.subject_title || item.subjectTitle || '',
  subjectMeta: item.subject_meta || item.subjectMeta || '',
  sourceLabel: item.source_label || item.sourceLabel || ''
})

export const normalizeNotification = (item) => ({
  id: item.id,
  message: item.message,
  isRead: Boolean(item.is_read ?? item.isRead),
  createdAt: item.created_at ?? item.createdAt
})

const badgeIconByCode = {
  first_steps: '/assets/badges/first-steps.svg',
  helping_hand: '/assets/badges/helping-hand.svg',
  campus_mentor: '/assets/badges/campus-mentor.svg',
  community_builder: '/assets/badges/community-builder.svg',
  rising_contributor: '/assets/badges/rising-contributor.svg',
  studylink_champion: '/assets/badges/studylink-champion.svg',
  welcome_aboard: '/assets/badges/welcome-aboard.svg',
  rising_star: '/assets/badges/rising-star.svg',
  knowledge_titan: '/assets/badges/knowledge-titan.svg',
  elite_scholar: '/assets/badges/elite-scholar.svg',
  studylink_legend: '/assets/badges/studylink-legend.svg',
  points_15: '/assets/badges/first-steps.svg',
  points_50: '/assets/badges/helping-hand.svg',
  points_100: '/assets/badges/campus-mentor.svg',
  points_175: '/assets/badges/community-builder.svg',
  points_250: '/assets/badges/studylink-champion.svg'
}

export const resolveBadgeIcon = (item) => {
  const code = String(item.code || '').toLowerCase().trim()
  if (badgeIconByCode[code]) return badgeIconByCode[code]
  const iconFromApi = String(item.iconUrl || item.icon_url || '').trim()
  if (iconFromApi) {
    if (iconFromApi.startsWith('http://') || iconFromApi.startsWith('https://')) return iconFromApi
    const cleanPath = iconFromApi
      .replace(/^\.\//, '')
      .replace(/^\/ui\//, '/')
      .replace(/^public\//, '')
    return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  }
  return '/assets/badges/first-steps.svg'
}

export const normalizeAchievement = (item) => ({
  code: String(item.code || ''),
  name: String(item.name || 'Achievement'),
  description: String(item.description || ''),
  pointsRequired: Number(item.pointsRequired ?? item.points_required ?? 0),
  iconUrl: resolveBadgeIcon(item),
  isUnlocked: Boolean(item.isUnlocked ?? item.is_unlocked)
})

export const normalizeRewardRule = (item) => ({
  code: item.code,
  name: item.name,
  description: item.description || '',
  pointsCost: Number(item.pointsCost || 0),
  isActive: Boolean(item.isActive),
  cooldownDays: Number(item.cooldownDays || 0),
  maxPer30Days: Number(item.maxPer30Days || 1),
  maxPerDay: Number(item.maxPerDay || 1),
  defaultCooldownDays: Number(item.defaultCooldownDays || 0),
  defaultMaxPer30Days: Number(item.defaultMaxPer30Days || 1),
  defaultMaxPerDay: Number(item.defaultMaxPerDay || 1),
  isCustom: Boolean(item.isCustom),
  isSaving: false
})

export const normalizeRewardActivity = (row) => {
  const details = row.details && typeof row.details === 'object' ? row.details : {}
  const action = String(row.action || 'reward_rule_updated')
  return {
    id: row.id,
    action,
    actionLabel: action === 'reward_rule_reset' ? 'Reset' : 'Updated',
    adminName: row.admin_name || row.admin_email || 'Admin',
    createdAt: row.created_at,
    rewardCode: details.rewardCode || 'UNKNOWN',
    cooldownDays: Number(details.cooldownDays || 0),
    maxPer30Days: Number(details.maxPer30Days || 0),
    maxPerDay: Number(details.maxPerDay || 0)
  }
}

export const normalizeTutor = (row) => {
  const availability = Array.isArray(row?.availability)
    ? row.availability.map((slot) => ({
        courseCode: slot?.courseCode ?? slot?.course_code ?? '',
        dayOfWeek: slot?.dayOfWeek ?? slot?.day_of_week ?? '',
        startTime: slot?.startTime ?? slot?.start_time ?? '',
        endTime: slot?.endTime ?? slot?.end_time ?? ''
      }))
    : []

  return {
    id: row?.id,
    // FIX → handle both snake_case (raw DB) and camelCase (sanitizePublicTutor output)
    full_name: row?.full_name ?? row?.fullName ?? 'Unknown Tutor',
    major: row?.major ?? '',
    year_of_study: row?.year_of_study ?? row?.yearOfStudy ?? null,
    expertise: Array.isArray(row?.expertise) ? row.expertise : [],
    bio: row?.bio ?? '',
    rating: Number(row?.rating ?? 0),
    total_points: Number(row?.total_points ?? row?.totalPoints ?? 0),
    is_verified: Boolean(row?.is_verified ?? row?.isVerified),
    profile_picture_url: row?.profile_picture_url ?? row?.profilePictureUrl ?? '',
    // FIX → preserve matchScore from recommended endpoint
    matchScore: row?.matchScore ?? 0,
    availability
  }
}

// FIX → normalizeUserProfile was missing yearOfStudy, expertise, targetSubjects
// These fields are stripped after every save/load — root cause of "saved but not displayed"
export const normalizeUserProfile = (user) => ({
  fullName:
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    '',
  email:          user.email          || '',
  phoneNumber:    user.phoneNumber    || user.phone_number    || '',
  major:          user.major          || '',
  bio:            user.bio            || '',
  studentId:      user.studentId      || user.student_id      || '',
  role:           user.role           || '',
  points:         Number(user.totalPoints ?? user.points ?? 0),
  rating:         Number(user.rating  || 0),
  isVerified:     Boolean(user.isVerified ?? user.is_verified),
  profilePicture: normalizeAssetUrl(
    user.profilePictureUrl || user.profile_picture_url || user.profilePicture || user.profile_picture || ''
  ),
  // FIX → these three fields were completely missing — caused silent data loss on every save
  yearOfStudy:    user.yearOfStudy    ?? user.year_of_study    ?? null,
  targetSubjects: user.targetSubjects ?? user.target_subjects  ?? '',
  expertise:      Array.isArray(user.expertise) ? user.expertise : [],
})