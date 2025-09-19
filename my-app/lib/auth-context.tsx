"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { api } from "./api" // Use the helper object
import { useRouter } from "next/navigation"

// --- TypeScript Interfaces ---
export type UserRole = "principal" | "teacher" | "student"

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  profile?: {
    phone?: string
    address?: string
    class_name?: string
    subject?: string
  }
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start loading on initial mount
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // This effect runs once on initial app load to check for an existing session
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem("access_token")

      if (accessToken) {
        try {
          // A token exists. We must validate it with the backend to get fresh user data.
          // The apiClient will automatically use the token from localStorage here.
          const response = await api.auth.getCurrentUser()
          if (response.success && response.data) {
            setUser(response.data)
          } else {
            // The token is invalid or expired, so log the user out.
            api.auth.logout() // This clears tokens from apiClient and localStorage
            setUser(null)
          }
        } catch (error) {
          console.error("Auth validation failed:", error)
          api.auth.logout()
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  // This is the core login logic
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // The `api.auth.login` function handles the API call AND saving the tokens inside the apiClient.
      // This is the most critical step.
      const response = await api.auth.login(username, password)

      if (response.success && response.data) {
        // If login is successful, the tokens are now stored in the apiClient instance.
        // Now, we can update our React state with the user object.
        setUser(response.data.user)
        setIsLoading(false)
        router.push("/") // Redirect to the dashboard page
        return true
      } else {
        // Handle login failure from the API (e.g., wrong password)
        setError(response.message || "Invalid credentials. Please try again.")
        setIsLoading(false)
        return false
      }
    } catch (err) {
      console.error("Login process error:", err)
      setError("A network error occurred. Please try again.")
      setIsLoading(false)
      return false
    }
  }

  // This is the core logout logic
  const logout = async () => {
    await api.auth.logout() // Tell backend to invalidate the token and clear local tokens
    setUser(null)
    router.push("/") // Redirect to the login page
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}