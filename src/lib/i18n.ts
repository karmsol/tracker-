export type Locale = "en" | "hi";

const en: Record<string, string> = {
  "nav.inbox": "Inbox",
  "nav.today": "Today",
  "nav.upcoming": "Upcoming",
  "nav.overdue": "Overdue",
  "nav.completed": "Completed",
  "nav.assigned": "My work",
  "nav.projects": "Projects",
  "nav.filters": "Filters",
  "nav.admin": "Give work",
  "nav.search": "Search",
  "action.quick": "Quick add",
  "action.signIn": "Sign in",
  "action.signOut": "Sign out",
  "action.create": "Create workspace",
  "empty.tasks": "Nothing is waiting here.",
  "empty.hint": "Press Q to capture the next piece of work.",
};

const hi: Record<string, string> = {
  "nav.inbox": "इनबॉक्स",
  "nav.today": "आज",
  "nav.upcoming": "आने वाले",
  "nav.overdue": "देर से",
  "nav.completed": "पूरे हुए",
  "nav.assigned": "मेरे काम",
  "nav.projects": "प्रोजेक्ट",
  "nav.filters": "फ़िल्टर",
  "nav.admin": "काम दें",
  "nav.search": "खोज",
  "action.quick": "जल्दी जोड़ें",
  "action.signIn": "प्रवेश करें",
  "action.signOut": "बाहर जाएँ",
  "action.create": "वर्कस्पेस बनाएँ",
  "empty.tasks": "यहाँ अभी कुछ नहीं है।",
  "empty.hint": "अगला काम जोड़ने के लिए Q दबाएँ।",
};

export function translate(locale: Locale, key: string) {
  return (locale === "hi" ? hi : en)[key] ?? en[key] ?? key;
}
