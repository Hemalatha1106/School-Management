"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  isLoading?: boolean
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'indigo' | 'emerald'
  animationDelay?: number
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
  isLoading = false,
  color = 'blue',
  animationDelay = 0
}: StatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-purple-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-500',
    purple: 'from-purple-500 to-pink-600',
    red: 'from-red-500 to-pink-500',
    teal: 'from-teal-500 to-cyan-600',
    indigo: 'from-indigo-500 to-blue-600',
    emerald: 'from-emerald-500 to-green-600'
  }

  return (
    <Card
      className={`group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br ${colorClasses[color]} text-white`}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/90 mb-2">{title}</p>
            <div className="text-3xl font-bold text-white mb-1">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Loading</span>
                </div>
              ) : (
                value
              )}
            </div>
            {description && (
              <p className="text-xs text-white/70 font-medium">{description}</p>
            )}
          </div>
          {icon && (
            <div className="text-white/80">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}