export type Language = "en" | "uz" | "ja" | "ru";

export interface Translations {
  // Header / Page
  appTitle: string;
  appSubtitle: string;
  legend: string;
  overviewTitle: string;
  overviewDesc: string;
  footer: string;
  // Filters
  filtersTitle: string;
  filtersActive: string;
  filtersReset: string;
  labelFullName: string;
  labelStudentId: string;
  labelGroup: string;
  labelSubject: string;
  labelTeacher: string;
  labelTeacherId: string;
  labelDate: string;
  labelRoom: string;
  labelLessonTime: string;
  labelStatus: string;
  placeholderName: string;
  placeholderStudentId: string;
  placeholderGroup: string;
  placeholderSubject: string;
  placeholderTeacher: string;
  placeholderTeacherId: string;
  allTimes: string;
  period: (n: number) => string;
  allStatuses: string;
  statusPresent: string;
  statusLate: string;
  statusAbsent: string;
  statusExcused: string;
  // Stats Cards
  attendanceRate: string;
  absenceRate: string;
  statsStudents: string;
  statsRecords: string;
  statsPtEach1: string;
  statsPtEach05: string;
  statsPt0: string;
  attendanceFormula: string;
  basedOnPoints: (pts: string, max: number, p: number, e: number, l: number) => string;
  unexcusedAbsences: (u: number, empty: number) => string;
  // Student Panels
  loading: string;
  studentsFound: (n: number) => string;
  pageOf: (p: number, total: number) => string;
  noStudents: string;
  noRecords: string;
  colDate: string;
  colPeriod: string;
  colRoom: string;
  colStatus: string;
  colPoints: string;
  previous: string;
  next: string;
  attendance: string;
  absence: string;
  lessons: string;
  attMobile: string;
  pointsSummary: (pts: string, max: number, teacherId: string) => string;
  dateLocale: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: "Students Attendance",
    appSubtitle: "Dashboard & Analytics",
    legend: "P = Present · L = Late · U = Absent · E = Excused",
    overviewTitle: "Attendance Overview",
    overviewDesc:
      "Browse and filter student attendance records. Attendance rate is calculated using points: P=1, L=0.5, U=0, E=1.",
    footer:
      "Students Attendance Dashboard · Data sourced from studentsAttendance.json",
    filtersTitle: "Filters",
    filtersActive: "Active",
    filtersReset: "Reset",
    labelFullName: "Full Name",
    labelStudentId: "Student ID",
    labelGroup: "Group Name",
    labelSubject: "Subject Name",
    labelTeacher: "Teacher Name",
    labelTeacherId: "Teacher ID",
    labelDate: "Date",
    labelRoom: "Lesson Room",
    labelLessonTime: "Lesson Time",
    labelStatus: "Status",
    placeholderName: "e.g. Ulugbek",
    placeholderStudentId: "e.g. 2313760",
    placeholderGroup: "e.g. 22-25JDU",
    placeholderSubject: "e.g. ICPC",
    placeholderTeacher: "Search teacher…",
    placeholderTeacherId: "e.g. JDU1362",
    allTimes: "All times",
    period: (n) => `Period ${n}`,
    allStatuses: "All statuses",
    statusPresent: "Present",
    statusLate: "Late",
    statusAbsent: "Absent",
    statusExcused: "Excused",
    attendanceRate: "Attendance Rate",
    absenceRate: "Absence Rate",
    statsStudents: "Students",
    statsRecords: "records",
    statsPtEach1: "1 pt each",
    statsPtEach05: "0.5 pt each",
    statsPt0: "0 pts",
    attendanceFormula: "Attendance % = (earned pts / valid lessons) × 100",
    basedOnPoints: (pts, max, p, e, l) =>
      `Based on points: ${pts} / ${max} max pts · P=${p} E=${e} L=${l}`,
    unexcusedAbsences: (u, empty) =>
      `Unexcused absences: ${u} · No-status records: ${empty}`,
    loading: "Loading…",
    studentsFound: (n) => `${n.toLocaleString()} students`,
    pageOf: (p, total) => `Page ${p} of ${total}`,
    noStudents: "No students found. Try adjusting your filters.",
    noRecords: "No attendance records",
    colDate: "Date",
    colPeriod: "Period",
    colRoom: "Room",
    colStatus: "Status",
    colPoints: "Points",
    previous: "Previous",
    next: "Next",
    attendance: "attendance",
    absence: "absence",
    lessons: "lessons",
    attMobile: "att.",
    pointsSummary: (pts, max, teacherId) =>
      `Points: ${pts} / ${max} max · Teacher ID: ${teacherId}`,
    dateLocale: "en-GB",
  },

  uz: {
    appTitle: "Talabalar Davomati",
    appSubtitle: "Boshqaruv paneli va tahlil",
    legend: "P = Keldi · L = Kechikdi · U = Kelmadi · E = Uzrli",
    overviewTitle: "Davomat Ko'rinishi",
    overviewDesc:
      "Talabalar davomat yozuvlarini ko'rish va filtrlash. Davomat foizi ballar asosida hisoblanadi: P=1, L=0.5, U=0, E=1.",
    footer:
      "Talabalar Davomati · Ma'lumot manba: studentsAttendance.json",
    filtersTitle: "Filtrlar",
    filtersActive: "Faol",
    filtersReset: "Tozalash",
    labelFullName: "To'liq ism",
    labelStudentId: "Talaba ID",
    labelGroup: "Guruh nomi",
    labelSubject: "Fan nomi",
    labelTeacher: "O'qituvchi nomi",
    labelTeacherId: "O'qituvchi ID",
    labelDate: "Sana",
    labelRoom: "Xona",
    labelLessonTime: "Dars vaqti",
    labelStatus: "Holat",
    placeholderName: "mas. Ulugbek",
    placeholderStudentId: "mas. 2313760",
    placeholderGroup: "mas. 22-25JDU",
    placeholderSubject: "mas. ICPC",
    placeholderTeacher: "O'qituvchi qidirish…",
    placeholderTeacherId: "mas. JDU1362",
    allTimes: "Barcha vaqtlar",
    period: (n) => `${n}-dars`,
    allStatuses: "Barcha holatlar",
    statusPresent: "Keldi",
    statusLate: "Kechikdi",
    statusAbsent: "Kelmadi",
    statusExcused: "Uzrli",
    attendanceRate: "Davomat foizi",
    absenceRate: "Qatnashmaslik foizi",
    statsStudents: "Talabalar",
    statsRecords: "yozuv",
    statsPtEach1: "1 ball",
    statsPtEach05: "0.5 ball",
    statsPt0: "0 ball",
    attendanceFormula: "Davomat % = (ball / darslar) × 100",
    basedOnPoints: (pts, max, p, e, l) =>
      `Ballar asosida: ${pts} / ${max} maks. · P=${p} E=${e} L=${l}`,
    unexcusedAbsences: (u, empty) =>
      `Uzrsiz yo'qlamalar: ${u} · Holatsiz yozuvlar: ${empty}`,
    loading: "Yuklanmoqda…",
    studentsFound: (n) => `${n.toLocaleString()} talaba`,
    pageOf: (p, total) => `${p}/${total} sahifa`,
    noStudents: "Talabalar topilmadi. Filtrlarni o'zgartiring.",
    noRecords: "Davomat yozuvlari yo'q",
    colDate: "Sana",
    colPeriod: "Dars",
    colRoom: "Xona",
    colStatus: "Holat",
    colPoints: "Ball",
    previous: "Oldingi",
    next: "Keyingi",
    attendance: "davomat",
    absence: "qatnashmaslik",
    lessons: "dars",
    attMobile: "dav.",
    pointsSummary: (pts, max, teacherId) =>
      `Ball: ${pts} / ${max} maks. · O'qituvchi ID: ${teacherId}`,
    dateLocale: "uz-UZ",
  },

  ja: {
    appTitle: "学生出席管理",
    appSubtitle: "ダッシュボード & 分析",
    legend: "P = 出席 · L = 遅刻 · U = 欠席 · E = 公欠",
    overviewTitle: "出席概要",
    overviewDesc:
      "学生の出席記録を閲覧・検索できます。出席率はポイントで計算されます: P=1, L=0.5, U=0, E=1。",
    footer:
      "学生出席管理ダッシュボード · データ元: studentsAttendance.json",
    filtersTitle: "フィルター",
    filtersActive: "有効",
    filtersReset: "リセット",
    labelFullName: "氏名",
    labelStudentId: "学生ID",
    labelGroup: "グループ名",
    labelSubject: "科目名",
    labelTeacher: "教員名",
    labelTeacherId: "教員ID",
    labelDate: "日付",
    labelRoom: "教室",
    labelLessonTime: "授業時間",
    labelStatus: "状態",
    placeholderName: "例: Ulugbek",
    placeholderStudentId: "例: 2313760",
    placeholderGroup: "例: 22-25JDU",
    placeholderSubject: "例: ICPC",
    placeholderTeacher: "教員を検索…",
    placeholderTeacherId: "例: JDU1362",
    allTimes: "全時限",
    period: (n) => `第${n}時限`,
    allStatuses: "全状態",
    statusPresent: "出席",
    statusLate: "遅刻",
    statusAbsent: "欠席",
    statusExcused: "公欠",
    attendanceRate: "出席率",
    absenceRate: "欠席率",
    statsStudents: "学生",
    statsRecords: "件",
    statsPtEach1: "各1点",
    statsPtEach05: "各0.5点",
    statsPt0: "0点",
    attendanceFormula: "出席率 = (取得ポイント / 有効授業数) × 100",
    basedOnPoints: (pts, max, p, e, l) =>
      `ポイント: ${pts} / ${max} 最大 · P=${p} E=${e} L=${l}`,
    unexcusedAbsences: (u, empty) =>
      `無断欠席: ${u} · 状態なし: ${empty}`,
    loading: "読込中…",
    studentsFound: (n) => `${n.toLocaleString()} 名`,
    pageOf: (p, total) => `${p} / ${total} ページ`,
    noStudents: "学生が見つかりません。フィルターを変更してください。",
    noRecords: "出席記録なし",
    colDate: "日付",
    colPeriod: "時限",
    colRoom: "教室",
    colStatus: "状態",
    colPoints: "点数",
    previous: "前へ",
    next: "次へ",
    attendance: "出席率",
    absence: "欠席率",
    lessons: "コマ",
    attMobile: "出席",
    pointsSummary: (pts, max, teacherId) =>
      `点数: ${pts} / ${max} 最大 · 教員ID: ${teacherId}`,
    dateLocale: "ja-JP",
  },

  ru: {
    appTitle: "Посещаемость студентов",
    appSubtitle: "Панель управления и аналитика",
    legend:
      "P = Присутствует · L = Опоздал · U = Отсутствует · E = Уважит. причина",
    overviewTitle: "Обзор посещаемости",
    overviewDesc:
      "Просматривайте и фильтруйте записи посещаемости. Процент рассчитывается по баллам: P=1, L=0.5, U=0, E=1.",
    footer:
      "Посещаемость студентов · Данные из studentsAttendance.json",
    filtersTitle: "Фильтры",
    filtersActive: "Активны",
    filtersReset: "Сброс",
    labelFullName: "Полное имя",
    labelStudentId: "ID студента",
    labelGroup: "Группа",
    labelSubject: "Предмет",
    labelTeacher: "Преподаватель",
    labelTeacherId: "ID преподавателя",
    labelDate: "Дата",
    labelRoom: "Аудитория",
    labelLessonTime: "Время урока",
    labelStatus: "Статус",
    placeholderName: "напр. Улугбек",
    placeholderStudentId: "напр. 2313760",
    placeholderGroup: "напр. 22-25JDU",
    placeholderSubject: "напр. ICPC",
    placeholderTeacher: "Поиск преподавателя…",
    placeholderTeacherId: "напр. JDU1362",
    allTimes: "Все периоды",
    period: (n) => `Пара ${n}`,
    allStatuses: "Все статусы",
    statusPresent: "Присутствует",
    statusLate: "Опоздал",
    statusAbsent: "Отсутствует",
    statusExcused: "Уважит. причина",
    attendanceRate: "Процент посещаемости",
    absenceRate: "Процент пропусков",
    statsStudents: "Студенты",
    statsRecords: "записей",
    statsPtEach1: "1 балл",
    statsPtEach05: "0.5 балла",
    statsPt0: "0 баллов",
    attendanceFormula: "Посещаемость % = (набранные баллы / занятия) × 100",
    basedOnPoints: (pts, max, p, e, l) =>
      `По баллам: ${pts} / ${max} макс. · P=${p} E=${e} L=${l}`,
    unexcusedAbsences: (u, empty) =>
      `Прогулы: ${u} · Без статуса: ${empty}`,
    loading: "Загрузка…",
    studentsFound: (n) => `${n.toLocaleString()} студентов`,
    pageOf: (p, total) => `Страница ${p} из ${total}`,
    noStudents: "Студенты не найдены. Измените фильтры.",
    noRecords: "Нет записей",
    colDate: "Дата",
    colPeriod: "Период",
    colRoom: "Аудитория",
    colStatus: "Статус",
    colPoints: "Баллы",
    previous: "Назад",
    next: "Вперёд",
    attendance: "посещ.",
    absence: "пропуски",
    lessons: "занятий",
    attMobile: "посещ.",
    pointsSummary: (pts, max, teacherId) =>
      `Баллы: ${pts} / ${max} макс. · ID препод.: ${teacherId}`,
    dateLocale: "ru-RU",
  },
};
