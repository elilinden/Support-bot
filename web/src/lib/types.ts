// ============================================================
// Core types for Pro Se Coach — NY Family Court Orders of Protection
// Scope: Family Offense (Article 8) petitions only
// ============================================================

// -- Jurisdiction is locked to NY Family Court --
export interface Jurisdiction {
  system: "state";
  state: "NY";
  courtLevel: "family";
  county: string; // NY county where filing
}

export const DEFAULT_JURISDICTION: Jurisdiction = {
  system: "state",
  state: "NY",
  courtLevel: "family",
  county: "",
};

// -- Relationship categories per FCA §812 --
export type RelationshipCategory =
  | "spouse"
  | "former_spouse"
  | "parent_child"
  | "child_parent"
  | "intimate_partner"
  | "former_intimate_partner"
  | "persons_with_child_in_common"
  | "members_same_household"
  | "other_family";

export const RELATIONSHIP_LABELS: Record<RelationshipCategory, string> = {
  spouse: "Current spouse",
  former_spouse: "Former spouse",
  parent_child: "Parent of respondent / child relationship",
  child_parent: "Child of respondent / parent relationship",
  intimate_partner: "Current intimate partner",
  former_intimate_partner: "Former intimate partner",
  persons_with_child_in_common: "Person with a child in common",
  members_same_household: "Members of the same household",
  other_family: "Other family member by blood or marriage",
};

// -- Living / cohabitation situation --
export type LivingSituation =
  | "living_together"
  | "recently_separated"
  | "living_apart"
  | "other";

export const LIVING_SITUATION_LABELS: Record<LivingSituation, string> = {
  living_together: "Currently living together",
  recently_separated: "Recently separated",
  living_apart: "Living apart",
  other: "Other",
};

// -- Incident record --
export interface Incident {
  id: string;
  date: string;
  time: string;
  location: string;
  whatHappened: string;
  injuries: string;
  threats: string;
  witnesses: string;
  evidence: string;
}

// -- Safety concerns --
export interface SafetyConcerns {
  safeNow: boolean | null;
  threatsOfEscalation: string;
  firearmsPresent: boolean | null;
  firearmsDetails: string;
  strangulation: boolean | null;
  suicideThreats: boolean | null;
  petHarm: boolean | null;
  technologyAbuse: string;
}

// -- Children involvement --
export interface ChildrenInfo {
  childrenInvolved: boolean | null;
  numberOfChildren: number;
  childrenWitnessedAbuse: boolean | null;
  childrenDirectlyHarmed: boolean | null;
  childrenDetails: string;
}

// -- Existing cases/orders --
export interface ExistingCases {
  existingOrderOfProtection: boolean | null;
  existingOPDetails: string;
  pendingFamilyCase: boolean | null;
  pendingFamilyCaseDetails: string;
  pendingCriminalCase: boolean | null;
  pendingCriminalCaseDetails: string;
}

// -- Evidence inventory --
export interface EvidenceInventory {
  texts: boolean;
  callRecords: boolean;
  emails: boolean;
  photos: boolean;
  videos: boolean;
  medicalRecords: boolean;
  policeReports: boolean;
  witnesses: boolean;
  voicemails: boolean;
  socialMedia: boolean;
  other: string;
}

// -- Requested relief --
export type ReliefType =
  | "stay_away"
  | "no_contact"
  | "exclusive_occupancy"
  | "temporary_custody"
  | "no_firearms"
  | "other";

export const RELIEF_LABELS: Record<ReliefType, string> = {
  stay_away: "Stay away from petitioner (and children/home/work/school)",
  no_contact: "No contact (no calls, texts, emails, third-party contact)",
  exclusive_occupancy: "Exclusive occupancy of shared residence",
  temporary_custody: "Temporary custody of children",
  no_firearms: "Surrender / no firearms",
  other: "Other conditions",
};

// -- OP-specific facts --
export interface OPFacts {
  petitionerName: string;
  respondentName: string;
  relationship: RelationshipCategory | "";
  livingSituation: LivingSituation | "";
  cohabitationDetails: string;
  mostRecentIncidentDate: string;
  mostRecentIncidentTime: string;
  incidents: Incident[];
  patternDescription: string;
  safety: SafetyConcerns;
  children: ChildrenInfo;
  existingCases: ExistingCases;
  evidence: EvidenceInventory;
  requestedRelief: ReliefType[];
  otherReliefDetails: string;
  desiredOutcome: string;
  additionalNotes: string;
}

