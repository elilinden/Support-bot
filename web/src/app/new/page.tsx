"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  ShieldAlert,
  Phone,
  FileText,
  Calendar,
  Clock,
  MapPinned,
  Plus,
  Trash2,
  Baby,
  Gavel,
  ClipboardCheck,
  CheckSquare,
  AlertTriangle,
  Send,
  Heart,
  Smartphone,
  Camera,
  Mail,
  Video,
  Mic,
  Globe,
  FileCheck,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useSessionStore, useSettingsStore } from "@/lib/store";
import {
  RELATIONSHIP_LABELS,
  LIVING_SITUATION_LABELS,
  NY_COUNTIES,
  RELIEF_LABELS,
  type RelationshipCategory,
  type LivingSituation,
  type ReliefType,
  createDefaultOPFacts,
  DEFAULT_JURISDICTION,
  type Incident,
} from "@/lib/types";
import { generateId, containsSensitiveInfo, getSensitiveWarning } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ProgressBar } from "@/components/ui/ProgressBar";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_TITLES = [
  "County & Relationship",
  "Safety Check",
  "What Happened",
  "Children & Existing Cases",
  "Evidence & Relief",
  "Review & Confirm",
] as const;

const TOTAL_STEPS = STEP_TITLES.length;

const EVIDENCE_ITEMS: { key: keyof Omit<typeof _evidenceDefaults, "other">; label: string; icon: React.ElementType }[] = [
  { key: "texts", label: "Text messages / SMS", icon: Smartphone },
  { key: "callRecords", label: "Call records / logs", icon: Phone },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "photos", label: "Photos of injuries / damage", icon: Camera },
  { key: "videos", label: "Video recordings", icon: Video },
  { key: "medicalRecords", label: "Medical records", icon: FileCheck },
  { key: "policeReports", label: "Police reports", icon: FileText },
  { key: "witnesses", label: "Witness statements", icon: UserCheck },
  { key: "voicemails", label: "Voicemails", icon: Mic },
  { key: "socialMedia", label: "Social media posts / messages", icon: Globe },
];

// Dummy reference to type-check evidence keys against EvidenceInventory
const _evidenceDefaults = {
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
};

type SafeNowValue = "yes" | "no" | "prefer_not_to_say";

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Sensitive-info warning component
// ---------------------------------------------------------------------------

