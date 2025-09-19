"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { Loader2, GraduationCap, Eye, EyeOff, Mail, User } from "lucide-react"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [inputType, setInputType] = useState<"username" | "email">("username")
  const [schoolConfig, setSchoolConfig] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const { login, isLoading, error: authError } = useAuth()

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError("")
  }, [username, password])

  // Clear auth error when component mounts
  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  // Load remember me state from localStorage
  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe")
    if (remembered === "true") {
      setRememberMe(true)
      const savedUsername = localStorage.getItem("savedUsername")
      if (savedUsername) {
        setUsername(savedUsername)
        setInputType(savedUsername.includes("@") ? "email" : "username")
      }
    }
  }, [])

  // Fetch school configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/config/`)
        if (response.ok) {
          const config = await response.json()
          setSchoolConfig(config)
        }
      } catch (error) {
        console.error("Failed to fetch school config:", error)
        // Use default config if fetch fails
        setSchoolConfig({
          login_methods: ['username', 'email'],
          branding: {
            school_name: 'School Management System',
            logo_url: null,
            primary_color: '#3b82f6',
            secondary_color: '#64748b'
          },
          features: {
            remember_login: true,
            password_reset: true,
            rate_limiting: true
          }
        })
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
    return usernameRegex.test(username)
  }

  const detectInputType = (input: string): "username" | "email" => {
    return input.includes("@") ? "email" : "username"
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setInputType(detectInputType(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate required fields
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields")
      return
    }

    // Validate input format
    if (inputType === "email" && !validateEmail(username)) {
      setError("Please enter a valid email address")
      return
    }

    if (inputType === "username" && !validateUsername(username)) {
      setError("Username must be 3-20 alphanumeric characters")
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    // Handle remember me
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true")
      localStorage.setItem("savedUsername", username)
    } else {
      localStorage.removeItem("rememberMe")
      localStorage.removeItem("savedUsername")
    }

    const success = await login(username, password)
    if (!success) {
      setError(authError || "Invalid credentials. Please try again.")
    }
  }


  const handleForgotPassword = async () => {
    if (!username.trim()) {
      setError("Please enter your email address or username first")
      return
    }

    if (inputType === "email" && !validateEmail(username)) {
      setError("Please enter a valid email address")
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/auth/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: username }),
      })

      const data = await response.json()

      if (response.ok) {
        setError("")
        alert(data.message || `Password reset link sent to ${username}. Please check your email.`)
      } else {
        setError(data.message || "Failed to send password reset link. Please try again.")
      }
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        <div className="text-center animate-slide-up">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl shadow-xl animate-bounce-in">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-2">
            {configLoading ? "School Portal" : (schoolConfig?.branding?.school_name || "School Portal")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {configLoading ? "Secure access to your educational dashboard" : `Welcome to ${schoolConfig?.branding?.school_name || "School Management System"}`}
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-white/20 dark:border-slate-700/20 shadow-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access the school management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {inputType === "email" ? (
                    <>
                      <Mail className="h-4 w-4" />
                      Email Address
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      Username
                    </>
                  )}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={inputType === "email" ? "Enter your email address" : "Enter your username"}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  disabled={isLoading}
                  autoComplete={inputType === "email" ? "email" : "username"}
                  className="h-12 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                />
                {username && (
                  <p className="text-xs text-muted-foreground">
                    Detected as {inputType === "email" ? "email" : "username"}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-12 pr-12 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox - conditionally shown */}
              {(!configLoading && schoolConfig?.features?.remember_login !== false) && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={isLoading}
                    className="border-slate-300 dark:border-slate-600"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Remember me for 30 days
                  </Label>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 animate-fade-in">
                  <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Signing you in...
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Sign In</span>
                  </>
                )}
              </Button>

            </form>

            {/* Forgot password link - conditionally shown */}
            {(!configLoading && schoolConfig?.features?.password_reset !== false) && (
              <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Demo Login Buttons */}
            <div className="mt-6 space-y-3 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Demo Accounts</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => login("principal", "demo123")}
                  disabled={isLoading}
                  className="w-full h-10 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <User className="mr-2 h-4 w-4" />
                  )}
                  Login as Principal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => login("teacher1", "demo123")}
                  disabled={isLoading}
                  className="w-full h-10 border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GraduationCap className="mr-2 h-4 w-4" />
                  )}
                  Login as Teacher1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => login("student1", "demo123")}
                  disabled={isLoading}
                  className="w-full h-10 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <User className="mr-2 h-4 w-4" />
                  )}
                  Login as Student1
                </Button>
              </div>
            </div>
          </CardContent>

        </Card>
        </div>
      </div>
  )
}