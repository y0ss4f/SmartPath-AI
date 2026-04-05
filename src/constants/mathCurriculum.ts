// Tunisian Primary School Math Curriculum — Grades 1–6
// Single source of truth for all unit dropdowns and Gemini prompts.
// Unit names are in Arabic (matching the official Tunisian curriculum).
// Keyed by grade_level values stored in the students table.

export const MATH_CURRICULUM: Record<string, string[]> = {
  "1ère année": [
    "الأعداد من 0 إلى 9",
    "الأعداد من 0 إلى 99",
    "الجمع",
    "الطرح",
    "مقارنة الأعداد وترتيبها",
    "الأشكال الهندسية الأساسية",
    "القياس: الطول",
    "الوضعيات الجمعية والطرحية",
  ],
  "2ème année": [
    "الأعداد من 0 إلى 999",
    "الجمع والطرح (بدون احتفاظ)",
    "الجمع والطرح (مع الاحتفاظ)",
    "مقارنة الأعداد وترتيبها",
    "الضرب: مفهوم أولي",
    "جداول الضرب (2، 3، 4، 5)",
    "الأشكال الهندسية المسطحة",
    "القياس: الطول والكتلة",
    "حل المسائل",
  ],
  "3ème année": [
    "الأعداد من 0 إلى 9999",
    "الجمع والطرح (أعداد كبيرة)",
    "الضرب",
    "جداول الضرب (6، 7، 8، 9)",
    "القسمة: مفهوم أولي",
    "الأشكال الهندسية: المربع والمستطيل والمثلث",
    "المحيط",
    "القياس: الطول والكتلة والسعة",
    "حل المسائل",
  ],
  "4ème année": [
    "الأعداد الكبيرة (حتى مليون)",
    "العمليات الأربع على الأعداد الصحيحة",
    "القسمة الإقليدية",
    "مضاعفات وقواسم عدد",
    "الكسور: مفهوم أولي",
    "الأشكال الهندسية: التماثل",
    "المحيط والمساحة",
    "القياس: الزمن والنقود",
    "التناسب: مفهوم أولي",
    "حل المسائل",
  ],
  "5ème année": [
    "الأعداد العشرية: مفهوم وكتابة",
    "العمليات على الأعداد العشرية",
    "الكسور: المقارنة والترتيب",
    "جمع الكسور وطرحها",
    "التناسب",
    "المساحة: المربع والمستطيل والمثلث",
    "الحجم: المكعب ومتوازي المستطيلات",
    "الزوايا",
    "الدائرة والقرص",
    "حل المسائل",
  ],
  "6ème année": [
    "الكسور: العمليات",
    "الأعداد العشرية: العمليات",
    "النسبة المئوية",
    "التناسب وتطبيقاته",
    "المساحة والمحيط: أشكال مركبة",
    "الحجم: الأسطوانة والموشور",
    "السرعة والمسافة والزمن",
    "التماثل المحوري",
    "الإحصاء: جداول ورسومات بيانية",
    "حل المسائل المركبة",
  ],
}

// Grade labels for display (French, used in UI dropdowns and headers)
export const GRADE_LABELS: Record<string, string> = {
  "1ère année": "1ère année",
  "2ème année": "2ème année",
  "3ème année": "3ème année",
  "4ème année": "4ème année",
  "5ème année": "5ème année",
  "6ème année": "6ème année",
}

// Available subjects (only Mathématiques for Sprint 6)
export const SUBJECTS = [
  { value: "Mathématiques", label: "Mathématiques", enabled: true },
  { value: "Français", label: "Français", enabled: false },
  { value: "العربية", label: "العربية", enabled: false },
  { value: "Sciences", label: "Sciences", enabled: false },
] as const
