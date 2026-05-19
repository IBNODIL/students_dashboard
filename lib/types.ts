export interface AttendanceRecord {
  date: string
  lesson_time: number
  lesson_room: number
  status: string
}

export interface Student {
  student_id: number
  student_name: string
  group_name: string
  subject_name: string
  teacher_name: string
  teacher_id: string
  attendances: AttendanceRecord[]
}

export interface FlatRecord {
  student_id: number
  student_name: string
  group_name: string
  subject_name: string
  teacher_name: string
  teacher_id: string
  date: string
  lesson_time: number
  lesson_room: number
  status: string
  points: number
  student_total_points: number
  student_max_points: number
  student_attendance_pct: number
  student_absence_pct: number
}

export interface AttendanceStats {
  total_records: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  empty_count: number
  valid_records: number
  total_points: number
  max_points: number
  attendance_pct: number
  absence_pct: number
  unique_students: number
}

export interface ApiResponse {
  records: FlatRecord[]
  stats: AttendanceStats
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface StudentAttendanceRow {
  date: string
  lesson_time: number
  lesson_room: number
  status: string
  points: number
}

export interface StudentGroup {
  student_id: number
  student_name: string
  group_name: string
  subject_name: string
  teacher_name: string
  teacher_id: string
  total_points: number
  max_points: number
  attendance_pct: number
  absence_pct: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  attendances: StudentAttendanceRow[]
}

export interface EchoAssignment {
  title: string
  current_grade: string | number
  full_grade: number
  assignment_deadline: string
}

export interface EchoGradesBlock {
  total_current_grade: number
  total_full_grade: number
  percentage: number
  assignments: EchoAssignment[]
}

export interface Course {
  subject_name: string
  teacher_name: string
  teacher_id: string
  /** Group for this enrollment (echo + attendance row). */
  group_name?: string
  total_points: number
  max_points: number
  attendance_pct: number
  absence_pct: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  attendances: StudentAttendanceRow[]
  /** Grade book data from echo.json (or Neon `lessons` row). */
  echo_grades?: EchoGradesBlock
}

export interface StudentWithCourses {
  student_id: number
  student_name: string
  group_name: string
  courses: Course[]
  gradesData?: {
    grades: { [department: string]: { [courseName: string]: string } }
    totals: {
      total_credits_passed: number
      total_credits_graded: number
      percentage_passed: number
    }
    by_department: {
      [department: string]: {
        total_credits_passed: number
        total_credits_graded: number
        percentage_passed: number
      }
    }
  }
  // Real-time attendance status
  attendanceStatus?: {
    status: "here" | "exit" | "do not come"
    inside: number | null
    timeLog: string | null
    lastUpdated: string | null
  }
}

export interface GroupedApiResponse {
  students: StudentWithCourses[]
  stats: AttendanceStats
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface FilterValues {
  name: string
  group: string
  studentId: string
  subject: string
  teacher: string
  teacherId: string
  date: string
  room: string
  lessonTime: string
  status: string
}