export function createDefaultOPFacts(): OPFacts {
  return {
    petitionerName: "",
    respondentName: "",
    relationship: "",
    livingSituation: "",
    cohabitationDetails: "",
    mostRecentIncidentDate: "",
    mostRecentIncidentTime: "",
    incidents: [],
    patternDescription: "",
    safety: {
      safeNow: null,
      threatsOfEscalation: "",
      firearmsPresent: null,
      firearmsDetails: "",
      strangulation: null,
      suicideThreats: null,
      petHarm: null,
      technologyAbuse: "",
    },
    children: {
      childrenInvolved: null,
      numberOfChildren: 0,
      childrenWitnessedAbuse: null,
      childrenDirectlyHarmed: null,
      childrenDetails: "",
    },
    existingCases: {
      existingOrderOfProtection: null,
      existingOPDetails: "",
      pendingFamilyCase: null,
      pendingFamilyCaseDetails: "",
      pendingCriminalCase: null,
      pendingCriminalCaseDetails: "",
    },
    evidence: {
      texts: false,
      callRecords: false,
      emails: false,
      photos: false,
      videos: false,
      medicalRecords: false,
      policeReports: false,
      witnesses: false,
      voicemails: false,
      socialMedia: false,
      other: "",
    },
    requestedRelief: [],
    otherReliefDetails: "",
    desiredOutcome: "",
    additionalNotes: "",
  };
}

// -- Timeline event --
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  isDeadline: boolean;
}

// -- Conversation --
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

// -- Generated artifacts (OP-specific outputs) --
export type ArtifactType =
  | "two_minute_script"
  | "five_minute_outline"
  | "evidence_checklist"
  | "timeline"
  | "what_to_bring"
  | "what_to_expect"
  | "general";

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  two_minute_script: "2-Minute Script",
  five_minute_outline: "5-Minute Outline",
  evidence_checklist: "Evidence Checklist",
  timeline: "Incident Timeline",
  what_to_bring: "What to Bring",
  what_to_expect: "What to Expect",
  general: "General",
};

export interface GeneratedArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// -- Safety flags --
export type SafetyFlagSeverity = "info" | "warning" | "critical";

export interface SafetyFlag {
  id: string;
  severity: SafetyFlagSeverity;
  message: string;
  category: "deadline" | "jurisdiction" | "sensitive" | "legal_limit" | "safety" | "general";
  createdAt: string;
}

// -- Uploaded documents --
export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  extractedText: string;
  snippets: string[];
  uploadedAt: string;
}

// -- Case Session (OP-scoped) --
export interface CaseSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  jurisdiction: Jurisdiction;
  title: string;
  opFacts: OPFacts;
  timeline: TimelineEvent[];
  conversation: ConversationMessage[];
  generatedArtifacts: GeneratedArtifact[];
  safetyFlags: SafetyFlag[];
  documents: UploadedDocument[];
  intakeCompleted: boolean;
  intakeStep: number;
  progressPercent: number;
}

// -- User settings (simplified for OP scope) --
export interface UserSettings {
  tone: "formal" | "plain";
  privacyMode: boolean;
  darkMode: boolean;
  county: string;
}

// -- API types --
export interface CoachRequest {
  sessionId: string;
  userMessage: string;
  opFacts: OPFacts;
  jurisdiction: Jurisdiction;
  timeline: TimelineEvent[];
  conversationHistory: ConversationMessage[];
  tone: "formal" | "plain";
}

export interface CoachResponse {
  assistant_message: string;
  next_questions: string[];
  extracted_facts: Partial<OPFacts>;
  missing_fields: string[];
  progress_percent: number;
  safety_flags: Array<{
    severity: SafetyFlagSeverity;
    message: string;
    category: SafetyFlag["category"];
  }>;
  timeline_events: Array<{
    date: string;
    title: string;
    description: string;
    isDeadline: boolean;
  }>;
  suggested_artifacts: Array<{
    type: ArtifactType;
    title: string;
    content: string;
  }>;
}

export interface HealthResponse {
  gemini: "ok" | "missing_key" | "error" | "mock";
  model: string;
  mock: boolean;
}

// -- NY Counties --
export const NY_COUNTIES = [
  "Albany", "Allegany", "Bronx", "Broome", "Cattaraugus", "Cayuga", "Chautauqua",
  "Chemung", "Chenango", "Clinton", "Columbia", "Cortland", "Delaware", "Dutchess",
  "Erie", "Essex", "Franklin", "Fulton", "Genesee", "Greene", "Hamilton", "Herkimer",
  "Jefferson", "Kings (Brooklyn)", "Lewis", "Livingston", "Madison", "Monroe",
  "Montgomery", "Nassau", "New York (Manhattan)", "Niagara", "Oneida", "Onondaga",
  "Ontario", "Orange", "Orleans", "Oswego", "Otsego", "Putnam", "Queens",
  "Rensselaer", "Richmond (Staten Island)", "Rockland", "Saratoga", "Schenectady",
  "Schoharie", "Schuyler", "Seneca", "St. Lawrence", "Steuben", "Suffolk",
  "Sullivan", "Tioga", "Tompkins", "Ulster", "Warren", "Washington", "Wayne",
  "Westchester", "Wyoming", "Yates"
] as const;
