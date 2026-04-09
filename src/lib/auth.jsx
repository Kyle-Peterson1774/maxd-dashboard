import { createContext, useContext, useState } from 'react'

// ============================================
// AUTH CONTEXT — Role-based access control
// Roles: admin | content | marketing | ops
// TODO: Replace mock with Firebase Auth
// ============================================

const AuthContext = createContext(null)

// Mock users — replace with Firebase when ready
const MOCK_USERS = {
  'kyle@trymaxd.com': {
    name: 'Kyle Peterson',
    email: 'kyle@trymaxd.com',
    role: 'admin',
    initials: 'KP',
  },
}

// Role permissions map — controls what each role sees
export const PERMISSIONS = {
  admin:     ['dashboard','social','scripts','content','launches','ads','products','analytics','sales','marketing','finance','operations','ai','settings'],
  content:   ['dashboard','social','scripts','content','analytics','ai'],
  marketing: ['dashboard','social','marketing','ads','analytics','sales'],
  ops:       ['dashboard','operations','sales','launches'],
}

export function AuthProvider({ children }) {
  // Default to admin for development — swap with Firebase login
  const [user, setUser] = useState(MOCK_USERS['kyle@trymaxd.com'])

  const hasAccess = (page) => {
    if (!user) return false
    return PERMISSIONS[user.role]?.includes(page) ?? false
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, hasAccess, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
