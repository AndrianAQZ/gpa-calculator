import React, { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, RotateCcw, Save, Settings, X } from 'lucide-react'
import './App.css'

const CORE_SUBJECTS = ['English', 'Health and Physical Education', 'History', 'Mathematics', 'Science']
const ELECTIVE_SUBJECTS = [
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
]
const LANGUAGE_SUBJECTS = new Set(['Spanish', 'Japanese'])
const DEFAULT_ELECTIVE_WEIGHT = 0.3
const LANGUAGE_ELECTIVE_WEIGHT = 0.3
const CORE_SUBJECT_WEIGHTS = {
  English: 1.0,
  'Health and Physical Education': 0.6,
  History: 1.0,
  Mathematics: 1.0,
  Science: 1.0
}
const SUBJECTS = {
  ...CORE_SUBJECT_WEIGHTS,
  ...Object.fromEntries(
    ELECTIVE_SUBJECTS.map(subject => [
      subject,
      LANGUAGE_SUBJECTS.has(subject) ? LANGUAGE_ELECTIVE_WEIGHT : DEFAULT_ELECTIVE_WEIGHT
    ])
  )
}

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
const MAX_ELECTIVES = 4
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const GOOGLE_DOC_ID = '1ICuIvuBC-uTpdKCgQWYNKqAfPfnOzOQPIyLYMoXhqvo'
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxlIQmLRq6a2iwm3CUqN92skJP36iUuX26XYE6jfQ96K-TO8ULQhKdFR7mBlTkCln4/exec'
const LOCAL_STORAGE_KEY = 'gpa-calculator-state-v1'
const LOCAL_GPA_SAVES_KEY = 'gpa-calculator-saved-gpas-v1'
const THEME_STORAGE_KEY = 'gpa-calculator-theme-v1'
const DEFAULT_THEME = {
  primary: '#3d6b4e',
  primaryStrong: '#2a4d36',
  background: '#f5f0eb',
  surface: '#ffffff',
  text: '#1a1612',
  accent: '#3d6b4e'
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

const createDefaultGradeModes = () =>
  CORE_SUBJECTS.reduce((acc, subject) => {
    acc[subject] = 'final'
    return acc
  }, {})

const getDetectedTerm = () => {
  const month = new Date().getMonth()
  if (month <= 2) return 'Term 1'
  if (month <= 5) return 'Term 2'
  if (month <= 8) return 'Term 3'
  return 'Term 4'
}

const getClosestGradeForPoints = (points) => {
  let closestGrade = 'F-'
  let closestDiff = Infinity

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

const sanitizePersistedSubjects = (persistedSubjects) => {
  if (!Array.isArray(persistedSubjects)) {
    return [...CORE_SUBJECTS]
  }

  const availableSubjects = Object.keys(SUBJECTS)
  const uniquePersisted = [...new Set(persistedSubjects.filter(subject => availableSubjects.includes(subject)))]
  const persistedElectives = uniquePersisted
    .filter(subject => !CORE_SUBJECTS.includes(subject))
    .slice(0, MAX_ELECTIVES)
  return [...CORE_SUBJECTS, ...persistedElectives]
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
  const filtered = ['fuck', 'shit', 'cunt', 'nigger', 'nazi', 'hitler', 'kkk']

  if (filtered.some(word => lowerName.includes(word))) return true

  const specialCharCount = (lowerName.match(/[^a-z\s\-']/g) || []).length
  return specialCharCount > 4 || lowerName.replace(/\s/g, '').length < 2 || /(.)\1{5,}/.test(lowerName)
}

function App() {
  const [currentStep, setCurrentStep] = useState('selection')
  const [selectedSubjects, setSelectedSubjects] = useState(() => [...CORE_SUBJECTS])
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0)
  const [gradeEntryModes, setGradeEntryModes] = useState(() => createDefaultGradeModes())
  const [termGrades, setTermGrades] = useState({})
  const [directFinalGrades, setDirectFinalGrades] = useState({})
  const [termFinalGrades, setTermFinalGrades] = useState({})
  const [expectedGrades, setExpectedGrades] = useState({})
  const [predictedSubjects, setPredictedSubjects] = useState({})
  const [finalGrades, setFinalGrades] = useState({})
  const [gpa, setGpa] = useState(null)
  const [yearlyGPA, setYearlyGPA] = useState(null)
  const [targetGPA, setTargetGPA] = useState(null)
  const [targetInput, setTargetInput] = useState('')
  const [settingsTargetInput, setSettingsTargetInput] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentYearLevel, setStudentYearLevel] = useState('')
  const [currentTerm, setCurrentTerm] = useState(() => getDetectedTerm())
  const [termSelectionMode, setTermSelectionMode] = useState('auto')
  const [showSettings, setShowSettings] = useState(false)
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

  const selectedElectives = useMemo(
    () => selectedSubjects.filter(subject => !CORE_SUBJECTS.includes(subject)),
    [selectedSubjects]
  )
  const selectedElectiveCount = selectedElectives.length
  const activeSubject = selectedSubjects[activeSubjectIndex] || selectedSubjects[0]
  const selectedGrade = activeSubject ? finalGrades[activeSubject]?.grade || directFinalGrades[activeSubject] || '' : ''
  const enteredFinalGradeCount = selectedSubjects.filter(subject => finalGrades[subject]).length
  const allSubjectsEntered = enteredFinalGradeCount === selectedSubjects.length
  const closestGpaGrade = gpa && gpa > 0 ? getClosestGradeForPoints(gpa) : null
  const hasPredictedSubjects = useMemo(
    () => Object.keys(predictedSubjects).length > 0,
    [predictedSubjects]
  )
  const baseGpa = useMemo(() => {
    if (!selectedSubjects.length) return null
    return calculateGPA(true)
  }, [finalGrades, selectedSubjects, predictedSubjects])
  const formatGpa = (value) => Number(value).toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    maximumFractionDigits: 2
  })
  const targetRequirements = targetGPA ? calculateRequiredGrades(targetGPA) : null
  const appThemeStyle = {
    '--bg': theme.background,
    '--surface': theme.surface,
    '--surface-soft': theme.surface,
    '--surface-blue': theme.background,
    '--text': theme.text,
    '--text-muted': theme.text,
    '--text-soft': theme.text,
    '--primary': theme.primary,
    '--primary-strong': theme.primaryStrong,
    '--primary-soft': `${theme.primary}20`,
    '--success': theme.accent,
    '--success-soft': `${theme.accent}20`
  }

  function calculateSubjectFinalGrade(subject) {
    const mode = gradeEntryModes[subject] || 'final'

    if (mode === 'final') {
      const directGrade = directFinalGrades[subject]
      if (!directGrade) return null
      return { grade: directGrade, points: GRADES[directGrade] }
    }

    const overrideGrade = termFinalGrades[subject]
    if (overrideGrade && GRADES[overrideGrade]) {
      return { grade: overrideGrade, points: GRADES[overrideGrade] }
    }

    const subjectTerms = termGrades[subject]
    if (!subjectTerms) return null

    const enteredGrades = TERMS
      .map(term => subjectTerms[term])
      .filter(grade => grade && GRADES[grade])
    if (enteredGrades.length === 0) return null

    const totalPoints = enteredGrades.reduce((sum, grade) => sum + GRADES[grade], 0)
    const averagePoints = totalPoints / enteredGrades.length
    return { grade: getClosestGradeForPoints(averagePoints), points: averagePoints }
  }

  function calculateGPA(excludePredicted = false) {
    let totalWeightedScore = 0
    let totalKnownWeight = 0

    selectedSubjects.forEach(subject => {
      const weight = SUBJECTS[subject]
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
    let currentWeightedScore = 0
    let remainingWeight = 0
    let knownWeight = 0
    const missingSubjects = []
    const totalSelectedWeight = selectedSubjects.reduce((sum, subject) => sum + SUBJECTS[subject], 0)

    selectedSubjects.forEach(subject => {
      const weight = SUBJECTS[subject]
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
          ? `Current GPA ${currentGPA.toFixed(2)} meets ${formatGpa(target)}.`
          : `All grades are entered. Current GPA ${currentGPA.toFixed(2)} is below ${formatGpa(target)}.`
      }
    }

    const targetTotalScore = target * totalSelectedWeight
    const requiredScoreFromMissing = targetTotalScore - currentWeightedScore
    const averageRequiredPoints = requiredScoreFromMissing / remainingWeight

    if (averageRequiredPoints > MAX_GPA_VALUE) {
      return {
        possible: false,
        grades: {},
        message: `A ${formatGpa(target)} target is not reachable with the remaining subjects.`
      }
    }

    const requiredGrade = getCeilingGradeForPoints(averageRequiredPoints)
    if (!requiredGrade) {
      return {
        possible: false,
        grades: {},
        message: 'There is not enough remaining weight to calculate a fair grade target.'
      }
    }

    return {
      possible: true,
      grades: Object.fromEntries(missingSubjects.map(subject => [subject, requiredGrade])),
      message: averageRequiredPoints <= 1
        ? `Any passing entered grade keeps ${formatGpa(target)} in reach.`
        : `Aim for about ${requiredGrade} or higher across the remaining subjects. Higher grades can offset lower ones.`
    }
  }

  const calculateYearlyGPA = () => calculateGPA()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) {
        setHasHydratedState(true)
        return
      }

      const parsed = JSON.parse(raw)
      const hydratedSubjects = sanitizePersistedSubjects(parsed?.selectedSubjects)
      const hydratedModes = hydratedSubjects.reduce((acc, subject) => {
        acc[subject] = parsed?.gradeEntryModes?.[subject] === 'terms' ? 'terms' : 'final'
        return acc
      }, {})
      const safeStep = ['selection', 'target', 'gradeEntry', 'results'].includes(parsed?.currentStep)
        ? parsed.currentStep
        : 'selection'

      setSelectedSubjects(hydratedSubjects)
      setGradeEntryModes(hydratedModes)
      setDirectFinalGrades(typeof parsed?.directFinalGrades === 'object' && parsed.directFinalGrades ? parsed.directFinalGrades : {})
      setTermGrades(typeof parsed?.termGrades === 'object' && parsed.termGrades ? parsed.termGrades : {})
      setTermFinalGrades(typeof parsed?.termFinalGrades === 'object' && parsed.termFinalGrades ? parsed.termFinalGrades : {})
      setExpectedGrades(typeof parsed?.expectedGrades === 'object' && parsed.expectedGrades ? parsed.expectedGrades : {})
      setCurrentStep(safeStep)
      setTargetGPA(getOptionalTargetFromPersisted(parsed))
      setStudentYearLevel(typeof parsed?.studentYearLevel === 'string' ? parsed.studentYearLevel : '')
      setCurrentTerm(TERMS.includes(parsed?.currentTerm) ? parsed.currentTerm : getDetectedTerm())
      setTermSelectionMode(parsed?.termSelectionMode === 'manual' ? 'manual' : 'auto')
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
      currentTerm,
      gradeEntryModes,
      termGrades,
      directFinalGrades,
      termFinalGrades,
      expectedGrades,
      targetGPA,
      activeSubjectIndex,
      termSelectionMode,
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
    currentTerm,
    gradeEntryModes,
    termGrades,
    directFinalGrades,
    termFinalGrades,
    expectedGrades,
    targetGPA,
    activeSubjectIndex,
    termSelectionMode,
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
  }, [termGrades, directFinalGrades, gradeEntryModes, selectedSubjects, termFinalGrades])

  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const currentGPA = calculateGPA(false)
      setGpa(currentGPA)
      setYearlyGPA(calculateYearlyGPA())
    }
  }, [finalGrades, selectedSubjects, predictedSubjects])

  useEffect(() => {
    if (activeSubjectIndex > selectedSubjects.length - 1) {
      setActiveSubjectIndex(Math.max(0, selectedSubjects.length - 1))
    }
  }, [activeSubjectIndex, selectedSubjects.length])

  const handleElectiveToggle = (subject) => {
    const isSelected = selectedSubjects.includes(subject)

    if (isSelected) {
      const updatedSubjects = selectedSubjects.filter(item => item !== subject)
      setSelectedSubjects(updatedSubjects)
      setDirectFinalGrades(removeSubjectKey(directFinalGrades, subject))
      setTermGrades(removeSubjectKey(termGrades, subject))
      setTermFinalGrades(removeSubjectKey(termFinalGrades, subject))
      setExpectedGrades(removeSubjectKey(expectedGrades, subject))
      setGradeEntryModes(removeSubjectKey(gradeEntryModes, subject))
      setIsTargetTransitioning(false)
      if (currentStep !== 'selection') setCurrentStep('selection')
      return
    }

    if (selectedElectiveCount >= MAX_ELECTIVES) return

    const updatedSubjects = [...selectedSubjects, subject]
    const updatedElectiveCount = updatedSubjects.filter(item => !CORE_SUBJECTS.includes(item)).length
    setSelectedSubjects(updatedSubjects)
    setGradeEntryModes(prev => ({ ...prev, [subject]: 'final' }))

    if (updatedElectiveCount === MAX_ELECTIVES) {
      setIsTargetTransitioning(true)
      window.setTimeout(() => {
        setTargetInput(targetGPA ? String(targetGPA) : '')
        setIsTargetTransitioning(false)
        setCurrentStep('target')
      }, 280)
    }
  }

  const removeSubjectKey = (source, subject) => {
    const copy = { ...source }
    delete copy[subject]
    return copy
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
    setGradeEntryModes(prev => ({ ...prev, [subject]: 'final' }))
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
      setSettingsTargetInput('')
    }
  }

  const resetCalculator = () => {
    setCurrentStep('selection')
    setSelectedSubjects([...CORE_SUBJECTS])
    setActiveSubjectIndex(0)
    setGradeEntryModes(createDefaultGradeModes())
    setTermGrades({})
    setDirectFinalGrades({})
    setTermFinalGrades({})
    setExpectedGrades({})
    setFinalGrades({})
    setGpa(null)
    setYearlyGPA(null)
    setTargetGPA(null)
    setTargetInput('')
    setSaveStatusMessage('')
    setSaveErrorMessage('')
    setCurrentTerm(getDetectedTerm())
    setTermSelectionMode('auto')
  }

  const persistLocalGpaSnapshot = (payload) => {
    try {
      const existingRecords = JSON.parse(localStorage.getItem(LOCAL_GPA_SAVES_KEY) || '[]')
      localStorage.setItem(LOCAL_GPA_SAVES_KEY, JSON.stringify([payload, ...existingRecords].slice(0, 25)))
      return true
    } catch (error) {
      console.error('Failed to save local GPA snapshot:', error)
      return false
    }
  }

  const saveSnapshotToGoogleDoc = async () => {
    if (!studentName.trim()) {
      setSaveErrorMessage('Enter your name before saving.')
      return
    }

    if (!studentYearLevel.trim()) {
      setSaveErrorMessage('Enter your year level before saving.')
      return
    }

    if (isInappropriateName(studentName)) {
      setSaveErrorMessage('That name looks invalid. Please use your real name.')
      return
    }

    setIsSaving(true)
    setSaveStatusMessage('')
    setSaveErrorMessage('')

    const subjectSummaries = selectedSubjects.map(subject => ({
      subject,
      weight: SUBJECTS[subject],
      entryMode: gradeEntryModes[subject] || 'final',
      finalGrade: finalGrades[subject]?.grade ?? null,
      finalPoints: finalGrades[subject]?.points ?? null,
      termGrades: termGrades[subject] ?? {},
      directFinalGrade: directFinalGrades[subject] ?? null,
      semesterFinalGrade: termFinalGrades[subject] ?? null
    }))

    const payload = {
      studentName: studentName.trim(),
      yearLevel: studentYearLevel.trim(),
      currentTerm,
      detectedTerm: getDetectedTerm(),
      termSelectionMode,
      gpa: gpa !== null ? Number(gpa.toFixed(2)) : null,
      yearlyGpa: yearlyGPA !== null ? Number(yearlyGPA.toFixed(2)) : null,
      targetGpa: targetGPA,
      completedSubjects: enteredFinalGradeCount,
      totalSubjects: selectedSubjects.length,
      subjects: subjectSummaries,
      timestamp: new Date().toISOString(),
      googleDocId: GOOGLE_DOC_ID
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

  const renderTopBar = (title) => (
    <header className="gpa-final-topbar">
      <div className="gpa-final-topbar-title">{title}</div>
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

  const renderGradeSummary = (showOnlyEntered = false, allowClick = false, navigateToSubject = null) => (
    <div className="gpa-grade-list" aria-live="polite" aria-atomic="false">
      {selectedSubjects
        .filter(subject => !showOnlyEntered || finalGrades[subject])
        .map(subject => {
          const grade = finalGrades[subject]
          const isPredicted = predictedSubjects[subject]
          const rowContent = (
            <>
              <span className="gpa-grade-subject">{subject}</span>
              <span className={`gpa-grade-column${grade ? '' : ' is-empty'}`}>
                {grade ? grade.grade : 'Not entered'}
                {isPredicted ? <span className="gpa-predicted-badge" title="Excluded from base GPA">predicted</span> : null}
              </span>
            </>
          )
          if (allowClick && navigateToSubject) {
            return (
              <button
                type="button"
                key={subject}
                className="gpa-grade-row gpa-grade-row-clickable"
                onClick={() => navigateToSubject(subject)}
              >
                {rowContent}
              </button>
            )
          }
          return (
            <div className="gpa-grade-row" key={subject}>
              {rowContent}
            </div>
          )
        })}
    </div>
  )

  const renderRequirements = () => {
    if (!targetGPA) return null

    return (
      <section className="gpa-card gpa-lower-card">
        <div className="gpa-card-heading-row">
          <h2>Requirements</h2>
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

  const renderSelectionScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Choose your subjects')}
      <section className={`gpa-selection-panel${isTargetTransitioning ? ' is-transitioning' : ''}`}>
        <div className="gpa-subject-groups">
          <div className="gpa-subject-group">
            <h2 className="gpa-subject-group-heading">Core subjects</h2>
            <p className="gpa-subject-group-note">These are always included in your GPA calculation.</p>
            <div className="gpa-core-list">
              {CORE_SUBJECTS.map((subject, index) => (
                <div key={subject} className="gpa-core-item" style={{ animationDelay: `${index * 25}ms` }}>
                  <span className="gpa-core-name">{subject}</span>
                  <span className="gpa-core-weight">{CORE_SUBJECT_WEIGHTS[subject]}x weight</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gpa-subject-group">
            <div className="gpa-subject-group-header-row">
              <div>
                <h2 className="gpa-subject-group-heading">Electives</h2>
                <p className="gpa-subject-group-note">Choose up to {MAX_ELECTIVES}. {selectedElectiveCount} of {MAX_ELECTIVES} selected.</p>
              </div>
            </div>
            <div className="gpa-elective-grid" aria-label="Electives">
              {ELECTIVE_SUBJECTS.map((subject, index) => {
                const isSelected = selectedSubjects.includes(subject)
                const isDisabled = !isSelected && selectedElectiveCount >= MAX_ELECTIVES
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
                    <span>{subject}</span>
                    {isSelected ? <Check aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {persistenceWarning ? (
          <p className="gpa-quiet-warning">Progress may not persist because browser storage was blocked.</p>
        ) : null}
      </section>
    </main>
  )

  const renderTargetScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Set your goal')}
      <section className="gpa-target-stage" aria-label="Optional target GPA">
        <div className="gpa-target-card">
          <h1 id="target-gpa-label">Target GPA</h1>
          <p className="gpa-target-description">Set a goal to see what grades you need to reach it. Optional — you can skip this.</p>
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
            <button type="button" className="gpa-secondary-action" onClick={skipTargetAndContinue}>Skip</button>
            <button type="button" className="gpa-primary-action" onClick={saveTargetAndContinue}>Save</button>
          </div>
        </div>
      </section>
    </main>
  )

  const renderGradeEntryScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Enter your grades')}
      <section className="gpa-grade-card gpa-card">
        <div className="gpa-subject-heading-row">
          <h1 key={activeSubject}>{activeSubject}</h1>
          <span>{activeSubjectIndex + 1} of {selectedSubjects.length}</span>
        </div>
        <div className="gpa-prediction-row">
          <button
            type="button"
            className={`gpa-prediction-toggle${predictedSubjects[activeSubject] ? ' is-predicted' : ''}`}
            onClick={() => handleTogglePredicted(activeSubject)}
          >
            {predictedSubjects[activeSubject] ? 'Marked as predicted' : 'Mark as predicted'}
          </button>
          <p className="gpa-prediction-note">Predicted grades are excluded from your base GPA but still visible.</p>
        </div>
        <div key={selectedGrade || 'empty'} className={`gpa-selected-grade-display${selectedGrade ? ' gpa-grade-just-selected' : ''}`}>
          {selectedGrade || <span className="gpa-no-grade">Tap a grade below</span>}
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
            className="gpa-prev-subject-button"
            onClick={handlePreviousSubject}
            disabled={activeSubjectIndex === 0}
          >
            <ChevronRight aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
            Previous
          </button>
          <button
            type="button"
            className="gpa-next-subject-button"
            onClick={handleNextSubject}
            disabled={!selectedGrade}
          >
            {activeSubjectIndex === selectedSubjects.length - 1 ? 'See GPA' : 'Next subject'}
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={`gpa-lower-grid${targetGPA ? '' : ' single'}`}>
        <section className="gpa-card gpa-lower-card">
          <h2>Grade summary</h2>
          {renderGradeSummary(false, true, navigateToSubject)}
        </section>
        {renderRequirements()}
      </section>
    </main>
  )

  const renderResultsScreen = () => (
    <main className="gpa-final-page" id="main-content">
      {renderTopBar('Your GPA')}
      <section className="gpa-card gpa-result-card">
        <div className="gpa-result-layout">
          <div className="gpa-result-main">
            <div className="gpa-result-number" aria-live="polite" aria-atomic="true">{gpa && gpa > 0 ? gpa.toFixed(2) : '--'}</div>
            <div className="gpa-result-subtitle">
              {closestGpaGrade ? `Closest grade: ${closestGpaGrade}` : 'Enter grades to calculate your GPA'}
            </div>
            {hasPredictedSubjects && baseGpa !== null && (
              <div className="gpa-predicted-note-row">
                Base GPA: <strong>{baseGpa.toFixed(2)}</strong> (excluding predicted)
              </div>
            )}
            {targetGPA ? (
              <div className={`gpa-target-comparison ${gpa >= targetGPA ? 'is-met' : 'is-short'}`}>
                {gpa >= targetGPA
                  ? `Meets target ${formatGpa(targetGPA)}`
                  : `${(targetGPA - (gpa || 0)).toFixed(2)} below target ${formatGpa(targetGPA)}`}
              </div>
            ) : null}
          </div>
          <div className="gpa-result-breakdown">
            <h3>Subject contributions</h3>
            <div className="gpa-grade-list">
              {selectedSubjects.map(subject => {
                const grade = finalGrades[subject]
                const weight = SUBJECTS[subject]
                const isPredicted = predictedSubjects[subject]
                return (
                  <button
                    type="button"
                    key={subject}
                    className="gpa-grade-row gpa-grade-row-clickable"
                    onClick={() => navigateToSubject(subject)}
                  >
                    <span className="gpa-grade-subject">{subject}</span>
                    <span className="gpa-grade-column">
                      {grade ? grade.grade : 'Not entered'}
                      {isPredicted ? <span className="gpa-predicted-badge" title="Excluded from base GPA">predicted</span> : null}
                    </span>
                    <span className="gpa-grade-weight">{weight}x</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="gpa-result-save-section">
          <div className="gpa-save-form">
            <label>
              <span>Student name</span>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="e.g. Alex Chen"
              />
            </label>
            <label>
              <span>Year level</span>
              <input
                value={studentYearLevel}
                onChange={(event) => setStudentYearLevel(event.target.value)}
                placeholder="e.g. Year 11"
              />
            </label>
            <button
              type="button"
              className="gpa-primary-action"
              onClick={saveSnapshotToGoogleDoc}
              disabled={isSaving}
            >
              {isSaving ? <><span className="gpa-spinner" /> Saving...</> : 'Save result'}
            </button>
          </div>
          {saveStatusMessage ? <p className="gpa-save-status">{saveStatusMessage}</p> : null}
          {saveErrorMessage ? <p className="gpa-save-error" role="alert">{saveErrorMessage}</p> : null}
        </div>
        <div className="gpa-result-actions">
          <button type="button" className="gpa-primary-action" onClick={() => setCurrentStep('gradeEntry')}>Edit grades</button>
          <button type="button" className="gpa-secondary-action" onClick={() => setCurrentStep('selection')}>Change electives</button>
        </div>
      </section>
      <section className="gpa-lower-grid">
        <section className="gpa-card gpa-lower-card" style={{ animationDelay: '100ms' }}>
          <h2>Grade summary</h2>
          {renderGradeSummary(true, true, navigateToSubject)}
        </section>
      </section>
    </main>
  )

  const renderSettings = () => {
    if (!showSettings) return null

    return (
      <div className="gpa-settings-backdrop" role="presentation" onMouseDown={() => setShowSettings(false)}>
        <aside className="gpa-settings-panel" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={event => event.stopPropagation()}>
          <div className="gpa-settings-header">
            <h2>Settings</h2>
            <button type="button" className="gpa-icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings">
              <X aria-hidden="true" />
            </button>
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
            <h3>Student details</h3>
            <label>
              Year level
              <input value={studentYearLevel} onChange={event => setStudentYearLevel(event.target.value)} />
            </label>
          </div>
          <div className="gpa-settings-section">
            <h3>Reset progress</h3>
            <button type="button" className="gpa-reset-button" onClick={resetCalculator}>
              <RotateCcw aria-hidden="true" />
              Reset progress
            </button>
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="gpa-final-app" style={appThemeStyle}>
      <a href="#main-content" className="gpa-skip-link">Skip to main content</a>
      {currentStep === 'selection' ? renderSelectionScreen() : null}
      {currentStep === 'target' ? renderTargetScreen() : null}
      {currentStep === 'gradeEntry' ? renderGradeEntryScreen() : null}
      {currentStep === 'results' ? renderResultsScreen() : null}
      {renderSettings()}
    </div>
  )
}

export default App
