/**
 * Sample content for the component gallery (web /dev/ui, mobile dev screen).
 * Developer-only pages; real screens get their text from @nfe/core i18n.
 */
import type { IconName } from "./icon-names";
import type { Tone } from "./theme";

export const showcase = {
  batches: ["263", "262", "261", "253", "252", "251", "243", "241", "232"],
  sections: ["A", "B", "C", "D", "E", "F"],
  labGroups: ["A1", "A2"],
  nextClass: {
    caption: "Next class · Tomorrow",
    title: "[Course title]",
    subtitle: "0531-1103 · Theory",
    time: "08:20 – 09:50",
    initial: "DNU",
    room: "AB-1: 304",
  },
  classRows: [
    { time: "08:20", title: "[Course title]", meta: "0531-1103 · DNU · AB-1: 304", colorIndex: 0 },
    { time: "09:50", title: "[Course title]", meta: "0231-111 · NC · AB-1: 203", colorIndex: 1 },
    { time: "01:10", title: "[Course title]", meta: "0711-1101 · DBH · AB-1: 502", colorIndex: 2 },
  ],
  classCards: [
    {
      start: "08:20",
      end: "09:50",
      title: "[Course title]",
      meta: "0531-1104 · Lab",
      teacher: "DAMR",
      room: "AB-1: 206",
      badge: "A1",
      colorIndex: 0,
    },
    {
      start: "02:40",
      end: "04:10",
      title: "[Course title]",
      meta: "0511-1105 · Theory",
      teacher: "SIS",
      room: "AB-1: 203",
      colorIndex: 1,
    },
  ],
  freeTime: { label: "Free time", range: "09:50 – 02:40", duration: "4 h 50 min" },
  days: [
    { key: "7", day: "7", weekday: "SAT", label: "Saturday, 7 November" },
    { key: "8", day: "8", weekday: "SUN", label: "Sunday, 8 November" },
    { key: "9", day: "9", weekday: "MON", label: "Monday, 9 November" },
    { key: "10", day: "10", weekday: "TUE", label: "Tuesday, 10 November" },
    { key: "11", day: "11", weekday: "WED", label: "Wednesday, 11 November" },
    { key: "12", day: "12", weekday: "THU", label: "Thursday, 12 November" },
    { key: "13", day: "13", weekday: "FRI", label: "Friday, 13 November" },
  ],
  views: [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ] as { value: "daily" | "weekly"; label: string }[],
  newStudent: {
    icon: "alert" as IconName,
    title: "New student? Batch not listed yet?",
    body: "Finish sign-up now. We'll notify you the moment your batch's routine is published.",
  },
  version: {
    icon: "refresh" as IconName,
    title: "Routine Version 5 is live",
    body: "Fall 2026 · see what changed for 263-A",
  },
  teacher: {
    initial: "DAMR",
    name: "[Full name]",
    designation: "[Designation]",
    department: "Nutrition and Food Engineering",
    callLabel: "Call",
    emailLabel: "Email",
  },
  teachesYou: {
    caption: "Teaches you",
    title: "0531-1104 · Lab group A1",
    detail: "Wednesday 08:20 – 09:50 · AB-1: 206",
  },
  week: [
    {
      day: "Sat",
      items: [
        { time: "08:20", label: "263-F" },
        { time: "01:10", label: "263-D1" },
        { time: "02:40", label: "263-D2" },
      ],
    },
    { day: "Sun", items: [{ time: "01:10", label: "263-D" }] },
    {
      day: "Wed",
      items: [
        { time: "08:20", label: "263-A1", highlight: true },
        { time: "09:50", label: "263-A2" },
      ],
    },
  ],
  tabs: [
    { value: "exams", label: "Exams", count: 2 },
    { value: "deadlines", label: "Deadlines" },
    { value: "notices", label: "Notices" },
  ] as { value: "exams" | "deadlines" | "notices"; label: string; count?: number }[],
  exam: {
    month: "MON",
    day: "16",
    title: "[Quiz or lab exam name]",
    meta: "0531-1103 · [Course title]",
    pills: [
      { label: "In class time", tone: "warning" as Tone },
      { label: "Syllabus: [topics]", tone: "neutral" as Tone },
    ],
  },
  weekdays: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
  slot: "08:20 – 09:50",
  search: "Search a room, e.g. AB-1: 304",
  available: { title: "Available now", count: "7 of 26 rooms" },
  rooms: [
    { building: "AB-1", number: "206", badge: "Lab" },
    { building: "AB-1", number: "306" },
    { building: "AB-2", number: "203" },
    { building: "AB", number: "101" },
  ],
  menuTiles: [
    { icon: "contact" as IconName, label: "Faculty directory", tone: "warning" as Tone },
    { icon: "users" as IconName, label: "CR list", tone: "accent" as Tone },
    { icon: "notes" as IconName, label: "Notes", tone: "purple" as Tone },
    { icon: "check" as IconName, label: "Attendance tracker", tone: "info" as Tone },
  ],
  settings: {
    title: "My schedule",
    rows: [
      { title: "Extra courses", subtitle: "Add retake classes from other sections" },
      { title: "Change section or lab group", subtitle: "Currently 263-A · A1" },
      { title: "Add to calendar", subtitle: "Google Calendar or phone calendar" },
    ],
  },
  nav: [
    { value: "home", label: "Home", icon: "home" },
    { value: "routine", label: "Routine", icon: "routine" },
    { value: "academics", label: "Academics", icon: "academics" },
    { value: "rooms", label: "Rooms", icon: "rooms" },
    { value: "menu", label: "Menu", icon: "menu" },
  ] as { value: string; label: string; icon: IconName }[],
  pills: [
    { label: "New", tone: "accent" },
    { label: "80 to complete", tone: "warning" },
    { label: "Lab · groups found", tone: "info" },
    { label: "Cancelled", tone: "danger" },
    { label: "Makeup", tone: "purple" },
    { label: "AB-1: 206", tone: "neutral" },
  ] as { label: string; tone: Tone }[],
  admin: {
    appName: "NFE Schedule",
    area: "Admin",
    user: "Department office",
    links: ["Routine", "Courses", "Faculty", "Batches", "Notices", "Rooms", "CR requests"],
    steps: ["Upload", "Read tables", "Fill missing details", "Publish"],
    stats: [
      { value: "55", label: "Section tables read" },
      { value: "578", label: "Classes found" },
      { value: "138", label: "Lab group sessions" },
      { value: "0", label: "Teacher or room clashes", highlight: true },
    ],
    faculty: [
      { initial: "DAMR", classes: 12 },
      { initial: "AMT", classes: 12 },
      { initial: "SIS", classes: 10 },
    ],
    checks: [
      { label: "Teacher double-booked", value: "None", good: true },
      { label: "Room double-booked", value: "None", good: true },
      { label: "Rooms found", value: "26" },
    ],
  },
};