function SensitiveWarning() {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      <span>{getSensitiveWarning()}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NewIntakePage() {
  const router = useRouter();
  const createSession = useSessionStore((s) => s.createSession);
  const savedCounty = useSettingsStore((s) => s.county);

  // Step tracking
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // ----- Step 1: County & Relationship -----
  const [county, setCounty] = useState(savedCounty || "");
  const [relationship, setRelationship] = useState<RelationshipCategory | "">("");
  const [livingSituation, setLivingSituation] = useState<LivingSituation | "">("");
  const [cohabitationDetails, setCohabitationDetails] = useState("");

  // ----- Step 2: Safety Check -----
  const [safeNow, setSafeNow] = useState<SafeNowValue | "">("");
  const [threatsOfEscalation, setThreatsOfEscalation] = useState("");
  const [firearmsPresent, setFirearmsPresent] = useState<boolean | null>(null);
  const [firearmsDetails, setFirearmsDetails] = useState("");
  const [strangulation, setStrangulation] = useState<boolean | null>(null);
  const [technologyAbuse, setTechnologyAbuse] = useState("");

  // ----- Step 3: What Happened -----
  const [recentDescription, setRecentDescription] = useState("");
  const [recentDate, setRecentDate] = useState("");
  const [recentTime, setRecentTime] = useState("");
  const [recentLocation, setRecentLocation] = useState("");
  const [recentInjuries, setRecentInjuries] = useState("");
  const [recentThreats, setRecentThreats] = useState("");
  const [recentWitnesses, setRecentWitnesses] = useState("");
  const [additionalIncidents, setAdditionalIncidents] = useState<Incident[]>([]);
  const [patternDescription, setPatternDescription] = useState("");

  // ----- Step 4: Children & Existing Cases -----
  const [childrenInvolved, setChildrenInvolved] = useState<boolean | null>(null);
  const [numberOfChildren, setNumberOfChildren] = useState(0);
  const [childrenWitnessedAbuse, setChildrenWitnessedAbuse] = useState<boolean | null>(null);
  const [childrenDirectlyHarmed, setChildrenDirectlyHarmed] = useState<boolean | null>(null);
  const [childrenDetails, setChildrenDetails] = useState("");
  const [existingOP, setExistingOP] = useState<boolean | null>(null);
  const [existingOPDetails, setExistingOPDetails] = useState("");
  const [pendingFamily, setPendingFamily] = useState<boolean | null>(null);
  const [pendingFamilyDetails, setPendingFamilyDetails] = useState("");
  const [pendingCriminal, setPendingCriminal] = useState<boolean | null>(null);
  const [pendingCriminalDetails, setPendingCriminalDetails] = useState("");

  // ----- Step 5: Evidence & Relief -----
  const [evidenceTexts, setEvidenceTexts] = useState(false);
  const [evidenceCallRecords, setEvidenceCallRecords] = useState(false);
  const [evidenceEmails, setEvidenceEmails] = useState(false);
  const [evidencePhotos, setEvidencePhotos] = useState(false);
  const [evidenceVideos, setEvidenceVideos] = useState(false);
  const [evidenceMedical, setEvidenceMedical] = useState(false);
  const [evidencePolice, setEvidencePolice] = useState(false);
  const [evidenceWitnesses, setEvidenceWitnesses] = useState(false);
  const [evidenceVoicemails, setEvidenceVoicemails] = useState(false);
  const [evidenceSocialMedia, setEvidenceSocialMedia] = useState(false);
  const [evidenceOther, setEvidenceOther] = useState("");
  const [requestedRelief, setRequestedRelief] = useState<ReliefType[]>([]);
  const [otherReliefDetails, setOtherReliefDetails] = useState("");

  // Evidence toggle map for cleaner iteration
  const evidenceState: Record<string, { value: boolean; setter: (v: boolean) => void }> = {
    texts: { value: evidenceTexts, setter: setEvidenceTexts },
    callRecords: { value: evidenceCallRecords, setter: setEvidenceCallRecords },
    emails: { value: evidenceEmails, setter: setEvidenceEmails },
    photos: { value: evidencePhotos, setter: setEvidencePhotos },
    videos: { value: evidenceVideos, setter: setEvidenceVideos },
    medicalRecords: { value: evidenceMedical, setter: setEvidenceMedical },
    policeReports: { value: evidencePolice, setter: setEvidencePolice },
    witnesses: { value: evidenceWitnesses, setter: setEvidenceWitnesses },
    voicemails: { value: evidenceVoicemails, setter: setEvidenceVoicemails },
    socialMedia: { value: evidenceSocialMedia, setter: setEvidenceSocialMedia },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const progressPercent = useMemo(
    () => Math.round(((currentStep + 1) / TOTAL_STEPS) * 100),
    [currentStep]
  );

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const addIncident = useCallback(() => {
    const newIncident: Incident = {
      id: generateId(),
      date: "",
      time: "",
      location: "",
      whatHappened: "",
      injuries: "",
      threats: "",
      witnesses: "",
      evidence: "",
    };
    setAdditionalIncidents((prev) => [...prev, newIncident]);
  }, []);

  const removeIncident = useCallback((id: string) => {
    setAdditionalIncidents((prev) => prev.filter((inc) => inc.id !== id));
  }, []);

  const updateIncident = useCallback(
    (id: string, field: keyof Incident, value: string) => {
      setAdditionalIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc))
      );
    },
    []
  );

  const toggleRelief = useCallback((type: ReliefType) => {
    setRequestedRelief((prev) =>
      prev.includes(type) ? prev.filter((r) => r !== type) : [...prev, type]
    );
  }, []);

  // Track which text fields have sensitive info
  const sensitiveFields = useMemo(() => {
    const fields: Record<string, boolean> = {};
    fields.cohabitationDetails = containsSensitiveInfo(cohabitationDetails);
    fields.threatsOfEscalation = containsSensitiveInfo(threatsOfEscalation);
    fields.firearmsDetails = containsSensitiveInfo(firearmsDetails);
    fields.technologyAbuse = containsSensitiveInfo(technologyAbuse);
    fields.recentDescription = containsSensitiveInfo(recentDescription);
    fields.recentInjuries = containsSensitiveInfo(recentInjuries);
    fields.recentThreats = containsSensitiveInfo(recentThreats);
    fields.recentWitnesses = containsSensitiveInfo(recentWitnesses);
    fields.patternDescription = containsSensitiveInfo(patternDescription);
    fields.childrenDetails = containsSensitiveInfo(childrenDetails);
    fields.existingOPDetails = containsSensitiveInfo(existingOPDetails);
    fields.pendingFamilyDetails = containsSensitiveInfo(pendingFamilyDetails);
    fields.pendingCriminalDetails = containsSensitiveInfo(pendingCriminalDetails);
    fields.evidenceOther = containsSensitiveInfo(evidenceOther);
    fields.otherReliefDetails = containsSensitiveInfo(otherReliefDetails);
    return fields;
  }, [
    cohabitationDetails,
    threatsOfEscalation,
    firearmsDetails,
    technologyAbuse,
    recentDescription,
    recentInjuries,
    recentThreats,
    recentWitnesses,
    patternDescription,
    childrenDetails,
    existingOPDetails,
    pendingFamilyDetails,
    pendingCriminalDetails,
    evidenceOther,
    otherReliefDetails,
  ]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    const opFacts = createDefaultOPFacts();

    // Relationship & county
    opFacts.relationship = relationship;
    opFacts.livingSituation = livingSituation;
    opFacts.cohabitationDetails = cohabitationDetails;
    opFacts.mostRecentIncidentDate = recentDate;
    opFacts.mostRecentIncidentTime = recentTime;

    // Build most recent incident + additional incidents
    const allIncidents: Incident[] = [];
    if (recentDescription.trim()) {
      allIncidents.push({
        id: generateId(),
        date: recentDate,
        time: recentTime,
        location: recentLocation,
        whatHappened: recentDescription,
        injuries: recentInjuries,
        threats: recentThreats,
        witnesses: recentWitnesses,
        evidence: "",
      });
    }
    allIncidents.push(...additionalIncidents);
    opFacts.incidents = allIncidents;
    opFacts.patternDescription = patternDescription;

    // Safety
    opFacts.safety = {
      safeNow: safeNow === "yes" ? true : safeNow === "no" ? false : null,
      threatsOfEscalation,
      firearmsPresent,
      firearmsDetails,
      strangulation,
      suicideThreats: null,
      petHarm: null,
      technologyAbuse,
    };

    // Children
    opFacts.children = {
      childrenInvolved,
      numberOfChildren,
      childrenWitnessedAbuse,
      childrenDirectlyHarmed,
      childrenDetails,
    };

    // Existing cases
    opFacts.existingCases = {
      existingOrderOfProtection: existingOP,
      existingOPDetails,
      pendingFamilyCase: pendingFamily,
      pendingFamilyCaseDetails: pendingFamilyDetails,
      pendingCriminalCase: pendingCriminal,
      pendingCriminalCaseDetails: pendingCriminalDetails,
    };

    // Evidence
    opFacts.evidence = {
      texts: evidenceTexts,
      callRecords: evidenceCallRecords,
      emails: evidenceEmails,
      photos: evidencePhotos,
      videos: evidenceVideos,
      medicalRecords: evidenceMedical,
      policeReports: evidencePolice,
      witnesses: evidenceWitnesses,
      voicemails: evidenceVoicemails,
      socialMedia: evidenceSocialMedia,
      other: evidenceOther,
    };

    // Relief
    opFacts.requestedRelief = requestedRelief;
    opFacts.otherReliefDetails = otherReliefDetails;

    const jurisdiction = {
      ...DEFAULT_JURISDICTION,
      county,
    };

    const sessionId = createSession({
      jurisdiction,
      opFacts,
      intakeCompleted: true,
      intakeStep: TOTAL_STEPS,
      progressPercent: 15,
      status: "interview",
      title: county
        ? `OP Case - ${county} County`
        : "Order of Protection Case",
    });

    router.push(`/case/${sessionId}/interview`);
  }, [
    county,
    relationship,
    livingSituation,
    cohabitationDetails,
    safeNow,
    threatsOfEscalation,
    firearmsPresent,
    firearmsDetails,
    strangulation,
    technologyAbuse,
    recentDescription,
    recentDate,
    recentTime,
    recentLocation,
    recentInjuries,
    recentThreats,
    recentWitnesses,
    additionalIncidents,
    patternDescription,
    childrenInvolved,
    numberOfChildren,
    childrenWitnessedAbuse,
    childrenDirectlyHarmed,
    childrenDetails,
    existingOP,
    existingOPDetails,
    pendingFamily,
    pendingFamilyDetails,
    pendingCriminal,
    pendingCriminalDetails,
    evidenceTexts,
    evidenceCallRecords,
    evidenceEmails,
    evidencePhotos,
    evidenceVideos,
    evidenceMedical,
    evidencePolice,
    evidenceWitnesses,
    evidenceVoicemails,
    evidenceSocialMedia,
    evidenceOther,
    requestedRelief,
    otherReliefDetails,
    createSession,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Boolean toggle helper
  // ---------------------------------------------------------------------------

  function BooleanToggle({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean | null;
    onChange: (v: boolean | null) => void;
  }) {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">
          {label}
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              value === true
                ? "bg-accent-mint/20 text-accent-mint border border-accent-mint/40"
                : "btn-ghost border border-white/10"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              value === false
                ? "bg-accent-rose/20 text-accent-rose border border-accent-rose/40"
                : "btn-ghost border border-white/10"
            }`}
          >
            No
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <MapPin className="mr-2 inline h-5 w-5 text-accent-mint" />
            County & Relationship
          </h2>
          <p className="text-sm text-white/50">
            Tell us where you plan to file and your relationship to the person
            you need protection from.
          </p>
        </div>

        {/* County */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Which NY county will you file in?
          </label>
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="glass-input"
          >
            <option value="">Select a county...</option>
            {NY_COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Relationship */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            <Users className="mr-1.5 inline h-4 w-4 text-accent-blue" />
            Relationship to the respondent
          </label>
          <p className="mb-3 text-xs text-white/40">
            Under FCA section 812, Family Court can only issue an OP if the
            parties have one of these relationships.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              Object.entries(RELATIONSHIP_LABELS) as [
                RelationshipCategory,
                string,
              ][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRelationship(key)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  relationship === key
                    ? "border-accent-mint/40 bg-accent-mint/10 text-accent-mint"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Living Situation */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Current living situation
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              Object.entries(LIVING_SITUATION_LABELS) as [
                LivingSituation,
                string,
              ][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLivingSituation(key)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  livingSituation === key
                    ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cohabitation details */}
        {(livingSituation === "living_together" ||
          livingSituation === "recently_separated") && (
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Cohabitation details (optional)
            </label>
            <textarea
              value={cohabitationDetails}
              onChange={(e) => setCohabitationDetails(e.target.value)}
              className="glass-input min-h-[80px] resize-y"
              placeholder="e.g., How long lived together, shared lease, etc."
            />
            {sensitiveFields.cohabitationDetails && <SensitiveWarning />}
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <ShieldAlert className="mr-2 inline h-5 w-5 text-accent-rose" />
            Safety Check
          </h2>
          <p className="text-sm text-white/50">
            Your safety is the top priority. This information helps us
            understand urgency and provide appropriate resources.
          </p>
        </div>

        {/* Safe right now? */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Are you safe right now?
          </label>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["yes", "Yes, I am safe"],
                ["no", "No, I am not safe"],
                ["prefer_not_to_say", "Prefer not to say"],
              ] as [SafeNowValue, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setSafeNow(val)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  safeNow === val
                    ? val === "no"
                      ? "border-accent-rose/40 bg-accent-rose/15 text-accent-rose"
                      : val === "yes"
                        ? "border-accent-mint/40 bg-accent-mint/15 text-accent-mint"
                        : "border-accent-blue/40 bg-accent-blue/15 text-accent-blue"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Emergency resources -- prominent when not safe */}
        {safeNow === "no" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-accent-rose/40 bg-accent-rose/10 p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-5 w-5 text-accent-rose" />
              <h3 className="text-lg font-bold text-accent-rose">
                Emergency Resources
              </h3>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>
                <strong>Call 911</strong> if you are in immediate danger.
              </p>
              <p>
                <strong>NY Domestic Violence Hotline:</strong>{" "}
                <a
                  href="tel:18009426906"
                  className="font-semibold text-accent-rose underline"
                >
                  1-800-942-6906
                </a>{" "}
                (24/7, multilingual)
              </p>
              <p>
                <strong>National DV Hotline:</strong>{" "}
                <a
                  href="tel:18007997233"
                  className="font-semibold text-accent-rose underline"
                >
                  1-800-799-7233
                </a>
              </p>
              <p>
                <strong>Text:</strong> START to 88788
              </p>
              <p className="mt-3 text-xs text-white/50">
                If the respondent monitors your phone, consider using a
                different device or calling from a safe location.
              </p>
            </div>
          </motion.div>
        )}

        {/* Threats of escalation */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Are there threats of escalation?
          </label>
          <textarea
            value={threatsOfEscalation}
            onChange={(e) => setThreatsOfEscalation(e.target.value)}
            className="glass-input min-h-[80px] resize-y"
            placeholder='e.g., "Threatened to kill me if I leave", "Says it will get worse"'
          />
          {sensitiveFields.threatsOfEscalation && <SensitiveWarning />}
        </div>

        {/* Firearms */}
        <BooleanToggle
          label="Does the respondent have access to firearms?"
          value={firearmsPresent}
          onChange={setFirearmsPresent}
        />
        {firearmsPresent === true && (
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Firearms details
            </label>
            <textarea
              value={firearmsDetails}
              onChange={(e) => setFirearmsDetails(e.target.value)}
              className="glass-input min-h-[60px] resize-y"
              placeholder="Type, number, location of firearms if known"
            />
            {sensitiveFields.firearmsDetails && <SensitiveWarning />}
          </div>
        )}

        {/* Strangulation */}
        <BooleanToggle
          label="History of strangulation / choking?"
          value={strangulation}
          onChange={setStrangulation}
        />
        {strangulation === true && (
          <GlassCard className="border-accent-rose/20 p-4">
            <div className="flex items-start gap-2 text-sm text-white/70">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-rose" />
              <p>
                Strangulation is a significant lethality indicator. This will be
                flagged as a critical safety concern for your case.
              </p>
            </div>
          </GlassCard>
        )}

        {/* Technology abuse */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            <Smartphone className="mr-1.5 inline h-4 w-4 text-accent-purple" />
            Technology abuse?
          </label>
          <textarea
            value={technologyAbuse}
            onChange={(e) => setTechnologyAbuse(e.target.value)}
            className="glass-input min-h-[80px] resize-y"
            placeholder="e.g., Tracking via phone, monitoring texts, controlling social media, sharing intimate images"
          />
          {sensitiveFields.technologyAbuse && <SensitiveWarning />}
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <FileText className="mr-2 inline h-5 w-5 text-accent-blue" />
            What Happened
          </h2>
          <p className="text-sm text-white/50">
            Describe the most recent incident and any pattern of behavior. The
            court needs specific details about dates, locations, and what
            occurred.
          </p>
        </div>

        {/* Most recent incident */}
        <GlassCard className="space-y-4 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-mint/80">
            Most Recent Incident
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">
                <Calendar className="mr-1 inline h-3.5 w-3.5" />
                Date
              </label>
              <input
                type="date"
                value={recentDate}
                onChange={(e) => setRecentDate(e.target.value)}
                className="glass-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                Approximate time
              </label>
              <input
                type="time"
                value={recentTime}
                onChange={(e) => setRecentTime(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              <MapPinned className="mr-1 inline h-3.5 w-3.5" />
              Location
            </label>
            <input
              type="text"
              value={recentLocation}
              onChange={(e) => setRecentLocation(e.target.value)}
              className="glass-input"
              placeholder="Where did this happen?"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              What happened?
            </label>
            <textarea
              value={recentDescription}
              onChange={(e) => setRecentDescription(e.target.value)}
              className="glass-input min-h-[120px] resize-y"
              placeholder="Describe what happened in as much detail as you feel comfortable sharing. Include specific actions, words spoken, and the sequence of events."
            />
            {sensitiveFields.recentDescription && <SensitiveWarning />}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              Injuries sustained
            </label>
            <textarea
              value={recentInjuries}
              onChange={(e) => setRecentInjuries(e.target.value)}
              className="glass-input min-h-[60px] resize-y"
              placeholder="Describe any injuries. Did you seek medical attention?"
            />
            {sensitiveFields.recentInjuries && <SensitiveWarning />}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              Threats made
            </label>
            <textarea
              value={recentThreats}
              onChange={(e) => setRecentThreats(e.target.value)}
              className="glass-input min-h-[60px] resize-y"
              placeholder="Were any threats made? Quote them if you can."
            />
            {sensitiveFields.recentThreats && <SensitiveWarning />}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              Witnesses
            </label>
            <textarea
              value={recentWitnesses}
              onChange={(e) => setRecentWitnesses(e.target.value)}
              className="glass-input min-h-[60px] resize-y"
              placeholder="Was anyone else present? Names not required at this stage."
            />
            {sensitiveFields.recentWitnesses && <SensitiveWarning />}
          </div>
        </GlassCard>

        {/* Additional past incidents */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Additional Past Incidents
            </h3>
            <button
              type="button"
              onClick={addIncident}
              className="btn-ghost text-sm text-accent-mint"
            >
              <Plus className="h-4 w-4" />
              Add Incident
            </button>
          </div>

          {additionalIncidents.length === 0 && (
            <p className="text-sm italic text-white/30">
              No additional incidents added. Click &quot;Add Incident&quot; to
              describe prior events.
            </p>
          )}

          <div className="space-y-4">
            {additionalIncidents.map((inc, idx) => (
              <GlassCard key={inc.id} className="relative p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-accent-purple">
                    Past Incident #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIncident(inc.id)}
                    className="btn-ghost text-xs text-accent-rose"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={inc.date}
                      onChange={(e) =>
                        updateIncident(inc.id, "date", e.target.value)
                      }
                      className="glass-input"
                      placeholder="Date"
                    />
                    <input
                      type="time"
                      value={inc.time}
                      onChange={(e) =>
                        updateIncident(inc.id, "time", e.target.value)
                      }
                      className="glass-input"
                      placeholder="Time"
                    />
                  </div>
                  <input
                    type="text"
                    value={inc.location}
                    onChange={(e) =>
                      updateIncident(inc.id, "location", e.target.value)
                    }
                    className="glass-input"
                    placeholder="Location"
                  />
                  <textarea
                    value={inc.whatHappened}
                    onChange={(e) =>
                      updateIncident(inc.id, "whatHappened", e.target.value)
                    }
                    className="glass-input min-h-[80px] resize-y"
                    placeholder="What happened?"
                  />
                  <textarea
                    value={inc.injuries}
                    onChange={(e) =>
                      updateIncident(inc.id, "injuries", e.target.value)
                    }
                    className="glass-input min-h-[50px] resize-y"
                    placeholder="Injuries"
                  />
                  <textarea
                    value={inc.threats}
                    onChange={(e) =>
                      updateIncident(inc.id, "threats", e.target.value)
                    }
                    className="glass-input min-h-[50px] resize-y"
                    placeholder="Threats made"
                  />
                  <input
                    type="text"
                    value={inc.witnesses}
                    onChange={(e) =>
                      updateIncident(inc.id, "witnesses", e.target.value)
                    }
                    className="glass-input"
                    placeholder="Witnesses"
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Pattern description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Overall pattern of behavior
          </label>
          <textarea
            value={patternDescription}
            onChange={(e) => setPatternDescription(e.target.value)}
            className="glass-input min-h-[100px] resize-y"
            placeholder="Describe the overall pattern: How long has this been going on? How often? Is it getting worse? Types of abuse (physical, verbal, emotional, financial, sexual)."
          />
          {sensitiveFields.patternDescription && <SensitiveWarning />}
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <Baby className="mr-2 inline h-5 w-5 text-accent-purple" />
            Children & Existing Cases
          </h2>
          <p className="text-sm text-white/50">
            The court needs to know about children involved and any existing
            legal proceedings.
          </p>
        </div>

        {/* Children */}
        <GlassCard className="space-y-4 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-purple/80">
            Children
          </h3>

          <BooleanToggle
            label="Are children involved?"
            value={childrenInvolved}
            onChange={setChildrenInvolved}
          />

          {childrenInvolved === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Number of children
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={numberOfChildren}
                  onChange={(e) =>
                    setNumberOfChildren(
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  className="glass-input w-32"
                />
              </div>

              <BooleanToggle
                label="Have children witnessed abuse?"
                value={childrenWitnessedAbuse}
                onChange={setChildrenWitnessedAbuse}
              />

              <BooleanToggle
                label="Have children been directly harmed?"
                value={childrenDirectlyHarmed}
                onChange={setChildrenDirectlyHarmed}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">
                  Additional details about children
                </label>
                <textarea
                  value={childrenDetails}
                  onChange={(e) => setChildrenDetails(e.target.value)}
                  className="glass-input min-h-[80px] resize-y"
                  placeholder="Ages of children, custody arrangements, any concerns about their safety"
                />
                {sensitiveFields.childrenDetails && <SensitiveWarning />}
              </div>
            </motion.div>
          )}
        </GlassCard>

        {/* Existing Cases */}
        <GlassCard className="space-y-4 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-blue/80">
            <Gavel className="mr-1.5 inline h-4 w-4" />
            Existing Cases & Orders
          </h3>

          <BooleanToggle
            label="Is there an existing Order of Protection?"
            value={existingOP}
            onChange={setExistingOP}
          />
          {existingOP === true && (
            <div>
              <textarea
                value={existingOPDetails}
                onChange={(e) => setExistingOPDetails(e.target.value)}
                className="glass-input min-h-[60px] resize-y"
                placeholder="Details: Court, docket number, expiration date, conditions"
              />
              {sensitiveFields.existingOPDetails && <SensitiveWarning />}
            </div>
          )}

          <BooleanToggle
            label="Any pending Family Court case?"
            value={pendingFamily}
            onChange={setPendingFamily}
          />
          {pendingFamily === true && (
            <div>
              <textarea
                value={pendingFamilyDetails}
                onChange={(e) => setPendingFamilyDetails(e.target.value)}
                className="glass-input min-h-[60px] resize-y"
                placeholder="Details: Type of case, court, docket number"
              />
              {sensitiveFields.pendingFamilyDetails && <SensitiveWarning />}
            </div>
          )}

          <BooleanToggle
            label="Any pending criminal case?"
            value={pendingCriminal}
            onChange={setPendingCriminal}
          />
          {pendingCriminal === true && (
            <div>
              <textarea
                value={pendingCriminalDetails}
                onChange={(e) => setPendingCriminalDetails(e.target.value)}
                className="glass-input min-h-[60px] resize-y"
                placeholder="Details: Charges, court, docket/indictment number"
              />
              {sensitiveFields.pendingCriminalDetails && <SensitiveWarning />}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <ClipboardCheck className="mr-2 inline h-5 w-5 text-accent-mint" />
            Evidence & Relief
          </h2>
          <p className="text-sm text-white/50">
            Check what evidence you have available and what relief you want the
            court to order.
          </p>
        </div>

        {/* Evidence Inventory */}
        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent-mint/80">
            Evidence You Have
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {EVIDENCE_ITEMS.map((item) => {
              const state = evidenceState[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => state.setter(!state.value)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    state.value
                      ? "border-accent-mint/40 bg-accent-mint/10 text-accent-mint"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {state.value && (
                    <CheckSquare className="ml-auto h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-white/80">
              Other evidence
            </label>
            <input
              type="text"
              value={evidenceOther}
              onChange={(e) => setEvidenceOther(e.target.value)}
              className="glass-input"
              placeholder="Describe any other evidence you have"
            />
            {sensitiveFields.evidenceOther && <SensitiveWarning />}
          </div>
        </GlassCard>

        {/* Requested Relief */}
        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent-blue/80">
            Requested Relief
          </h3>
          <p className="mb-4 text-xs text-white/40">
            Select the types of protection you want the court to order. You can
            request multiple types.
          </p>
          <div className="space-y-2">
            {(
              Object.entries(RELIEF_LABELS) as [ReliefType, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleRelief(key)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  requestedRelief.includes(key)
                    ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                }`}
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all ${
                    requestedRelief.includes(key)
                      ? "border-accent-blue bg-accent-blue"
                      : "border-white/30"
                  }`}
                >
                  {requestedRelief.includes(key) && (
                    <CheckSquare className="h-3.5 w-3.5 text-black" />
                  )}
                </div>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {requestedRelief.includes("other") && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-white/80">
                Describe other conditions requested
              </label>
              <textarea
                value={otherReliefDetails}
                onChange={(e) => setOtherReliefDetails(e.target.value)}
                className="glass-input min-h-[60px] resize-y"
                placeholder="What other conditions do you want the court to order?"
              />
              {sensitiveFields.otherReliefDetails && <SensitiveWarning />}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  function renderStep6() {
    const safeNowLabel =
      safeNow === "yes"
        ? "Yes"
        : safeNow === "no"
          ? "No"
          : safeNow === "prefer_not_to_say"
            ? "Prefer not to say"
            : "Not answered";

    const selectedEvidenceLabels = EVIDENCE_ITEMS.filter(
      (item) => evidenceState[item.key]?.value
    ).map((item) => item.label);
    if (evidenceOther.trim()) {
      selectedEvidenceLabels.push(`Other: ${evidenceOther}`);
    }

    const selectedReliefLabels = requestedRelief.map(
      (key) => RELIEF_LABELS[key]
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-white/90">
            <CheckSquare className="mr-2 inline h-5 w-5 text-accent-mint" />
            Review & Confirm
          </h2>
          <p className="text-sm text-white/50">
            Review your information below. You can go back to any step to make
            changes. When ready, confirm to start your coaching session.
          </p>
        </div>

        {/* County & Relationship */}
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-mint/80">
            <MapPin className="h-4 w-4" />
            County & Relationship
          </h3>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex justify-between">
              <span className="text-white/50">County:</span>
              <span className="font-medium text-white/90">
                {county || "Not selected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Relationship:</span>
              <span className="font-medium text-white/90">
                {relationship
                  ? RELATIONSHIP_LABELS[relationship]
                  : "Not selected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Living situation:</span>
              <span className="font-medium text-white/90">
                {livingSituation
                  ? LIVING_SITUATION_LABELS[livingSituation]
                  : "Not selected"}
              </span>
            </div>
            {cohabitationDetails && (
              <div>
                <span className="text-white/50">
                  Cohabitation details:{" "}
                </span>
                <span className="text-white/80">{cohabitationDetails}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Safety */}
        <GlassCard
          className={`p-5 ${safeNow === "no" ? "border-accent-rose/30" : ""}`}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-rose/80">
            <ShieldAlert className="h-4 w-4" />
            Safety
          </h3>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex justify-between">
              <span className="text-white/50">Safe now:</span>
              <span
                className={`font-medium ${safeNow === "no" ? "text-accent-rose" : "text-white/90"}`}
              >
                {safeNowLabel}
              </span>
            </div>
            {threatsOfEscalation && (
              <div>
                <span className="text-white/50">Escalation threats: </span>
                <span className="text-white/80">{threatsOfEscalation}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/50">Firearms:</span>
              <span className="font-medium text-white/90">
                {firearmsPresent === true
                  ? "Yes"
                  : firearmsPresent === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Strangulation history:</span>
              <span className="font-medium text-white/90">
                {strangulation === true
                  ? "Yes"
                  : strangulation === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
            {technologyAbuse && (
              <div>
                <span className="text-white/50">Technology abuse: </span>
                <span className="text-white/80">{technologyAbuse}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Incidents */}
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-blue/80">
            <FileText className="h-4 w-4" />
            Incidents
          </h3>
          <div className="space-y-2 text-sm text-white/70">
            {recentDescription ? (
              <div>
                <span className="font-medium text-white/80">
                  Most recent ({recentDate || "no date"}):
                </span>
                <p className="mt-1 text-white/60">
                  {recentDescription.length > 200
                    ? recentDescription.substring(0, 200) + "..."
                    : recentDescription}
                </p>
              </div>
            ) : (
              <p className="italic text-white/40">
                No incident description provided.
              </p>
            )}
            {additionalIncidents.length > 0 && (
              <p className="text-white/50">
                + {additionalIncidents.length} additional past incident
                {additionalIncidents.length !== 1 ? "s" : ""} recorded
              </p>
            )}
            {patternDescription && (
              <div>
                <span className="text-white/50">Pattern: </span>
                <span className="text-white/80">
                  {patternDescription.length > 150
                    ? patternDescription.substring(0, 150) + "..."
                    : patternDescription}
                </span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Children & Cases */}
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-purple/80">
            <Baby className="h-4 w-4" />
            Children & Cases
          </h3>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex justify-between">
              <span className="text-white/50">Children involved:</span>
              <span className="font-medium text-white/90">
                {childrenInvolved === true
                  ? `Yes (${numberOfChildren})`
                  : childrenInvolved === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
            {childrenInvolved === true && (
              <>
                <div className="flex justify-between">
                  <span className="text-white/50">Witnessed abuse:</span>
                  <span className="text-white/90">
                    {childrenWitnessedAbuse === true
                      ? "Yes"
                      : childrenWitnessedAbuse === false
                        ? "No"
                        : "Not answered"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Directly harmed:</span>
                  <span className="text-white/90">
                    {childrenDirectlyHarmed === true
                      ? "Yes"
                      : childrenDirectlyHarmed === false
                        ? "No"
                        : "Not answered"}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-white/50">Existing OP:</span>
              <span className="text-white/90">
                {existingOP === true
                  ? "Yes"
                  : existingOP === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Pending family case:</span>
              <span className="text-white/90">
                {pendingFamily === true
                  ? "Yes"
                  : pendingFamily === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Pending criminal case:</span>
              <span className="text-white/90">
                {pendingCriminal === true
                  ? "Yes"
                  : pendingCriminal === false
                    ? "No"
                    : "Not answered"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Evidence & Relief */}
        <GlassCard className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-mint/80">
            <ClipboardCheck className="h-4 w-4" />
            Evidence & Relief
          </h3>
          <div className="space-y-3 text-sm text-white/70">
            <div>
              <span className="text-white/50">Evidence available:</span>
              {selectedEvidenceLabels.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedEvidenceLabels.map((label) => (
                    <span
                      key={label}
                      className="badge-success"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 italic text-white/40">
                  No evidence selected
                </p>
              )}
            </div>
            <div>
              <span className="text-white/50">Requested relief:</span>
              {selectedReliefLabels.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedReliefLabels.map((label) => (
                    <span
                      key={label}
                      className="badge-info"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 italic text-white/40">
                  No relief selected
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Disclaimer */}
        <GlassCard className="border-yellow-500/20 p-4">
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
            <div className="text-white/60">
              <p className="mb-1 font-semibold text-yellow-400">
                Before you continue
              </p>
              <p>
                This tool provides <strong>educational information only</strong>.
                It is not legal advice. Your data is stored locally in your
                browser and is not transmitted to any server except during active
                coaching conversations. You can edit or delete your session at
                any time.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step content map
  // ---------------------------------------------------------------------------

  const stepRenderers = [
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl">
        {/* Header / Progress */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-white/90 sm:text-3xl">
            New Case Intake
          </h1>
          <p className="mb-6 text-sm text-white/50">
            Step {currentStep + 1} of {TOTAL_STEPS}:{" "}
            <span className="font-medium text-white/70">
              {STEP_TITLES[currentStep]}
            </span>
          </p>

          {/* Step indicator dots */}
          <div className="mb-4 flex items-center gap-2">
            {STEP_TITLES.map((title, idx) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  setDirection(idx > currentStep ? 1 : -1);
                  setCurrentStep(idx);
                }}
                className="group relative flex-1"
                title={title}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx < currentStep
                      ? "bg-accent-mint"
                      : idx === currentStep
                        ? "bg-gradient-to-r from-accent-mint to-accent-blue"
                        : "bg-white/10"
                  }`}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/0 transition-all group-hover:text-white/50">
                  {title}
                </span>
              </button>
            ))}
          </div>

          <ProgressBar
            value={progressPercent}
            label="Intake progress"
          />
        </div>

        {/* Step content with animated transitions */}
        <div className="relative min-h-[400px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {stepRenderers[currentStep]()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`btn-secondary ${
              currentStep === 0
                ? "cursor-not-allowed opacity-30"
                : ""
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {currentStep < TOTAL_STEPS - 1 ? (
            <button type="button" onClick={goNext} className="btn-primary">
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
            >
              <Send className="h-4 w-4" />
              Start Coaching Session
            </button>
          )}
        </div>

        {/* Safety footer */}
        <div className="mt-8 text-center">
          <GlassCard className="inline-flex items-center gap-2 px-4 py-2">
            <Heart className="h-4 w-4 text-accent-rose" />
            <span className="text-xs text-white/50">
              Need help now? Call{" "}
              <a
                href="tel:18009426906"
                className="font-medium text-accent-rose hover:underline"
              >
                1-800-942-6906
              </a>{" "}
              (NY DV Hotline, 24/7)
            </span>
          </GlassCard>
        </div>
      </div>
    </PageWrapper>
  );
}
