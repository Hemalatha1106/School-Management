"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Calendar,
  Clock,
  Filter,
  Eye,
  EyeOff,
  BookOpen,
  Users
} from "lucide-react"

// --- TypeScript Interfaces for API Data ---
interface TimetableEntry {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: {
    user: {
      id: number;
      first_name: string;
      last_name: string;
    }
  } | null;
}

interface SchoolClass { 
  id: number; 
  name: string; 
}

interface Teacher { 
  user: { 
    id: number; 
    first_name: string; 
    last_name: string; 
  } 
}

interface TimetableManagementProps { 
  userRole: "principal" | "teacher" | "student"; 
}

interface FormData {
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
}

// --- Enhanced Time Slots with Better Formatting ---
const TIME_SLOTS = [
  { value: "08:00:00", label: "8:00 AM - 8:50 AM", shortLabel: "8:00 AM" },
  { value: "09:00:00", label: "9:00 AM - 9:50 AM", shortLabel: "9:00 AM" },
  { value: "10:00:00", label: "10:00 AM - 10:50 AM", shortLabel: "10:00 AM" },
  { value: "11:00:00", label: "11:00 AM - 11:50 AM", shortLabel: "11:00 AM" },
  { value: "12:00:00", label: "12:00 PM - 12:50 PM", shortLabel: "12:00 PM" },
  { value: "13:00:00", label: "1:00 PM - 1:50 PM", shortLabel: "1:00 PM" },
  { value: "14:00:00", label: "2:00 PM - 2:50 PM", shortLabel: "2:00 PM" },
  { value: "15:00:00", label: "3:00 PM - 3:50 PM", shortLabel: "3:00 PM" },
  { value: "16:00:00", label: "4:00 PM - 4:50 PM", shortLabel: "4:00 PM" },
  { value: "17:00:00", label: "5:00 PM - 5:50 PM", shortLabel: "5:00 PM" },
];

const WEEK_DAYS = [
  { value: "MON", label: "Monday", shortLabel: "Mon" },
  { value: "TUE", label: "Tuesday", shortLabel: "Tue" },
  { value: "WED", label: "Wednesday", shortLabel: "Wed" },
  { value: "THU", label: "Thursday", shortLabel: "Thu" },
  { value: "FRI", label: "Friday", shortLabel: "Fri" },
  { value: "SAT", label: "Saturday", shortLabel: "Sat" },
];

const SUBJECT_COLORS = [
  "rgb(239 246 255)", // blue-50
  "rgb(250 245 255)", // purple-50
  "rgb(240 253 244)", // green-50
  "rgb(255 247 237)", // orange-50
  "rgb(254 242 242)", // red-50
  "rgb(253 242 248)", // pink-50
  "rgb(238 242 255)", // indigo-50
  "rgb(254 249 195)", // yellow-50
];

const SUBJECT_TEXT_COLORS = [
  "rgb(30 64 175)", // blue-800
  "rgb(107 33 168)", // purple-800
  "rgb(22 101 52)", // green-800
  "rgb(154 52 18)", // orange-800
  "rgb(153 27 27)", // red-800
  "rgb(157 23 77)", // pink-800
  "rgb(55 48 163)", // indigo-800
  "rgb(133 77 14)", // yellow-800
];

// --- Enhanced Utility Functions ---
const formatTime = (timeStr: string): string => {
  if (!timeStr) return "";
  const timeSlot = TIME_SLOTS.find(slot => slot.value === timeStr);
  return timeSlot?.shortLabel || timeStr;
};

const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return `${start} - ${end}`;
};

const generateEndTime = (startTime: string, duration: number = 50): string => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + duration * 60000);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
};

const getSubjectColor = (subject: string): { bg: string; text: string } => {
  const hash = subject.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colorIndex = Math.abs(hash) % SUBJECT_COLORS.length;
  
  return {
    bg: SUBJECT_COLORS[colorIndex],
    text: SUBJECT_TEXT_COLORS[colorIndex],
  };
};

