export const gender = [
  { name_en: "Male", name_ar: "ذكر", id: 1, value: "male" },
  { name_en: "Female", name_ar: "أنثى", id: 2, value: "female" },
];

export const Categories = [
  { name_en: "Volunteer", name_ar: "متطوع", id: 1 },
  { name_en: "Organized", name_ar: "منظم", id: 2 },
];

export const MoreProfileCategories = [
  { name_en: "Volunteer", name_ar: "متطوع", id: 1, value: "volunteer" },
  { name_en: "Volunteer Team", name_ar: "فريق تطوعي", id: 2, value: "volunteer_team" },
  { name_en: "Organization", name_ar: "جهة", id: 3, value: "organization" },
]

export const Status = [
  { name_en: "In Progress", name_ar: "بدأت", id: 1 },
  { name_en: "Upcoming", name_ar: "قادمة", id: 2 },
  { name_en: "Finished", name_ar: "منتهية", id: 3 },
];

// `organizertypes` and `registernumber` used to hold hardcoded organisation
// types (Public / Private / Government / Company / Community). The backend has
// since replaced that list with six new values, so hardcoding it is a
// correctness bug waiting to happen — read `GET /api/choices/org_type/` instead.
// Both lists were already unused; they are gone so nothing reaches for them.

export const socialMediaOptions = [
  { value: "twitter", name_en: "X", name_ar: "X", id: 2 },
  { value: "whatsapp", name_en: "WhatsApp", name_ar: "واتساب", id: 3 },
  { value: "linkedin", name_en: "LinkedIn", name_ar: "لينكدإن", id: 4 },
  { value: "instagram", name_en: "Instagram", name_ar: "انستغرام", id: 5 },
];

export const organizerFields = [
  { name_en: "Finance", name_ar: "تمويل", id: 1, value: "finance" },
  { name_en: "Logistics", name_ar: "اللوجستية", id: 2, value: "logistics" },
];

export const TypeOfSupports = [
  { name_en: "Financial", name_ar: "مالي", id: 1, value: "financial" },
  { name_en: "Logistics", name_ar: "اللوجستية", id: 2, value: "logistics" },
  { name_en: "Volunteer", name_ar: "متطوع", id: 3, value: "volunteer" },
]

export const SponsorshipTypes = [
  { name_en: "Media", name_ar: "وسائط", id: 1, value: "media" },
  { name_en: "Official", name_ar: "رسمي", id: 2, value: "official" },
  { name_en: "Gold", name_ar: "ذهبي", id: 3, value: "gold" },
  { name_en: "Silver", name_ar: "فضي", id: 4, value: "silver" },
]

export const OpportunityCategories = [
  { name_en: "Volunteer", name_ar: "تطوع", id: 1, value: "volunteer" },
  { name_en: "Development", name_ar: "تطور", id: 2, value: "learn" },
];

export const OpportunityCategoriesOrganization = [
  { name_en: "Volunteer", name_ar: "متطوع", id: 1, value: "volunteer" },
  { name_en: "Development", name_ar: "تطور", id: 2, value: "learn" },
  { name_en: "Event", name_ar: "حدث", id: 3, value: "event" },
]

export const OpportunityStatus = [
  { name_en: "Started", name_ar: "بدأت", id: 1, value: "inprogress" },
  { name_en: "Upcoming", name_ar: "قادمة", id: 2, value: "upcoming" },
  { name_en: "Ended", name_ar: "انتهت", id: 3, value: "completed" },
]

export const nationalityOptions = [
  {
    value: "kuwaitis",
    name_en: "KUWAITI",
    name_ar: "كويتي",
  },
  {
    value: "other",
    name_en: "Other",
    name_ar: "آخر",
  },
];

export const nationalityFilterOptions = [
  {
    value: "kuwaitis",
    name_en: "Kuwaitis",
    name_ar: "كويتيين",
  },
  {
    value: "other",
    name_en: "All",
    name_ar: "الجميع",
  },
];

export const healthConcernOptions = [
  {
    value: "yes",
    name_en: "Yes",
    name_ar: "نعم",
  },
  {
    value: "no",
    name_en: "No",
    name_ar: "لا",
  },
];

/**
 * `volunteer_category` on a volunteer opportunity. A fixed backend enum rather
 * than a `/choices/` lookup, so the labels live here. Only `charity` supports a
 * beneficiaries count — see `VOLUNTEER_CATEGORY_WITH_BENEFICIARIES`.
 */
export const volunteerCategoryOptions = [
  { value: "environmental", name_en: "Environmental", name_ar: "بيئي" },
  { value: "charity", name_en: "Charity", name_ar: "خيري" },
  { value: "organizational", name_en: "Organizational", name_ar: "تنظيمي" },
];

/**
 * The backend nulls `beneficiaries_count` for any other category, so the field
 * is only offered for this one. The detail payload also reports the same thing
 * through `supports_beneficiaries_count`.
 */
export const VOLUNTEER_CATEGORY_WITH_BENEFICIARIES = "charity";

