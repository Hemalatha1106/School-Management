"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Trash2, Mail } from "lucide-react"

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  sortable?: boolean
}

interface Action {
  label: string
  icon?: React.ReactNode
  onClick: (row: any) => void
  variant?: 'default' | 'destructive'
  show?: (row: any) => boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  actions?: Action[]
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  onRowClick?: (row: any) => void
  selectable?: boolean
  selectedRows?: any[]
  onSelectRow?: (row: any, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export default function DataTable({
  columns,
  data,
  actions = [],
  loading = false,
  emptyMessage = "No data found",
  emptyDescription = "There are no items to display at the moment.",
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll
}: DataTableProps) {
  const allSelected = data.length > 0 && selectedRows.length === data.length
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked)
    }
  }

  const handleSelectRow = (row: any, checked: boolean) => {
    if (onSelectRow) {
      onSelectRow(row, checked)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading data...</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}>
                {column.label}
              </TableHead>
            ))}
            {actions.length > 0 && (
              <TableHead className="w-12">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <TableRow
                key={index}
                className={`hover:bg-muted/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row)}
                      onChange={(e) => handleSelectRow(row, e.target.checked)}
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
                {actions.length > 0 && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {actions
                          .filter(action => !action.show || action.show(row))
                          .map((action, actionIndex) => (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation()
                                action.onClick(row)
                              }}
                              className={action.variant === 'destructive' ? 'text-red-600' : ''}
                            >
                              {action.icon && <span className="mr-2">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-muted-foreground text-4xl">📊</div>
                  <h3 className="text-lg font-medium text-muted-foreground">{emptyMessage}</h3>
                  <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Helper components for common column renders
export const AvatarColumn = ({ name, email, avatar }: { name: string; email?: string; avatar?: string }) => (
  <div className="flex items-center gap-3">
    <Avatar className="h-8 w-8">
      <AvatarImage src={avatar} alt={name} />
      <AvatarFallback>
        {name.split(' ').map(n => n[0]).join('').toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium">{name}</div>
      {email && <div className="text-sm text-muted-foreground">{email}</div>}
    </div>
  </div>
)

export const StatusBadge = ({ status, variant = 'secondary' }: { status: string; variant?: 'secondary' | 'destructive' | 'outline' }) => (
  <Badge variant={variant} className="capitalize">
    {status}
  </Badge>
)

export const DateColumn = ({ date }: { date: string | Date }) => (
  <span className="text-sm">
    {new Date(date).toLocaleDateString()}
  </span>
)