const getCurrentWeekDates = (): string => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
};

const exportTimetableToCSV = (timetable: TimetableEntry[], className: string) => {
  const headers = ['Day', 'Time', 'Subject', 'Teacher', 'Duration'];
  const rows = timetable.map(entry => [
    entry.day_of_week,
    formatTimeRange(entry.start_time, entry.end_time),
    entry.subject,
    entry.teacher ? `${entry.teacher.user.first_name} ${entry.teacher.user.last_name}` : 'No Teacher',
    '50 minutes'
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${className}_timetable_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// --- Enhanced Memoized Components ---
const TimetableCell = ({ 
  entry, 
  userRole, 
  onEdit, 
  onDelete,
  isCompactView 
}: { 
  entry: TimetableEntry | null; 
  userRole: string; 
  onEdit: (entry: TimetableEntry) => void;
  onDelete: (id: number) => void;
  isCompactView: boolean;
}) => {
  const colors = useMemo(() => 
    entry ? getSubjectColor(entry.subject) : null, 
    [entry?.subject]
  );

  if (!entry) {
    return <div className="h-full w-full" />;
  }

  return (
    <div 
      className={`p-2 rounded text-xs h-full flex flex-col justify-between transition-all duration-200 hover:shadow-md ${isCompactView ? 'min-h-[50px]' : 'min-h-[70px]'}`}
      style={{ 
        backgroundColor: colors?.bg, 
        color: colors?.text 
      }}
    >
      <div>
        <p className={`font-bold ${isCompactView ? 'text-[10px]' : 'text-xs'}`} title={entry.subject}>
          {isCompactView ? entry.subject.substring(0, 12) + (entry.subject.length > 12 ? '...' : '') : entry.subject}
        </p>
        {!isCompactView && (
          <>
            {entry.teacher ? (
              <p className="opacity-80 text-[10px]" title={`${entry.teacher.user.first_name} ${entry.teacher.user.last_name}`}>
                {entry.teacher.user.first_name} {entry.teacher.user.last_name}
              </p>
            ) : (
              <p className="opacity-60 italic text-[10px]">No Teacher</p>
            )}
            <p className="opacity-70 text-[9px] mt-1">
              {formatTimeRange(entry.start_time, entry.end_time)}
            </p>
          </>
        )}
      </div>
      {userRole === "principal" && !isCompactView && (
        <div className="flex justify-end gap-1 mt-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5 hover:bg-black/10" 
            onClick={() => onEdit(entry)}
            aria-label={`Edit ${entry.subject} class`}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5 hover:bg-black/10" 
            onClick={() => onDelete(entry.id)}
            aria-label={`Delete ${entry.subject} class`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export function TimetableManagement({ userRole }: TimetableManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // --- State Management ---
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  
  // New state for enhanced features
  const [isCompactView, setIsCompactView] = useState(false);
  const [filterByTeacher, setFilterByTeacher] = useState<string>("");
  const [filterBySubject, setFilterBySubject] = useState<string>("");
  
  const initialFormState: FormData = { 
    day_of_week: "", 
    start_time: "", 
    end_time: "",
    subject: "", 
    teacher: "" 
  };
  const [formData, setFormData] = useState<FormData>(initialFormState);

  // --- Memoized Values ---
  const selectedClassName = useMemo(() => 
    classes.find((c) => c.id.toString() === selectedClassId)?.name || "", 
    [classes, selectedClassId]
  );

  const filteredTimetable = useMemo(() => {
    return timetable.filter(entry => {
      const teacherMatch = !filterByTeacher || 
        (entry.teacher && entry.teacher.user.id.toString() === filterByTeacher);
      const subjectMatch = !filterBySubject || 
        entry.subject.toLowerCase().includes(filterBySubject.toLowerCase());
      return teacherMatch && subjectMatch;
    });
  }, [timetable, filterByTeacher, filterBySubject]);

  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(timetable.map(entry => entry.subject)));
  }, [timetable]);

  const currentWeek = useMemo(() => getCurrentWeekDates(), []);

  // --- API Functions ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        api.classes.list(), 
        api.teachers.list()
      ]);
      
      if (classesRes.success && Array.isArray(classesRes.data)) {
        setClasses(classesRes.data);
        if (classesRes.data.length > 0) {
          setSelectedClassId(classesRes.data[0].id.toString());
        }
      } else { 
        throw new Error(classesRes.message || "Failed to fetch classes."); 
      }
      
      if (teachersRes.success && Array.isArray(teachersRes.data)) {
        setTeachers(teachersRes.data);
      } else { 
        throw new Error(teachersRes.message || "Failed to fetch teachers."); 
      }
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  const fetchTimetable = useCallback(async (classId: string) => {
    if (!classId) return;
    
    setIsLoading(true);
    try {
      const response = await api.timetable.byClass(parseInt(classId, 10));
      if (response.success && Array.isArray(response.data)) {
        setTimetable(response.data);
      } else {
        setTimetable([]);
      }
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchTimetable(selectedClassId);
    toast({ 
      title: "Refreshed", 
      description: "Timetable data has been updated." 
    });
  }, [selectedClassId, fetchTimetable, toast]);

  // --- Effects ---
  useEffect(() => { 
    fetchInitialData(); 
  }, [fetchInitialData]);

  useEffect(() => {
    fetchTimetable(selectedClassId);
  }, [selectedClassId, fetchTimetable]);

  useEffect(() => {
    if (formData.start_time && !formData.end_time) {
      setFormData(prev => ({
        ...prev,
        end_time: generateEndTime(prev.start_time)
      }));
    }
  }, [formData.start_time]);

  // --- Event Handlers ---
  const handleOpenAddDialog = useCallback(() => {
    setIsEditing(false);
    setFormData(initialFormState);
    setIsDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((entry: TimetableEntry) => {
    setIsEditing(true);
    setEditingEntryId(entry.id);
    setFormData({
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      subject: entry.subject,
      teacher: entry.teacher?.user.id.toString() || "",
    });
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.day_of_week || !formData.start_time || !formData.end_time || !formData.subject || !formData.teacher) {
      toast({ 
        variant: "destructive", 
        title: "Incomplete Form", 
        description: "Please fill out all fields." 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        school_class: selectedClassId
      };
      
      const response = isEditing 
        ? await api.timetable.update(editingEntryId!, payload)
        : await api.timetable.create(payload);
      
      if (response.success && response.data) {
        toast({ 
          title: "Success", 
          description: `Timetable slot ${isEditing ? 'updated' : 'added'}.` 
        });
        
        await fetchTimetable(selectedClassId);
        setIsDialogOpen(false);
      } else { 
        throw new Error(response.message); 
      }
    } catch (err: any) { 
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message 
      }); 
    } finally { 
      setIsSubmitting(false); 
    }
  }, [formData, selectedClassId, isEditing, editingEntryId, toast, fetchTimetable]);

  const handleDeleteSlot = useCallback(async (entryId: number) => {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;
    
    try {
      await api.timetable.delete(entryId);
      toast({ 
        title: "Success", 
        description: "Class slot deleted." 
      });
      setTimetable(prev => prev.filter(entry => entry.id !== entryId));
    } catch (err: any) { 
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message || "Failed to delete slot." 
      }); 
    }
  }, [toast]);

  const handleExport = useCallback(() => {
    exportTimetableToCSV(filteredTimetable, selectedClassName);
    toast({ 
      title: "Exported", 
      description: "Timetable has been exported to CSV." 
    });
  }, [filteredTimetable, selectedClassName, toast]);

  const handleCopyTimetable = useCallback(() => {
    const timetableText = filteredTimetable.map(entry => 
      `${entry.day_of_week} ${formatTimeRange(entry.start_time, entry.end_time)} - ${entry.subject} (${entry.teacher ? `${entry.teacher.user.first_name} ${entry.teacher.user.last_name}` : 'No Teacher'})`
    ).join('\n');
    
    navigator.clipboard.writeText(timetableText);
    toast({ 
      title: "Copied", 
      description: "Timetable has been copied to clipboard." 
    });
  }, [filteredTimetable, toast]);

  const clearFilters = useCallback(() => {
    setFilterByTeacher("");
    setFilterBySubject("");
    toast({ 
      title: "Filters Cleared", 
      description: "All filters have been removed." 
    });
  }, [toast]);

  // --- Render Loading State ---
  if (isLoading && classes.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-muted-foreground">Loading timetable...</div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and timetables for all classes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-gradient-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{filteredTimetable.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-gradient-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gradient-secondary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold">{uniqueSubjects.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-gradient-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gradient-accent">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{new Set(filteredTimetable.map(e => e.teacher?.user.id).filter(Boolean)).size}</p>
              </div>
              <Users className="h-8 w-8 text-gradient-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weekly Hours</p>
                <p className="text-2xl font-bold">{Math.round((filteredTimetable.length * 50) / 60 * 10) / 10}h</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-medium">Timetable Management</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Week of {currentWeek}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select 
              value={selectedClassId} 
              onValueChange={setSelectedClassId} 
              disabled={isLoading}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {userRole === "principal" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddDialog}>
                  <Plus className="h-4 w-4 mr-2" /> Add Slot
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? 'Edit Class Slot' : `Add Class to ${selectedClassName}`}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Update the class period details.' : 'Schedule a new class period.'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="day-select">Day</Label>
                      <Select 
                        value={formData.day_of_week} 
                        onValueChange={(v) => setFormData(p => ({...p, day_of_week: v}))}
                      >
                        <SelectTrigger id="day-select">
                          <SelectValue placeholder="Select Day"/>
                        </SelectTrigger>
                        <SelectContent>
                          {WEEK_DAYS.map(d => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time-select">Start Time</Label>
                      <Select 
                        value={formData.start_time} 
                        onValueChange={(v) => setFormData(p => ({...p, start_time: v}))}
                      >
                        <SelectTrigger id="time-select">
                          <SelectValue placeholder="Select Time"/>
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-time-input">End Time</Label>
                    <Input
                      id="end-time-input"
                      type="time"
                      value={formData.end_time.substring(0, 5)}
                      onChange={(e) => setFormData(p => ({...p, end_time: e.target.value + ':00'}))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject-input">Subject</Label>
                    <Input 
                      id="subject-input"
                      value={formData.subject} 
                      onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))} 
                      placeholder="e.g., Advanced Physics" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teacher-select">Teacher</Label>
                    <Select 
                      value={formData.teacher} 
                      onValueChange={(v) => setFormData(p => ({...p, teacher: v}))}
                    >
                      <SelectTrigger id="teacher-select">
                        <SelectValue placeholder="Select Teacher"/>
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(t => (
                          <SelectItem key={t.user.id} value={t.user.id.toString()}>
                            {t.user.first_name} {t.user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 
                    {isEditing ? 'Save Changes' : 'Add Slot'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
<Button
  variant="outline"
  onClick={handleRefresh}
  disabled={isLoading}
  className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  "
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Refresh
</Button>

<Button
  variant="outline"
  onClick={handleExport}
className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>

<Button
  variant="outline"
  onClick={handleCopyTimetable}
className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
  <Copy className="h-4 w-4 mr-2" />
  Copy
</Button>

<Button
  variant="outline"
  onClick={() => setIsCompactView(!isCompactView)}
className="
    px-4 py-2 rounded-lg
    text-black dark:text-white
    hover:text-black dark:hover:text-white 
    hover:bg-blue-500 dark:hover:bg-blue-600
  ">
  {isCompactView ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
  {isCompactView ? 'Detailed' : 'Compact'}
</Button>

        </div>

        {/* Filter Section */}
        <Card className="bg-gray-50 dark:bg-slate-800 border border-white/60 dark:border-slate-200/20">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filters:</span>
              </div>
              
              <Select value={filterByTeacher || "all_teachers"} onValueChange={(v) => setFilterByTeacher(v === "all_teachers" ? "" : v)}>
                <SelectTrigger className="w-48 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-700">
                  <SelectValue placeholder="Filter by Teacher" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                  <SelectItem value="all_teachers">All Teachers</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.user.id} value={t.user.id.toString()}>
                      {t.user.first_name} {t.user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterBySubject || "all_subjects"} onValueChange={(v) => setFilterBySubject(v === "all_subjects" ? "" : v)}>
                <SelectTrigger className="w-48 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-700">
                  <SelectValue placeholder="Filter by Subject" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
                  <SelectItem value="all_subjects">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filterByTeacher || filterBySubject) && (
                <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-300" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Timetable - {selectedClassName}
          </CardTitle>
          <CardDescription>
            {filteredTimetable.length} classes scheduled
            {(filterByTeacher || filterBySubject) && " (filtered)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-gray-50 dark:bg-slate-800 border border-white/60 dark:border-slate-200/20">
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              {/* Time Header Row - Horizontal */}
              <div className="grid grid-cols-11 gap-1 p-4 bg-gray-50 dark:bg-slate-900 border-b border-white/60 dark:border-slate-200/20">
                <div className="font-semibold text-center py-2 text-gray-700 dark:text-gray-200">Day</div>
                {TIME_SLOTS.map((timeSlot) => (
                  <div key={timeSlot.value} className="font-semibold text-center py-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200">{timeSlot.shortLabel}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {timeSlot.value.substring(0, 5)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Rows - Vertical */}
              {WEEK_DAYS.map((day) => (
                <div key={day.value} className="grid grid-cols-11 gap-1 p-4 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-900/40 transition-colors">
                  {/* Day Column */}
                  <div className="text-center py-2">
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-200">{day.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{day.value}</div>
                  </div>

                  {/* Time Slot Columns */}
                  {TIME_SLOTS.map((timeSlot) => {
                    const entry = filteredTimetable.find(e =>
                      e.day_of_week === day.value && e.start_time === timeSlot.value
                    );

                    return (
                      <div
                        key={`${day.value}-${timeSlot.value}`}
                        className={`p-1 border-t border-r border-gray-200 dark:border-slate-700 ${isCompactView ? 'min-h-[50px]' : 'min-h-[70px]'} hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors`}
                        role="gridcell"
                        style={{
                          background: entry
                            ? 'transparent'
                            : 'linear-gradient(45deg, transparent 49%, #f1f5f9 49%, #f1f5f9 51%, transparent 51%)'
                        }}
                      >
                        <TimetableCell
                          entry={entry || null}
                          userRole={userRole}
                          onEdit={handleOpenEditDialog}
                          onDelete={handleDeleteSlot}
                          isCompactView={isCompactView}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions for Principals */}
      {userRole === "principal" && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Bulk operations and advanced management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Upload className="h-6 w-6" />
                <span>Import CSV</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Copy className="h-6 w-6" />
                <span>Duplicate Week</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Trash2 className="h-6 w-6" />
                <span>Clear All</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Statistics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredTimetable.length}</div>
                <div className="text-sm text-muted-foreground">Total Classes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{uniqueSubjects.length}</div>
                <div className="text-sm text-muted-foreground">Subjects</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(filteredTimetable.map(e => e.teacher?.user.id).filter(Boolean)).size}
                </div>
                <div className="text-sm text-muted-foreground">Teachers</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((filteredTimetable.length * 50) / 60 * 10) / 10}h
                </div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {WEEK_DAYS.map((day) => {
                const dayClasses = filteredTimetable.filter(e => e.day_of_week === day.value);
                const percentage = filteredTimetable.length > 0 ? (dayClasses.length / filteredTimetable.length) * 100 : 0;
                
                return (
                  <div key={day.value} className="flex items-center justify-between">
                    <span className="text-sm font-medium w-20">{day.shortLabel}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{dayClasses.length}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}