export const opportunityPrivacyOptions = [
  { value: "public", name_en: "Public", name_ar: "عام", id: 1 },
  { value: "private", name_en: "Private", name_ar: "خاص", id: 2 },
];

/**
 * Community post types. "Idea needs support" (`is_funding_required`) was
 * dropped at the client's request — the create-post toggle went first and every
 * new post now submits `is_funding_required: false`, so offering it as a filter
 * only ever matched historical posts. The field is still on the API.
 */
export const TypeOfThoughts = [
  { name_en: "Post", name_ar: "مشاركة", id: 1, value: "post" },
  { name_en: "Idea", name_ar: "فكرة", id: 2, value: "proposing_idea" },
]

export const occupationOptions = [
  { value: "student", name_en: "Student", name_ar: "طالب" },
  { value: "diploma_student", name_en: "Diploma Student", name_ar: "طالب دبلوم" },
  { value: "university_student", name_en: "University Student", name_ar: "طالب جامعي" },
  { value: "graduate_student", name_en: "Graduate Student", name_ar: "طالب دراسات عليا" },
  { value: "retired", name_en: "Retired", name_ar: "متقاعد" },
  { value: "unemployed", name_en: "Unemployed", name_ar: "عاطل عن العمل" },
  { value: "heading_employee", name_en: "Employee", name_ar: "موظف", isHeading: true },
  { value: "government_employee", name_en: "Government Employee", name_ar: "موظف حكومي" },
  { value: "accountant", name_en: "Accountant", name_ar: "محاسب" },
  { value: "teacher", name_en: "Teacher", name_ar: "معلم" },
  { value: "doctor", name_en: "Doctor", name_ar: "طبيب" },
  { value: "nurse", name_en: "Nurse", name_ar: "ممرضة" },
  { value: "pharmacist", name_en: "Pharmacist", name_ar: "صيدلي" },
  { value: "lab_technician", name_en: "Lab Technician", name_ar: "فني مختبر" },
  { value: "physiotherapist", name_en: "Physiotherapist", name_ar: "أخصائي علاج طبيعي" },
  { value: "nutritionist", name_en: "Nutritionist", name_ar: "أخصائي تغذية" },
  { value: "sports_coach", name_en: "Sports Coach", name_ar: "مدرب رياضي" },
  { value: "bank_employee", name_en: "Bank Employee", name_ar: "موظف بنك" },
  { value: "financial_manager", name_en: "Financial Manager", name_ar: "مدير مالي" },
  { value: "financial_analyst", name_en: "Financial Analyst", name_ar: "محلل مالي" },
  { value: "graphic_designer", name_en: "Graphic Designer", name_ar: "مصمم جرافيك" },
  { value: "craftsman", name_en: "Craftsman", name_ar: "حرفي" },
  { value: "writer", name_en: "Writer", name_ar: "كاتب" },
  { value: "journalist", name_en: "Journalist", name_ar: "صحفي" },
  { value: "digital_marketer", name_en: "Digital Marketing Expert", name_ar: "خبير تسويق رقمي" },
  { value: "photographer", name_en: "Photographer", name_ar: "مصور" },
  { value: "content_editor", name_en: "Content Editor", name_ar: "محرر محتوى" },
  { value: "media_professional", name_en: "Media Professional", name_ar: "إعلامي" },
  { value: "sales_rep", name_en: "Sales Representative", name_ar: "مندوب مبيعات" },
  { value: "secretary", name_en: "Secretary", name_ar: "سكرتير" },
  { value: "mechanical_engineer", name_en: "Mechanical Engineer", name_ar: "مهندس ميكانيكا" },
  { value: "electrical_engineer", name_en: "Electrical Engineer", name_ar: "مهندس كهرباء" },
  { value: "software_engineer", name_en: "Software Engineer", name_ar: "مهندس برمجيات" },
  { value: "web_developer", name_en: "Web Developer", name_ar: "مطور مواقع" },
  { value: "network_engineer", name_en: "Network Engineer", name_ar: "مهندس شبكات" },
  { value: "project_manager", name_en: "Project Manager", name_ar: "مدير مشروع" },
  { value: "marketing_manager", name_en: "Marketing Manager", name_ar: "مدير تسويق" },
  { value: "hr_manager", name_en: "HR Manager", name_ar: "مدير الموارد البشرية" },
  { value: "architect", name_en: "Architect", name_ar: "مهندس معماري" },
  { value: "civil_engineer", name_en: "Civil Engineer", name_ar: "مهندس مدني" },
  { value: "interior_designer", name_en: "Interior Designer", name_ar: "مصمم داخلي" },
  { value: "data_engineer", name_en: "Data Engineer", name_ar: "مهندس بيانات" },
  { value: "ai_engineer", name_en: "AI Engineer", name_ar: "مهندس ذكاء اصطناعي" },
  { value: "qa_engineer", name_en: "Quality Assurance Engineer", name_ar: "مهندس ضمان الجودة" },
  { value: "lawyer", name_en: "Lawyer", name_ar: "محامي" },
  { value: "executive_manager", name_en: "Executive Manager", name_ar: "مدير تنفيذي" },
  { value: "other", name_en: "Other", name_ar: "أخرى" },
];
