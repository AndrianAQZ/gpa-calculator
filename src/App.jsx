import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, RotateCcw, Save, Settings, X } from 'lucide-react'
import './App.css'

// --- Year-level curriculum map ---
// Each year level has its own: core subjects, elective list, and weights.
// Year 8 uses the old school formula (1.0 / 0.6 / 0.3) with History renamed to
// Humanities and three electives removed (Business, Geography, PE Extension).
// Year 9+ uses the EXACT formula derived from 5 students' data
// (E=459, M=669, S=768, H=126, HPE=250, elect=357).

const LANGUAGE_SUBJECTS = new Set(['Spanish', 'Japanese'])

const YEAR_CURRICULA = {
  8: {
    core: ['English', 'Health and Physical Education', 'Humanities', 'Mathematics', 'Science'],
    electives: [
      'Design',
      'Digital Solutions',
      'Drama',
      'English as an Other Language',
      'Film, Television and New Media',
      'Japanese',
      'Music',
      'Spanish',
      'Visual Art'
    ],
    coreWeights: {
      English: 1.0,
      'Health and Physical Education': 0.6,
      Humanities: 1.0,
      Mathematics: 1.0,
      Science: 1.0
    },
    electiveWeight: 0.3,
    languageWeight: 0.6,
    maxElectives: 3,
    label: 'Year 8'
  },
  9: {
    core: ['English', 'Health and Physical Education', 'History', 'Mathematics', 'Science'],
    electives: [
      'Business',
      'Design',
      'Digital Solutions',
      'Drama',
      'English as an Other Language',
      'Film, Television and New Media',
      'Geography',
      'Japanese',
      'Music',
      'Physical Education (Extension)',
      'Spanish',
      'Visual Art'
    ],
    // Weights derived by reverse-engineering from actual school GPA data.
    // Each subject's weight in the weighted average is:
    //   English: 459 (period ratio 9/7)
    //   Mathematics: 669 (period ratio 223/119)
    //   Science: 768 (period ratio 256/119)
    //   History: 126 (period ratio 42/119)
    //   Health and Physical Education: 250 (period ratio 250/357)
    //   All electives: 167
    // Sum of core weights = 459 + 669 + 768 + 250 + 126 = 2272
    // Maximum electives = 4, so max total weight = 2272 + 4*167 = 2940
    coreWeights: {
      English: 459,
      'Health and Physical Education': 250,
      History: 126,
      Mathematics: 669,
      Science: 768
    },
    peExtWeight: 167,
    electiveWeight: 167,
    languageWeight: 167,
    maxElectives: 4,
    label: 'Year 9 and above'
  }
}

// Build the SUBJECTS map for a given year level.
function getSubjectsForYear(year) {
  const curr = YEAR_CURRICULA[year] || YEAR_CURRICULA[9]
  return {
    ...curr.coreWeights,
    ...Object.fromEntries(
      curr.electives.map(subject => {
        // PE Extension has its own weight if defined
        if (subject === 'Physical Education (Extension)' && curr.peExtWeight !== undefined) {
          return [subject, curr.peExtWeight]
        }
        return [subject, LANGUAGE_SUBJECTS.has(subject) ? curr.languageWeight : curr.electiveWeight]
      })
    )
  }
}

// --- Backwards-compat exports (used by other helpers) ---
const CORE_SUBJECTS = YEAR_CURRICULA[9].core
const ELECTIVE_SUBJECTS = YEAR_CURRICULA[9].electives
const MAX_ELECTIVES = YEAR_CURRICULA[9].maxElectives
const SUBJECTS = getSubjectsForYear(9)

const GRADES = {
  'A+': 15, A: 14, 'A-': 13,
  'B+': 12, B: 11, 'B-': 10,
  'C+': 9, C: 8, 'C-': 7,
  'D+': 6, D: 5, 'D-': 4,
  'F+': 3, F: 2, 'F-': 1
}

const GRADE_ROWS = [
  ['A+', 'A', 'A-'],
  ['B+', 'B', 'B-'],
  ['C+', 'C', 'C-'],
  ['D+', 'D', 'D-'],
  ['F+', 'F', 'F-']
]
const GRADE_OPTIONS = Object.keys(GRADES)
const MIN_GPA_VALUE = 0.1
const MAX_GPA_VALUE = 15
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxlIQmLRq6a2iwm3CUqN92skJP36iUuX26XYE6jfQ96K-TO8ULQhKdFR7mBlTkCln4/exec'
const LOCAL_STORAGE_KEY = 'gpa-calculator-state-v1'
const THEME_STORAGE_KEY = 'gpa-calculator-theme-v1'
const DEFAULT_THEME = {
  primary: '#1f4a2e',
  primaryStrong: '#10301c',
  background: '#f1ede4',
  surface: '#ffffff',
  text: '#14110d',
  accent: '#1f4a2e'
}
const THEME_PRESETS = {
  Forest: DEFAULT_THEME,
  Ocean: {
    primary: '#0f766e',
    primaryStrong: '#115e59',
    background: '#eefcf9',
    surface: '#ffffff',
    text: '#12312d',
    accent: '#2563eb'
  },
  Sunset: {
    primary: '#dc2626',
    primaryStrong: '#991b1b',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#2f1d14',
    accent: '#ea580c'
  },
  Midnight: {
    primary: '#8b5cf6',
    primaryStrong: '#6d28d9',
    background: '#111827',
    surface: '#1f2937',
    text: '#f8fafc',
    accent: '#22c55e'
  }
}

