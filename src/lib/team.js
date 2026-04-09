// ============================================
// TEAM ROSTER
// Shared across Scripts (Assigned To) and
// Settings (team management).
// ============================================

const TEAM_KEY = 'maxd_team'

const DEFAULT_TEAM = [
  { id: 'kyle', name: 'Kyle Peterson', email: 'kyle@trymaxd.com', role: 'admin', initials: 'KP', color: '#DC2626' },
]

export function getTeam() {
  try {
    const raw = localStorage.getItem(TEAM_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_TEAM
  } catch { return DEFAULT_TEAM }
}

export function saveTeam(team) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team))
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const MEMBER_COLORS = ['#DC2626','#2563EB','#7C3AED','#059669','#D97706','#DB2777','#0891B2']
export function memberColor(id) {
  const idx = Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % MEMBER_COLORS.length
  return MEMBER_COLORS[idx]
}