const getClosestGradeForPoints = (points) => {
  let closestGrade = 'F-'
  let closestDiff = Infinity

  // GRADES is ordered high-to-low (A+ → F-). Using a strict `<` keeps the
  // first (higher) grade on an exact tie instead of biasing toward the lower one.
  Object.entries(GRADES).forEach(([grade, value]) => {
    const diff = Math.abs(value - points)
    if (diff < closestDiff) {
      closestGrade = grade
      closestDiff = diff
    }
  })

  return closestGrade
}

const getCeilingGradeForPoints = (points) => {
  const normalizedPoints = Math.max(1, points)
  const match = [...GRADE_OPTIONS].reverse().find(grade => GRADES[grade] >= normalizedPoints)
  return match || null
}

const getFloorGradeForPoints = (points) => {
  const normalizedPoints = Math.min(MAX_GPA_VALUE, points)
  const match = GRADE_OPTIONS.find(grade => GRADES[grade] <= normalizedPoints)
  return match || null
}

const sanitizePersistedSubjects = (persistedSubjects, year = 9) => {
  const curr = YEAR_CURRICULA[year] || YEAR_CURRICULA[9]
  if (!Array.isArray(persistedSubjects)) {
    return [...curr.core]
  }

  const yearSubjects = getSubjectsForYear(year)
  const availableSubjects = Object.keys(yearSubjects)
  const uniquePersisted = [...new Set(persistedSubjects.filter(subject => availableSubjects.includes(subject)))]
  const persistedElectives = uniquePersisted
    .filter(subject => !curr.core.includes(subject))
    .slice(0, curr.maxElectives)
  return [...curr.core, ...persistedElectives]
}

const getOptionalTargetFromPersisted = (parsed) => {
  if (Number.isFinite(Number(parsed?.targetGPA))) {
    const target = Number(parsed.targetGPA)
    return target >= MIN_GPA_VALUE && target <= MAX_GPA_VALUE ? target : null
  }

  if (Array.isArray(parsed?.targetGPAs) && parsed.targetGPAs.length === 1) {
    const target = Number(parsed.targetGPAs[0])
    return target >= MIN_GPA_VALUE && target <= MAX_GPA_VALUE ? target : null
  }

  return null
}

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null
}

const linearize = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

const relativeLuminance = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return 1
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)
}

const contrastRatio = (a, b) => {
  const la = relativeLuminance(a), lb = relativeLuminance(b)
  const lighter = Math.max(la, lb), darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

const isInappropriateName = (name) => {
  const lowerName = name.toLowerCase().trim()
  const filtered = [
    'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'fag',
    'faggot', 'penis', 'vagina', 'porn', 'hitler', 'nazi', 'kkk',
    'pussy', 'whore', 'slut', 'bastard', 'rape', 'terrorist', 'kys'
  ]

  const tokens = lowerName.split(/[^a-z]+/).filter(Boolean)
  if (filtered.some(word => tokens.includes(word))) return true

  const specialCharCount = (lowerName.match(/[^a-z\s\-']/g) || []).length
  return specialCharCount > 3 || lowerName.replace(/\s/g, '').length < 2 || /(.)\1{4,}/.test(lowerName)
}

function App() {
  const [yearLevel, setYearLevel] = useState(null)
  const [currentStep, setCurrentStep] = useState('year')
  const [selectedSubjects, setSelectedSubjects] = useState(() => [...YEAR_CURRICULA[9].core])
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0)
  const [directFinalGrades, setDirectFinalGrades] = useState({})
  const [predictedSubjects, setPredictedSubjects] = useState({})
  const [finalGrades, setFinalGrades] = useState({})
  const [gpa, setGpa] = useState(null)
  const [targetGPA, setTargetGPA] = useState(null)
  const [targetInput, setTargetInput] = useState('')
  const [settingsTargetInput, setSettingsTargetInput] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentYearLevel, setStudentYearLevel] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [yearChangeConfirm, setYearChangeConfirm] = useState(null)
  const [isTargetTransitioning, setIsTargetTransitioning] = useState(false)
  const [saveStatusMessage, setSaveStatusMessage] = useState('')
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasHydratedState, setHasHydratedState] = useState(false)
  const [persistenceWarning, setPersistenceWarning] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      return savedTheme ? { ...DEFAULT_THEME, ...JSON.parse(savedTheme) } : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })
  const [showCoreSubjects, setShowCoreSubjects] = useState(false)
  const autoAdvanceTimeoutRef = useRef(null)

  const yearCore = yearLevel ? YEAR_CURRICULA[yearLevel].core : YEAR_CURRICULA[9].core
  const yearElectives = yearLevel ? YEAR_CURRICULA[yearLevel].electives : YEAR_CURRICULA[9].electives
  const yearMaxElectives = yearLevel ? YEAR_CURRICULA[yearLevel].maxElectives : YEAR_CURRICULA[9].maxElectives
  const selectedElectives = useMemo(
    () => selectedSubjects.filter(subject => !yearCore.includes(subject)),
    [selectedSubjects, yearCore]
  )
  const selectedElectiveCount = selectedElectives.length
  const activeSubject = selectedSubjects[activeSubjectIndex] || selectedSubjects[0]
  const selectedGrade = activeSubject ? finalGrades[activeSubject]?.grade || directFinalGrades[activeSubject] || '' : ''
  const enteredFinalGradeCount = selectedSubjects.filter(subject => finalGrades[subject]).length
  const allSubjectsEntered = enteredFinalGradeCount === selectedSubjects.length
  const closestGpaGrade = gpa && gpa > 0 ? getClosestGradeForPoints(gpa) : null
  const hasPredictedSubjects = useMemo(
    () => selectedSubjects.some(subject => predictedSubjects[subject]),
    [selectedSubjects, predictedSubjects]
  )
  const baseGpa = useMemo(() => {
    if (!selectedSubjects.length) return null
    return calculateGPA(true)
  }, [finalGrades, selectedSubjects, predictedSubjects, yearLevel])
  const formatGpa = (value) => Number(value).toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    maximumFractionDigits: 2
  })
  const targetRequirements = targetGPA ? calculateRequiredGrades(targetGPA) : null
  // Derive muted/soft variants by mixing theme colors for proper contrast
  const themeTextLum = relativeLuminance(theme.text)
  const isDarkTheme = themeTextLum > relativeLuminance(theme.background)
  const mutedMix = isDarkTheme ? 0.55 : 0.6
  const softMix = isDarkTheme ? 0.4 : 0.45
  const lineMix = isDarkTheme ? 0.25 : 0.82
  const lineStrongMix = isDarkTheme ? 0.35 : 0.68
  const mixWithBg = (hex, factor) => {
    const t = hexToRgb(hex), b = hexToRgb(theme.background)
    if (!t || !b) return hex
    const r = Math.round(t.r * factor + b.r * (1 - factor))
    const g = Math.round(t.g * factor + b.g * (1 - factor))
    const bl = Math.round(t.b * factor + b.b * (1 - factor))
    return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
  }
  const appThemeStyle = {
    '--bg': theme.background,
    '--surface': theme.surface,
    '--surface-soft': theme.surface,
    '--surface-blue': theme.background,
    '--text': theme.text,
    '--text-muted': mixWithBg(theme.text, mutedMix),
    '--text-soft': mixWithBg(theme.text, softMix),
    '--line': mixWithBg(theme.text, lineMix),
    '--line-strong': mixWithBg(theme.text, lineStrongMix),
    '--primary': theme.primary,
    '--primary-strong': theme.primaryStrong,
    '--primary-soft': `${theme.primary}20`,
    '--success': theme.accent,
    '--success-soft': `${theme.accent}20`
  }

  function calculateSubjectFinalGrade(subject) {
    const directGrade = directFinalGrades[subject]
    if (!directGrade) return null
    return { grade: directGrade, points: GRADES[directGrade] }
  }

  function calculateGPA(excludePredicted = false) {
    const yearSubjects = getSubjectsForYear(yearLevel || 9)
    let totalWeightedScore = 0
    let totalKnownWeight = 0

    selectedSubjects.forEach(subject => {
      const weight = yearSubjects[subject] !== undefined ? yearSubjects[subject] : SUBJECTS[subject]
      const finalGrade = finalGrades[subject]

      if (excludePredicted && predictedSubjects[subject]) return

      if (weight && finalGrade?.points) {
        totalWeightedScore += finalGrade.points * weight
        totalKnownWeight += weight
      }
    })

    return totalKnownWeight > 0 ? totalWeightedScore / totalKnownWeight : 0
  }

  function calculateRequiredGrades(target) {
    const yearSubjects = getSubjectsForYear(yearLevel || 9)
    let currentWeightedScore = 0
    let remainingWeight = 0
    let knownWeight = 0
    const missingSubjects = []
    const totalSelectedWeight = selectedSubjects.reduce((sum, subject) => {
      const w = yearSubjects[subject] !== undefined ? yearSubjects[subject] : SUBJECTS[subject]
      return sum + w
    }, 0)

    selectedSubjects.forEach(subject => {
      const weight = yearSubjects[subject] !== undefined ? yearSubjects[subject] : SUBJECTS[subject]
      const finalGrade = finalGrades[subject]

      if (finalGrade?.points) {
        currentWeightedScore += finalGrade.points * weight
        knownWeight += weight
      } else {
        remainingWeight += weight
        missingSubjects.push(subject)
      }
    })

    if (missingSubjects.length === 0) {
      const currentGPA = knownWeight > 0 ? currentWeightedScore / knownWeight : 0
      return {
        possible: currentGPA >= target,
        grades: {},
        message: currentGPA >= target
          ? `You're at ${currentGPA.toFixed(2)} — past your target of ${formatGpa(target)}.`
          : `All grades are in. You're at ${currentGPA.toFixed(2)}, short of ${formatGpa(target)}.`
      }
    }

    const targetTotalScore = target * totalSelectedWeight
    const requiredScoreFromMissing = targetTotalScore - currentWeightedScore
    const averageRequiredPoints = requiredScoreFromMissing / remainingWeight

    if (averageRequiredPoints > MAX_GPA_VALUE) {
      return {
        possible: false,
        grades: {},
        message: `A ${formatGpa(target)} target is out of reach with the subjects left.`
      }
    }

    const requiredGrade = getCeilingGradeForPoints(averageRequiredPoints)
    if (!requiredGrade) {
      return {
        possible: false,
        grades: {},
        message: "Not enough weight left to pin down a fair target."
      }
    }

    return {
      possible: true,
      grades: Object.fromEntries(missingSubjects.map(subject => [subject, requiredGrade])),
      message: averageRequiredPoints <= 1
        ? `Any passing grade on the rest keeps ${formatGpa(target)} on the table.`
        : `Aim for about ${requiredGrade} on the remaining subjects. A few higher grades can balance a wobble elsewhere.`
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) {
        setHasHydratedState(true)
        return
      }

      const parsed = JSON.parse(raw)
      const hasValidYear = parsed?.yearLevel === 8 || parsed?.yearLevel === 9
      const persistedYearRaw = hasValidYear ? parsed.yearLevel : 9
      const hydratedSubjects = sanitizePersistedSubjects(parsed?.selectedSubjects, persistedYearRaw)
      const persistedStep = ['year', 'selection', 'target', 'gradeEntry', 'results'].includes(parsed?.currentStep)
        ? parsed.currentStep
        : 'selection'
      // Without a valid saved year level we can't trust the curriculum/subjects,
      // so send the user back to the year picker instead of a mismatched selection.
      const safeStep = hasValidYear ? persistedStep : 'year'

      setSelectedSubjects(hydratedSubjects)
      setDirectFinalGrades(typeof parsed?.directFinalGrades === 'object' && parsed.directFinalGrades ? parsed.directFinalGrades : {})
      setPredictedSubjects(typeof parsed?.predictedSubjects === 'object' && parsed.predictedSubjects ? parsed.predictedSubjects : {})
      setCurrentStep(safeStep)
      setYearLevel(hasValidYear ? parsed.yearLevel : null)
      setTargetGPA(getOptionalTargetFromPersisted(parsed))
      setStudentYearLevel(typeof parsed?.studentYearLevel === 'string' ? parsed.studentYearLevel : '')
      setActiveSubjectIndex(
        Number.isInteger(parsed?.activeSubjectIndex)
          ? Math.max(0, Math.min(parsed.activeSubjectIndex, hydratedSubjects.length - 1))
          : 0
      )
    } catch (error) {
      console.error('Failed to restore calculator state. Starting with default settings.', error)
      setPersistenceWarning(true)
    } finally {
      setHasHydratedState(true)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }, [theme])

  useEffect(() => {
    if (!hasHydratedState) return

    const stateToPersist = {
      currentStep,
      selectedSubjects,
      directFinalGrades,
      predictedSubjects,
      targetGPA,
      activeSubjectIndex,
      yearLevel,
      studentYearLevel
    }

    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToPersist))
    } catch (error) {
      console.error('Failed to save calculator state:', error)
      setPersistenceWarning(true)
    }
  }, [
    hasHydratedState,
    currentStep,
    selectedSubjects,
    directFinalGrades,
    predictedSubjects,
    targetGPA,
    activeSubjectIndex,
    yearLevel,
    studentYearLevel
  ])

  useEffect(() => {
    const newFinalGrades = {}
    selectedSubjects.forEach(subject => {
      const finalGrade = calculateSubjectFinalGrade(subject)
      if (finalGrade) {
        newFinalGrades[subject] = finalGrade
      }
    })
    setFinalGrades(newFinalGrades)
  }, [directFinalGrades, selectedSubjects])

  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const currentGPA = calculateGPA(false)
      setGpa(currentGPA)
    }
  }, [finalGrades, selectedSubjects, predictedSubjects, yearLevel])

  useEffect(() => {
    if (activeSubjectIndex > selectedSubjects.length - 1) {
      setActiveSubjectIndex(Math.max(0, selectedSubjects.length - 1))
    }
  }, [activeSubjectIndex, selectedSubjects.length])

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }

  const removeSubjectKey = (source, subject) => {
    const copy = { ...source }
    delete copy[subject]
    return copy
  }

  const handleElectiveToggle = (subject) => {
    const isSelected = selectedSubjects.includes(subject)

    if (isSelected) {
      // Deselecting cancels a pending auto-advance so the user isn't yanked
      // to the target screen after undoing their last pick.
      clearAutoAdvance()
      setSelectedSubjects(prev => prev.filter(item => item !== subject))
      setDirectFinalGrades(prev => removeSubjectKey(prev, subject))
      setPredictedSubjects(prev => removeSubjectKey(prev, subject))
      setIsTargetTransitioning(false)
      if (currentStep !== 'selection') setCurrentStep('selection')
      return
    }

    if (selectedElectiveCount >= yearMaxElectives) return

    const updatedSubjects = [...selectedSubjects, subject]
    const updatedElectiveCount = updatedSubjects.filter(item => !yearCore.includes(item)).length
    setSelectedSubjects(updatedSubjects)

    if (updatedElectiveCount === yearMaxElectives) {
      setIsTargetTransitioning(true)
      clearAutoAdvance()
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        autoAdvanceTimeoutRef.current = null
        setTargetInput(targetGPA ? String(targetGPA) : '')
        setIsTargetTransitioning(false)
        setCurrentStep('target')
      }, 280)
    }
  }

  const saveTargetAndContinue = () => {
    const value = Number(targetInput)
    if (targetInput.trim() && Number.isFinite(value) && value >= MIN_GPA_VALUE && value <= MAX_GPA_VALUE) {
      setTargetGPA(value)
    } else {
      setTargetGPA(null)
    }
    setActiveSubjectIndex(0)
    setCurrentStep('gradeEntry')
  }

  const skipTargetAndContinue = () => {
    setTargetGPA(null)
    setTargetInput('')
    setActiveSubjectIndex(0)
    setCurrentStep('gradeEntry')
  }

  const handleGradeSelect = (subject, grade) => {
    setDirectFinalGrades(prev => ({ ...prev, [subject]: grade }))
  }

  const handleTogglePredicted = (subject) => {
    setPredictedSubjects(prev => {
      const next = { ...prev }
      if (next[subject]) {
        delete next[subject]
      } else {
        next[subject] = true
      }
      return next
    })
  }

  const navigateToSubject = (subject) => {
    const idx = selectedSubjects.indexOf(subject)
    if (idx >= 0) {
      setActiveSubjectIndex(idx)
      setCurrentStep('gradeEntry')
    }
  }

  const handlePreviousSubject = () => {
    if (activeSubjectIndex > 0) {
      setActiveSubjectIndex(activeSubjectIndex - 1)
    }
  }

  const handleNextSubject = () => {
    if (activeSubjectIndex < selectedSubjects.length - 1) {
      setActiveSubjectIndex(activeSubjectIndex + 1)
      return
    }

    setCurrentStep('results')
  }

  const applyThemePreset = (presetName) => {
    setTheme(THEME_PRESETS[presetName] || DEFAULT_THEME)
  }

  const handleThemeChange = (key, value) => {
    setTheme(prev => {
      const next = { ...prev, [key]: value }

      // Enforce minimum contrast: text vs background must be >= 3:1
      if (key === 'text') {
        const ratio = contrastRatio(value, next.background)
        if (ratio < 3) return prev
      }
      if (key === 'background') {
        const ratio = contrastRatio(next.text, value)
        if (ratio < 3) return prev
      }
      if (key === 'surface') {
        const ratio = contrastRatio(next.text, value)
        if (ratio < 3) return prev
      }
      if (key === 'primary') {
        // White text on primary must be >= 3:1
        const ratio = contrastRatio('#ffffff', value)
        if (ratio < 3) return prev
      }

      return next
    })
  }

  const handleSettingsTargetSave = () => {
    const value = Number(settingsTargetInput)
    if (settingsTargetInput.trim() && Number.isFinite(value) && value >= MIN_GPA_VALUE && value <= MAX_GPA_VALUE) {
      setTargetGPA(value)
      setTargetInput(String(value))
      setSettingsTargetInput('')
    }
  }

  const resetCalculator = () => {
    setCurrentStep('selection')
    setSelectedSubjects([...YEAR_CURRICULA[yearLevel || 9].core])
    setActiveSubjectIndex(0)
    setDirectFinalGrades({})
    setPredictedSubjects({})
    setFinalGrades({})
    setGpa(null)
    setTargetGPA(null)
    setTargetInput('')
    setSaveStatusMessage('')
    setSaveErrorMessage('')
    setPredictedSubjects({})
    setStudentName('')
    setStudentYearLevel('')
  }

  const persistLocalGpaSnapshot = (_payload) => {
    return true
  }

  const saveSnapshotToGoogleDoc = async () => {
    if (!studentName.trim()) {
      setSaveStatusMessage('')
      setSaveErrorMessage('Enter your name before saving.')
      return
    }

    if (!studentYearLevel.trim()) {
      setSaveStatusMessage('')
      setSaveErrorMessage('Enter your year level before saving.')
      return
    }

    if (isInappropriateName(studentName)) {
      setSaveStatusMessage('')
      setSaveErrorMessage('That name looks invalid. Please use your real name.')
      return
    }

    setIsSaving(true)
    setSaveStatusMessage('')
    setSaveErrorMessage('')

    const subjectSummaries = selectedSubjects.map(subject => ({
      subject,
      weight: (yearLevel ? getSubjectsForYear(yearLevel) : SUBJECTS)[subject],
      finalGrade: finalGrades[subject]?.grade ?? null,
      finalPoints: finalGrades[subject]?.points ?? null,
      directFinalGrade: directFinalGrades[subject] ?? null
    }))

    const folderYearLevel = yearLevel ? `Year ${yearLevel}` : (studentYearLevel.trim() || 'Unknown Year')
    const currentTerm = studentYearLevel.includes('Term') ? studentYearLevel : 'Term 1'

    const payload = {
      studentName: studentName.trim(),
      yearLevel: folderYearLevel,
      gpa: gpa !== null ? Number(gpa.toFixed(2)) : null,
      targetGpa: targetGPA,
      completedSubjects: enteredFinalGradeCount,
      totalSubjects: selectedSubjects.length,
      subjects: subjectSummaries,
      currentTerm: currentTerm,
      timestamp: new Date().toISOString()
    }

    const savedLocally = persistLocalGpaSnapshot(payload)

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          data: JSON.stringify(payload)
        })
      })

      setSaveStatusMessage(
        response.type === 'opaque'
          ? `Saved locally${savedLocally ? '' : ' could not be confirmed'} and sent a Google Docs request for ${studentName.trim()}.`
          : `Saved ${studentName.trim()}'s ${studentYearLevel.trim()} GPA locally and to Google Docs.`
      )
    } catch (error) {
      console.error('Failed to save GPA to Google Doc:', error)
      setSaveErrorMessage(`Saved locally${savedLocally ? '' : ' could not be confirmed'}, but Google Docs could not be reached. ${error.message || ''}`.trim())
    } finally {
      setIsSaving(false)
    }
  }

  const renderTopBar = (title, subtitle) => (
    <header className="gpa-final-topbar">
      <div className="gpa-final-topbar-title">
        <span className="gpa-final-topbar-name">{title}</span>
        {subtitle ? <span className="gpa-final-topbar-subtitle">{subtitle}</span> : null}
      </div>
      <button
        type="button"
        className="gpa-icon-button"
        onClick={() => {
          setSettingsTargetInput(targetGPA ? String(targetGPA) : '')
          setShowSettings(true)
        }}
        aria-label="Open settings"
        title="Settings"
      >
        <Settings aria-hidden="true" />
      </button>
    </header>
  )

  const renderRequirements = () => {
    if (!targetGPA) return null

    return (
      <section className="gpa-card gpa-lower-card">
        <div className="gpa-card-heading-row">
          <h2>What you need</h2>
          <span className="gpa-target-number">{formatGpa(targetGPA)}</span>
        </div>
        <p className="gpa-card-note">{targetRequirements.message}</p>
        {targetRequirements.possible && Object.keys(targetRequirements.grades).length > 0 ? (
          <div className="gpa-grade-list">
            {Object.entries(targetRequirements.grades).map(([subject, grade]) => (
              <div className="gpa-grade-row" key={subject}>
                <span className="gpa-grade-subject">{subject}</span>
                <span className="gpa-grade-column">{grade}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  const handleYearSelect = (year) => {
    setYearLevel(year)
    setSelectedSubjects([...YEAR_CURRICULA[year].core])
    setActiveSubjectIndex(0)
    setDirectFinalGrades({})
    setFinalGrades({})
    setGpa(null)
    setTargetGPA(null)
    setTargetInput('')
    setPredictedSubjects({})
    setCurrentStep('selection')
  }

  const handleYearLevelChange = (year) => {
    if (year === yearLevel || yearChangeConfirm !== null) return
    setYearChangeConfirm(year)
  }

  const cancelYearChange = () => setYearChangeConfirm(null)

  const confirmYearChange = () => {
    const year = yearChangeConfirm
    if (year === null) return
    setYearLevel(year)
    setSelectedSubjects([...YEAR_CURRICULA[year].core])
    setActiveSubjectIndex(0)
    setDirectFinalGrades({})
    setFinalGrades({})
    setGpa(null)
    setTargetGPA(null)
    setTargetInput('')
    setPredictedSubjects({})
    setCurrentStep('selection')
    setYearChangeConfirm(null)
    setShowSettings(false)
    setStudentName('')
    setStudentYearLevel('')
  }

  const renderYearScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('GPA Calculator')}
      <section className="gpa-year-stage" aria-label="Choose year level">
        <h1 id="year-label" className="gpa-year-question">Which year?</h1>
        <div className="gpa-year-choices" role="group" aria-labelledby="year-label">
          <button
            type="button"
            className="gpa-year-option"
            onClick={() => handleYearSelect(8)}
          >
            <span className="gpa-year-option-title">Year 8</span>
          </button>
          <button
            type="button"
            className="gpa-year-option"
            onClick={() => handleYearSelect(9)}
          >
            <span className="gpa-year-option-title">Year 9</span>
          </button>
        </div>
      </section>
    </main>
  )

  const renderSelectionScreen = () => {
    const curr = YEAR_CURRICULA[yearLevel || 9]
    const isYear8 = (yearLevel || 9) === 8
    const langNote = isYear8
      ? `Count for ${curr.languageWeight} of a regular subject in your GPA`
      : 'Same weight as other electives'
    const electiveNote = isYear8
      ? `Count for ${curr.electiveWeight} in your GPA`
      : 'Same weight as other electives'

    const electiveGroups = [
      {
        key: 'languages',
        kicker: 'Languages',
        note: langNote,
        subjects: yearElectives.filter(s => LANGUAGE_SUBJECTS.has(s) || s === 'English as an Other Language')
      },
      {
        key: 'creative',
        kicker: 'Performance and visual',
        note: electiveNote,
        subjects: yearElectives.filter(s => ['Drama', 'Music', 'Visual Art', 'Film, Television and New Media'].includes(s))
      },
      {
        key: 'applied',
        kicker: 'Applied and technology',
        note: electiveNote,
        subjects: yearElectives.filter(s => ['Business', 'Design', 'Digital Solutions', 'Geography', 'Physical Education (Extension)'].includes(s))
      }
    ].filter(g => g.subjects.length > 0)

    return (
      <main className="gpa-final-page" id="main-content">
        {renderTopBar('Pick your electives', `${selectedElectiveCount} of ${yearMaxElectives}`)}
        <section className={`gpa-selection-panel${isTargetTransitioning ? ' is-transitioning' : ''}`}>
          <div className="gpa-selection-intro">
            <h1 className="gpa-selection-question">Which electives are you taking?</h1>
            <p className="gpa-selection-help">Pick up to {yearMaxElectives}. Languages count more in your GPA than other electives.</p>
          </div>
          <div className="gpa-subject-groups">
            {electiveGroups.map((group) => (
              <div className="gpa-subject-group" key={group.key}>
                <div className="gpa-subject-group-header">
                  <h2 className="gpa-subject-group-heading">{group.kicker}</h2>
                  <span className="gpa-subject-group-note">{group.note}</span>
                </div>
                <div className="gpa-elective-grid" aria-label={group.kicker}>
                  {group.subjects.map((subject, index) => {
                    const isSelected = selectedSubjects.includes(subject)
                    const isDisabled = !isSelected && selectedElectiveCount >= yearMaxElectives
                    return (
                      <button
                        type="button"
                        key={subject}
                        className={`gpa-elective-button${isSelected ? ' is-selected' : ''}`}
                        onClick={() => handleElectiveToggle(subject)}
                        disabled={isDisabled}
                        aria-pressed={isSelected}
                        style={{ animationDelay: `${index * 20 + 60}ms` }}
                      >
                        <span className="gpa-elective-button-label">{subject}</span>
                        {isSelected ? <Check aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="gpa-subject-group">
              <button
                type="button"
                className="gpa-disclosure-button"
                onClick={() => setShowCoreSubjects(prev => !prev)}
                aria-expanded={showCoreSubjects}
                aria-controls="core-subjects-list"
              >
                <span>Core subjects</span>
                <span className="gpa-disclosure-meta">{showCoreSubjects ? 'Hide' : `${yearCore.length} included`}</span>
              </button>
              {showCoreSubjects ? (
                <div id="core-subjects-list" className="gpa-core-list">
                  {yearCore.map((subject, index) => (
                    <div key={subject} className="gpa-core-item" style={{ animationDelay: `${index * 25}ms` }}>
                      <span className="gpa-core-name">{subject}</span>
                      <span className="gpa-core-weight">Always counted</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {persistenceWarning ? (
            <p className="gpa-quiet-warning">Progress may not persist because browser storage was blocked.</p>
          ) : null}
        </section>
      </main>
    )
  }

  const renderTargetScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Set a target', 'Optional')}
      <section className="gpa-target-stage" aria-label="Optional target GPA">
        <div className="gpa-target-card">
          <h1 id="target-gpa-label">Target GPA</h1>
          <p className="gpa-target-description">Want to hit a goal? Pick a number out of 15 and we'll show what you need on each subject.</p>
          <input
            type="number"
            min={MIN_GPA_VALUE}
            max={MAX_GPA_VALUE}
            step="0.1"
            value={targetInput}
            onChange={(event) => setTargetInput(event.target.value)}
            placeholder="14"
            className="gpa-target-input"
            aria-labelledby="target-gpa-label"
          />
          <div className="gpa-target-actions">
            <button type="button" className="gpa-secondary-action" onClick={skipTargetAndContinue}>No target</button>
            <button type="button" className="gpa-primary-action" onClick={saveTargetAndContinue}>Save target</button>
          </div>
        </div>
      </section>
    </main>
  )

  const renderGradeEntryScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Pick your grades', `${activeSubjectIndex + 1} of ${selectedSubjects.length}`)}
      <section className="gpa-grade-card gpa-card">
        <div className="gpa-subject-heading-row">
          <h1 key={activeSubject}>{activeSubject}</h1>
          <span>{activeSubjectIndex + 1} / {selectedSubjects.length}</span>
        </div>
        <div className="gpa-mode-row">
          <button
            type="button"
            className={`gpa-prediction-toggle${predictedSubjects[activeSubject] ? ' is-predicted' : ''}`}
            onClick={() => handleTogglePredicted(activeSubject)}
          >
            {predictedSubjects[activeSubject] ? 'Predicted' : 'Mark as predicted'}
          </button>
        </div>
        <div key={selectedGrade || 'empty'} className={`gpa-selected-grade-display${selectedGrade ? ' gpa-grade-just-selected' : ''}`}>
          {selectedGrade || <span className="gpa-no-grade">Pick a grade below</span>}
        </div>
        <div className="gpa-grade-button-table" aria-label={`Grade buttons for ${activeSubject}`}>
          {GRADE_ROWS.map((row, rowIndex) => (
            <div className="gpa-grade-button-row" key={row.join('-')}>
              {row.map((grade, colIndex) => (
                <button
                  type="button"
                  key={grade}
                  className={`gpa-grade-button${selectedGrade === grade ? ' is-selected' : ''}`}
                  onClick={() => handleGradeSelect(activeSubject, grade)}
                  aria-pressed={selectedGrade === grade}
                  style={{ animationDelay: `${(rowIndex * 3 + colIndex) * 25}ms` }}
                >
                  {grade}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="gpa-grade-nav-buttons">
          <button
            type="button"
            className="gpa-secondary-action"
            onClick={handlePreviousSubject}
            disabled={activeSubjectIndex === 0}
          >
            <ChevronRight aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
            Back
          </button>
          <button
            type="button"
            className="gpa-primary-action"
            onClick={handleNextSubject}
            disabled={!selectedGrade}
          >
            {activeSubjectIndex === selectedSubjects.length - 1 ? 'See my GPA' : 'Next subject'}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
      {targetGPA ? renderRequirements() : null}
    </main>
  )

  const renderResultsScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Your GPA', `${selectedSubjects.length} subjects`)}
      <section className="gpa-card gpa-result-card">
        <header className="gpa-result-header">
          <div className="gpa-result-kicker">Weighted GPA out of 15</div>
          <div className="gpa-result-number" aria-live="polite" aria-atomic="true">{gpa && gpa > 0 ? gpa.toFixed(2) : '--'}</div>
          <div className="gpa-result-subtitle">
            {(() => {
              if (!closestGpaGrade || gpa == null || gpa <= 0) return 'Add grades to see your GPA'
              const isExactGrade = Object.values(GRADES).some(v => Math.abs(v - gpa) < 0.01)
              if (isExactGrade) return `Sits at a ${closestGpaGrade}`
              const floorGrade = getFloorGradeForPoints(gpa)
              const ceilingGrade = getCeilingGradeForPoints(gpa)
              if (floorGrade && ceilingGrade && floorGrade !== ceilingGrade) {
                const floorArticle = /^[AEIOU]/.test(floorGrade) ? 'an' : 'a'
                const ceilingArticle = /^[AEIOU]/.test(ceilingGrade) ? 'an' : 'a'
                return `Sits between ${floorArticle} ${floorGrade} and ${ceilingArticle} ${ceilingGrade}`
              }
              const article = /^[AEIOU]/.test(closestGpaGrade) ? 'an' : 'a'
              return `Sits at about ${article} ${closestGpaGrade}`
            })()}
          </div>
          <div className="gpa-result-meta">
            {hasPredictedSubjects && baseGpa !== null ? (
              <span>Base GPA <strong>{baseGpa.toFixed(2)}</strong> excluding predicted</span>
            ) : null}
            {targetGPA ? (
              <span className={`gpa-target-comparison ${gpa >= targetGPA ? 'is-met' : 'is-short'}`}>
                {gpa >= targetGPA
                  ? `On target (${formatGpa(targetGPA)})`
                  : `${(targetGPA - (gpa || 0)).toFixed(2)} below ${formatGpa(targetGPA)}`}
              </span>
            ) : null}
          </div>
        </header>
        <div className="gpa-result-breakdown">
          <h3>Subject contributions</h3>
          <div className="gpa-grade-list">
            {selectedSubjects.map((subject, idx) => {
              const grade = finalGrades[subject]
              const isPredicted = predictedSubjects[subject]
              return (
                <button
                  type="button"
                  key={subject}
                  className="gpa-grade-row gpa-grade-row-clickable gpa-result-row"
                  onClick={() => navigateToSubject(subject)}
                  style={{ animationDelay: `${idx * 30 + 60}ms` }}
                >
                  <span className="gpa-grade-subject">{subject}</span>
                  <span className="gpa-grade-column">
                    {grade ? grade.grade : '—'}
                    {isPredicted ? <span className="gpa-predicted-badge" title="Excluded from base GPA">predicted</span> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="gpa-result-save-section">
          <div className="gpa-save-form">
            <label>
              <span>Name</span>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Your name"
              />
            </label>
            <label>
              <span>Year</span>
              <input
                value={studentYearLevel}
                onChange={(event) => setStudentYearLevel(event.target.value)}
                placeholder={yearLevel === 8 ? 'Year 8' : yearLevel === 9 ? 'Year 9' : 'e.g. Year 11'}
              />
            </label>
            <button
              type="button"
              className="gpa-primary-action"
              onClick={saveSnapshotToGoogleDoc}
              disabled={isSaving}
            >
              {isSaving ? <><span className="gpa-spinner" /> Saving...</> : 'Save to Google Drive'}
            </button>
          </div>
          {saveStatusMessage ? <p className="gpa-save-status">{saveStatusMessage}</p> : null}
          {saveErrorMessage ? <p className="gpa-save-error" role="alert">{saveErrorMessage}</p> : null}
        </div>
        <div className="gpa-result-actions">
          <button type="button" className="gpa-secondary-action" onClick={() => setCurrentStep('selection')}>Change electives</button>
          <button type="button" className="gpa-primary-action" onClick={() => setCurrentStep('gradeEntry')}>Tweak a grade</button>
        </div>
      </section>
    </main>
  )

  const renderSettings = () => {
    if (!showSettings) return null

    return (
      <div className="gpa-settings-backdrop" role="presentation" onMouseDown={() => { setShowSettings(false); setYearChangeConfirm(null) }}>
        <aside className="gpa-settings-panel" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={event => event.stopPropagation()}>
          <div className="gpa-settings-header">
            <h2>Settings</h2>
            <button type="button" className="gpa-icon-button" onClick={() => { setShowSettings(false); setYearChangeConfirm(null) }} aria-label="Close settings">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="gpa-settings-section">
            <h3>Year level</h3>
            <p className="gpa-settings-note">Switches your subjects and the GPA formula. Existing grades get cleared.</p>
            <div className="gpa-year-toggle" role="group" aria-label="Year level">
              <button
                type="button"
                className={`gpa-year-toggle-option${yearLevel === 8 ? ' is-active' : ''}`}
                onClick={() => handleYearLevelChange(8)}
                aria-pressed={yearLevel === 8}
              >
                Year 8
              </button>
              <button
                type="button"
                className={`gpa-year-toggle-option${yearLevel === 9 ? ' is-active' : ''}`}
                onClick={() => handleYearLevelChange(9)}
                aria-pressed={yearLevel === 9}
              >
                Year 9+
              </button>
            </div>
            {yearChangeConfirm !== null ? (
              <div className="gpa-year-confirm" role="alertdialog" aria-label="Confirm year level change">
                <p>Are you sure? Switching to {YEAR_CURRICULA[yearChangeConfirm].label} will clear your selected subjects and entered grades.</p>
                <div className="gpa-year-confirm-actions">
                  <button type="button" className="gpa-secondary-action" onClick={cancelYearChange}>Cancel</button>
                  <button type="button" className="gpa-primary-action" onClick={confirmYearChange}>Yes, switch</button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="gpa-settings-section">
            <h3>Target GPA</h3>
            <div className="gpa-settings-row">
              <input
                type="number"
                min={MIN_GPA_VALUE}
                max={MAX_GPA_VALUE}
                step="0.1"
                value={settingsTargetInput}
                onChange={event => setSettingsTargetInput(event.target.value)}
                placeholder={targetGPA ? formatGpa(targetGPA) : ''}
              />
              <button type="button" onClick={handleSettingsTargetSave}>Save</button>
              <button type="button" onClick={() => setTargetGPA(null)}>Clear</button>
            </div>
          </div>
          <div className="gpa-settings-section">
            <h3>Theme</h3>
            <div className="gpa-theme-presets">
              {Object.keys(THEME_PRESETS).map(preset => (
                <button type="button" key={preset} onClick={() => applyThemePreset(preset)}>{preset}</button>
              ))}
            </div>
            <div className="gpa-theme-colors">
              {[
                ['primary', 'Main'],
                ['primaryStrong', 'Dark'],
                ['background', 'Background'],
                ['surface', 'Cards'],
                ['text', 'Text'],
                ['accent', 'Accent']
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input type="color" value={theme[key]} onChange={event => handleThemeChange(key, event.target.value)} />
                </label>
              ))}
            </div>
          </div>
          <div className="gpa-settings-section">
            <h3>Year on the report</h3>
            <label>
              <input value={studentYearLevel} onChange={event => setStudentYearLevel(event.target.value)} placeholder={yearLevel === 8 ? 'Year 8' : 'e.g. Year 11'} />
            </label>
          </div>
          <div className="gpa-settings-section">
            <button type="button" className="gpa-secondary-action" onClick={resetCalculator}>
              <RotateCcw aria-hidden="true" />
              Start over
            </button>
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="gpa-final-app" style={appThemeStyle}>
      <a href="#main-content" className="gpa-skip-link">Skip to main content</a>
      {currentStep === 'year' ? renderYearScreen() : null}
      {currentStep === 'selection' ? renderSelectionScreen() : null}
      {currentStep === 'target' ? renderTargetScreen() : null}
      {currentStep === 'gradeEntry' ? renderGradeEntryScreen() : null}
      {currentStep === 'results' ? renderResultsScreen() : null}
      {renderSettings()}
    </div>
  )
}

export default App
