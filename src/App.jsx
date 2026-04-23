import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Calculator, GraduationCap, BookOpen, Target, Sparkles, Calendar, Save, FileText, Trophy, AlertTriangle, ToggleLeft, ToggleRight, Info } from 'lucide-react'
import '../App.css'

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
const LANGUAGE_ELECTIVE_WEIGHT = 0.6
const CORE_SUBJECT_WEIGHTS = {
  'English': 1.0,
  'Health and Physical Education': 0.6,
  'History': 1.0,
  'Mathematics': 1.0,
  'Science': 1.0
}
const SUBJECTS = {
  ...CORE_SUBJECT_WEIGHTS,
  ...Object.fromEntries(ELECTIVE_SUBJECTS.map(subject => [subject, LANGUAGE_SUBJECTS.has(subject) ? LANGUAGE_ELECTIVE_WEIGHT : DEFAULT_ELECTIVE_WEIGHT]))
}

const createDefaultGradeModes = () =>
  CORE_SUBJECTS.reduce((acc, subject) => {
    acc[subject] = 'terms'
    return acc
  }, {})

const GRADES = {
  'A+': 15, 'A': 14, 'A-': 13,
  'B+': 12, 'B': 11, 'B-': 10,
  'C+': 9, 'C': 8, 'C-': 7,
  'D+': 6, 'D': 5, 'D-': 4,
  'F+': 3, 'F': 2, 'F-': 1
}

const GRADE_OPTIONS = Object.keys(GRADES)
const MIN_GPA_VALUE = 0.1
const MAX_GPA_VALUE = 15
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
const MAX_ELECTIVES = 4
const MAX_SUBJECTS = CORE_SUBJECTS.length + MAX_ELECTIVES
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const QUEENSLAND_TERM_DATES = {
  2026: [
    { term: 'Term 1', start: '2026-01-27', end: '2026-04-02' },
    { term: 'Term 2', start: '2026-04-20', end: '2026-06-26' },
    { term: 'Term 3', start: '2026-07-13', end: '2026-09-18' },
    { term: 'Term 4', start: '2026-10-06', end: '2026-12-11' }
  ],
  2027: [
    { term: 'Term 1', start: '2027-01-27', end: '2027-03-25' },
    { term: 'Term 2', start: '2027-04-12', end: '2027-06-25' },
    { term: 'Term 3', start: '2027-07-12', end: '2027-09-17' },
    { term: 'Term 4', start: '2027-10-05', end: '2027-12-10' }
  ]
}
const FINAL_TERMS = new Set(['Term 2', 'Term 4'])
// Semester subjects (0.3 weight) - only have Term 1-2 OR Term 3-4
const SEMESTER_SUBJECTS = new Set(ELECTIVE_SUBJECTS.filter(subject => !LANGUAGE_SUBJECTS.has(subject)))
// Three-term subjects (0.6 weight) - have Term 1, 2, 3 (no Term 4)
const THREE_TERM_SUBJECTS = new Set([...LANGUAGE_SUBJECTS, 'Health and Physical Education'])
const GOOGLE_DOC_ID = '1ICuIvuBC-uTpdKCgQWYNKqAfPfnOzOQPIyLYMoXhqvo'
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyjgbJvf_vTYx3WzoKqL0Tah8QsHYiPvaL3WPlThWpQAFMB9z0nvDKbqT2RigFMaYyI/exec'
const LOCAL_STORAGE_KEY = 'gpa-calculator-state-v1'
const createLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getDetectedTermInfo = (date = new Date()) => {
  const year = date.getFullYear()
  const ranges = QUEENSLAND_TERM_DATES[year]
  if (ranges) {
    const today = new Date(year, date.getMonth(), date.getDate())
    const activeRange = ranges.find(({ start, end }) => today >= createLocalDate(start) && today <= createLocalDate(end))
    if (activeRange) {
      return { term: activeRange.term, source: 'Queensland term dates', status: 'in-term' }
    }

    const upcomingRange = ranges.find(({ start }) => today < createLocalDate(start))
    if (upcomingRange) {
      return { term: upcomingRange.term, source: 'Queensland term dates', status: 'upcoming' }
    }

    return { term: ranges[ranges.length - 1].term, source: 'Queensland term dates', status: 'after-year' }
  }

  const month = date.getMonth()
  if (month <= 2) return { term: 'Term 1', source: 'month estimate', status: 'estimated' }
  if (month <= 5) return { term: 'Term 2', source: 'month estimate', status: 'estimated' }
  if (month <= 8) return { term: 'Term 3', source: 'month estimate', status: 'estimated' }
  return { term: 'Term 4', source: 'month estimate', status: 'estimated' }
}
const getDetectedTerm = () => getDetectedTermInfo().term

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

// Content moderation function
const isInappropriateName = (name) => {
  const lowerName = name.toLowerCase().trim()
  
  // List of inappropriate words/patterns
  const inappropriateWords = [
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap', 'piss', 'dick', 'cock', 
    'pussy', 'cunt', 'bastard', 'whore', 'slut', 'nigger', 'nigga', 'fag', 
    'faggot', 'retard', 'penis', 'vagina', 'sex', 'porn', 'xxx', 'kill', 
    'die', 'death', 'hitler', 'nazi', 'kkk', 'terrorist', 'bomb', 'rape',
    'idiot', 'stupid', 'dumb', 'moron', 'loser', 'hate', 'kys'
  ]
  
  // Check if name contains any inappropriate words
  for (let word of inappropriateWords) {
    if (lowerName.includes(word)) {
      return true
    }
  }
  
  // Check for excessive special characters or numbers (likely fake names)
  const specialCharCount = (lowerName.match(/[^a-z\s\-']/g) || []).length
  if (specialCharCount > 3) {
    return true
  }
  
  // Check if name is too short (less than 2 characters)
  if (lowerName.replace(/\s/g, '').length < 2) {
    return true
  }
  
  // Check for repeated characters (like "aaaaaaa" or "111111")
  const hasExcessiveRepetition = /(.)\1{4,}/.test(lowerName)
  if (hasExcessiveRepetition) {
    return true
  }
  
  return false
}

function App() {
  const [currentStep, setCurrentStep] = useState('selection')
  const [selectedSubjects, setSelectedSubjects] = useState(() => [...CORE_SUBJECTS])
  const [currentTerm, setCurrentTerm] = useState(() => getDetectedTerm())
  const [gradeEntryModes, setGradeEntryModes] = useState(() => createDefaultGradeModes()) // { subject: 'terms' | 'final' }
  const [termGrades, setTermGrades] = useState({}) // { subject: { 'Term 1': 'A', 'Term 2': 'B+', ... } }
  const [directFinalGrades, setDirectFinalGrades] = useState({}) // { subject: 'A+' }
  const [termFinalGrades, setTermFinalGrades] = useState({}) // { subject: 'A+' }
  const [finalGrades, setFinalGrades] = useState({}) // Calculated final grades for each subject
  const [gpa, setGpa] = useState(null)
  const [yearlyGPA, setYearlyGPA] = useState(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentYearLevel, setStudentYearLevel] = useState('Year 8')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatusMessage, setSaveStatusMessage] = useState('')
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saveAttempts, setSaveAttempts] = useState(0)
  const [userDismissedDialog, setUserDismissedDialog] = useState(false)
  const [customTargetGPA, setCustomTargetGPA] = useState('')
  const [targetGPAs, setTargetGPAs] = useState([13.5, 14.0, 14.5])
  const [expectedGrades, setExpectedGrades] = useState({}) // { subject: { 'Term 2': 'A', 'Term 3': 'B+', ... } }
  const [calculationMode, setCalculationMode] = useState('current')
  const [activeSubject, setActiveSubject] = useState(() => CORE_SUBJECTS[0] || null)
  const [showTargetGPADialog, setShowTargetGPADialog] = useState(false)
  const [initialTargetGPA, setInitialTargetGPA] = useState('')
  const [hasHydratedState, setHasHydratedState] = useState(false)
  const [persistenceWarning, setPersistenceWarning] = useState(false)
  const [termSelectionMode, setTermSelectionMode] = useState('auto')
  const [showElectiveChooser, setShowElectiveChooser] = useState(true)
  const selectedElectiveCount = selectedSubjects.filter(subject => !CORE_SUBJECTS.includes(subject)).length
  const selectedElectives = selectedSubjects.filter(subject => !CORE_SUBJECTS.includes(subject))
  const detectedTermInfo = getDetectedTermInfo()
  const detectedTerm = detectedTermInfo.term

  const handleSubjectToggle = (subject, checked) => {
    if (CORE_SUBJECTS.includes(subject)) {
      return
    }

    if (checked) {
      if (selectedSubjects.includes(subject)) {
        return
      }
      if (selectedElectiveCount < MAX_ELECTIVES) {
        const updatedSubjects = [...selectedSubjects, subject]
        setSelectedSubjects(updatedSubjects)
        setGradeEntryModes(prev => ({ ...prev, [subject]: 'terms' }))
        setActiveSubject(subject)
        if (updatedSubjects.filter(s => !CORE_SUBJECTS.includes(s)).length >= MAX_ELECTIVES) {
          setShowElectiveChooser(false)
        }
      } else {
        alert(`You can select a maximum of ${MAX_ELECTIVES} elective subjects.`)
      }
    } else {
      const updatedSubjects = selectedSubjects.filter(s => s !== subject)
      setSelectedSubjects(updatedSubjects)
      const newTermGrades = { ...termGrades }
      delete newTermGrades[subject]
      setTermGrades(newTermGrades)
      const newDirectFinalGrades = { ...directFinalGrades }
      delete newDirectFinalGrades[subject]
      setDirectFinalGrades(newDirectFinalGrades)
      const newFinalGrades = { ...finalGrades }
      delete newFinalGrades[subject]
      setFinalGrades(newFinalGrades)
      const newTermFinalGrades = { ...termFinalGrades }
      delete newTermFinalGrades[subject]
      setTermFinalGrades(newTermFinalGrades)
      const newGradeEntryModes = { ...gradeEntryModes }
      delete newGradeEntryModes[subject]
      setGradeEntryModes(newGradeEntryModes)
      const newExpectedGrades = { ...expectedGrades }
      delete newExpectedGrades[subject]
      setExpectedGrades(newExpectedGrades)
      if (activeSubject === subject) {
        setActiveSubject(updatedSubjects[0] || null)
      }
      if (updatedSubjects.every(s => CORE_SUBJECTS.includes(s))) {
        setShowElectiveChooser(true)
      }
    }
  }

  const handleGradeEntryModeToggle = (subject) => {
    const currentMode = gradeEntryModes[subject] || 'terms'
    const newMode = currentMode === 'terms' ? 'final' : 'terms'
    
    setGradeEntryModes(prev => ({
      ...prev,
      [subject]: newMode
    }))
  }

  const handleGlobalModeToggle = () => {
    // Check if all subjects are currently in final mode
    const allInFinalMode = selectedSubjects.every(subject => 
      gradeEntryModes[subject] === 'final'
    )
    
    // Toggle all subjects to the opposite mode
    const newMode = allInFinalMode ? 'terms' : 'final'
    const newGradeEntryModes = {}
    
    selectedSubjects.forEach(subject => {
      newGradeEntryModes[subject] = newMode
    })
    
    setGradeEntryModes(newGradeEntryModes)
  }

  const getGlobalModeStatus = () => {
    if (selectedSubjects.length === 0) return 'mixed'
    
    const finalModeCount = selectedSubjects.filter(subject => 
      gradeEntryModes[subject] === 'final'
    ).length
    
    if (finalModeCount === 0) return 'terms'
    if (finalModeCount === selectedSubjects.length) return 'final'
    return 'mixed'
  }

  const isSemesterSubject = (subject) => SEMESTER_SUBJECTS.has(subject)
  const isThreeTermSubject = (subject) => THREE_TERM_SUBJECTS.has(subject)

  const getTermsForSubject = (subject) => {
    const currentTermIndex = TERMS.indexOf(currentTerm)
    if (currentTermIndex === -1) return TERMS

    // Three-term subjects: only Term 1, 2, 3
    if (isThreeTermSubject(subject)) {
      if (currentTerm === 'Term 1') return ['Term 1']
      if (currentTerm === 'Term 2') return ['Term 1', 'Term 2']
      if (currentTerm === 'Term 3') return ['Term 1', 'Term 2', 'Term 3']
      return ['Term 1', 'Term 2', 'Term 3'] // Term 4 still shows Term 1-3
    }

    // Semester subjects: Term 1-2 OR Term 3-4
    if (isSemesterSubject(subject)) {
      if (currentTerm === 'Term 1') return ['Term 1']
      if (currentTerm === 'Term 2') return ['Term 1', 'Term 2']
      if (currentTerm === 'Term 3') return ['Term 3']
      return ['Term 3', 'Term 4']
    }

    // Full-year subjects: all terms up to current
    return TERMS.slice(0, currentTermIndex + 1)
  }

  const canCaptureSemesterFinal = (subject) => {
    if (isSemesterSubject(subject)) {
      return FINAL_TERMS.has(currentTerm)
    }
    if (isThreeTermSubject(subject)) {
      return currentTerm === 'Term 3' // Final grade captured at Term 3
    }
    return false
  }

  const handleTermGradeChange = (subject, term, grade) => {
    setTermGrades(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [term]: grade
      }
    }))
  }

  const handleDirectFinalGradeChange = (subject, grade) => {
    setDirectFinalGrades(prev => ({
      ...prev,
      [subject]: grade
    }))
  }

  const handleTermFinalGradeChange = (subject, grade) => {
    setTermFinalGrades(prev => ({
      ...prev,
      [subject]: grade
    }))
  }

  const calculateSubjectFinalGrade = (subject) => {
    const mode = gradeEntryModes[subject] || 'terms'
    
    if (mode === 'final') {
      const directGrade = directFinalGrades[subject]
      if (!directGrade) return null
      return { grade: directGrade, points: GRADES[directGrade] }
    } else {
      // Terms mode
      const overrideGrade = termFinalGrades[subject]
      if (overrideGrade && GRADES[overrideGrade]) {
        return { grade: overrideGrade, points: GRADES[overrideGrade] }
      }

      const subjectTerms = termGrades[subject]
      const relevantTerms = getTermsForSubject(subject)
      if (!subjectTerms || relevantTerms.length === 0) return null

      const enteredGrades = relevantTerms
        .map(term => subjectTerms[term])
        .filter(grade => grade && grade !== '')
      if (enteredGrades.length === 0) return null

      // Calculate average of entered term grades
      const totalPoints = enteredGrades.reduce((sum, grade) => sum + GRADES[grade], 0)
      const averagePoints = totalPoints / enteredGrades.length

      // Find the closest grade to the average
      const closestGrade = getClosestGradeForPoints(averagePoints)

      return { grade: closestGrade, points: averagePoints }
    }
  }

  const calculateGPA = () => {
    let totalWeightedScore = 0
    let totalKnownWeight = 0

    selectedSubjects.forEach(subject => {
      const weight = SUBJECTS[subject]
      const finalGrade = finalGrades[subject]
      
      if (finalGrade && finalGrade.points) {
        totalWeightedScore += finalGrade.points * weight
        totalKnownWeight += weight
      }
    })

    return totalKnownWeight > 0 ? totalWeightedScore / totalKnownWeight : 0
  }

  const calculateYearlyGPA = () => {
    // Calculate yearly GPA using the same logic as current GPA
    // This represents the final yearly GPA based on final calculated grades
    return calculateGPA()
  }

  const calculateRequiredGrades = (targetGPA) => {
    let currentWeightedScore = 0
    let remainingWeight = 0
    const missingSubjects = []
    let totalKnownWeight = 0

    selectedSubjects.forEach(subject => {
      const weight = SUBJECTS[subject]
      const finalGrade = finalGrades[subject]
      
      if (finalGrade && finalGrade.points) {
        currentWeightedScore += finalGrade.points * weight
        totalKnownWeight += weight
      } else {
        remainingWeight += weight
        missingSubjects.push(subject)
      }
    })

    if (missingSubjects.length === 0) {
      const currentGPA = totalKnownWeight > 0 ? currentWeightedScore / totalKnownWeight : 0;
      return { possible: currentGPA >= targetGPA, grades: {} };
    }

    const totalSelectedWeight = selectedSubjects.reduce((sum, subject) => sum + SUBJECTS[subject], 0)
    const targetTotalScore = targetGPA * totalSelectedWeight
    const requiredScoreFromMissing = targetTotalScore - currentWeightedScore;
    const averageRequiredGrade = requiredScoreFromMissing / remainingWeight;
    
    if (averageRequiredGrade > 15) {
      return { possible: false, grades: {} }
    }

    const requiredGrades = {}
    missingSubjects.forEach(subject => {
      const requiredGradeValue = Math.max(1, Math.min(15, averageRequiredGrade))
      
      let closestGrade = 'F-'
      let closestDiff = Math.abs(GRADES['F-'] - requiredGradeValue)
      
      Object.entries(GRADES).forEach(([grade, value]) => {
        const diff = Math.abs(value - requiredGradeValue)
        if (diff < closestDiff) {
          closestGrade = grade
          closestDiff = diff
        }
      })
      
      requiredGrades[subject] = closestGrade
    })

    return { possible: true, grades: requiredGrades }
  }

  const calculateProjectedGPA = (overrides = {}) => {
    let totalWeightedScore = 0
    let totalWeight = 0

    selectedSubjects.forEach(subject => {
      const weight = SUBJECTS[subject]
      const finalGrade = finalGrades[subject]
      const allTermsForSubject = getAllTermsForSubject(subject)

      if (finalGrade && finalGrade.points) {
        totalWeightedScore += finalGrade.points * weight
        totalWeight += weight
        return
      }

      let collectedPoints = 0
      let consideredTerms = 0
      const currentTermIndex = TERMS.indexOf(currentTerm)

      allTermsForSubject.forEach(term => {
        const overrideGrade = overrides[subject]?.[term]
        if (overrideGrade) {
          collectedPoints += GRADES[overrideGrade]
          consideredTerms += 1
          return
        }

        const recordedGrade = termGrades[subject]?.[term]
        if (recordedGrade) {
          collectedPoints += GRADES[recordedGrade]
          consideredTerms += 1
          return
        }

        const termIndex = TERMS.indexOf(term)
        if (termIndex > currentTermIndex) {
          const expectedGrade = expectedGrades[subject]?.[term]
          if (expectedGrade) {
            collectedPoints += GRADES[expectedGrade]
            consideredTerms += 1
          }
        }
      })

      if (consideredTerms > 0) {
        const avgPoints = collectedPoints / consideredTerms
        totalWeightedScore += avgPoints * weight
        totalWeight += weight
      }
    })

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0
  }

  const suggestImprovements = (targetGPA) => {
    const currentGPA = gpa || calculateGPA()
    if (currentGPA >= targetGPA) {
      return { possible: true, suggestions: [] }
    }

    // Find subjects that could be improved
    const suggestions = []
    const subjectsWithGrades = selectedSubjects.filter(subject => finalGrades[subject])

    subjectsWithGrades.forEach(subject => {
      const weight = SUBJECTS[subject]
      const currentGrade = finalGrades[subject]
      
      // Try each higher grade and see impact
      const gradeOptions = Object.keys(GRADES).reverse() // Start from highest
      
      for (let grade of gradeOptions) {
        if (GRADES[grade] > currentGrade.points) {
          // Calculate GPA if this subject was improved
          let newTotalWeightedScore = 0
          let newTotalWeight = 0

          selectedSubjects.forEach(s => {
            const w = SUBJECTS[s]
            const fg = s === subject ? { points: GRADES[grade] } : finalGrades[s]
            
            if (fg && fg.points) {
              newTotalWeightedScore += fg.points * w
              newTotalWeight += w
            }
          })

          const newGPA = newTotalWeight > 0 ? newTotalWeightedScore / newTotalWeight : 0
          
          if (newGPA >= targetGPA) {
            suggestions.push({
              subject,
              from: currentGrade.grade,
              to: grade,
              impact: (newGPA - currentGPA).toFixed(2)
            })
            break // Found the minimum improvement needed for this subject
          }
        }
      }
    })

    // Sort by impact (highest impact first)
    suggestions.sort((a, b) => parseFloat(b.impact) - parseFloat(a.impact))

    return {
      possible: suggestions.length > 0,
      suggestions: suggestions.slice(0, 3) // Return top 3 suggestions
    }
  }

  const getFutureImprovementSuggestions = (projectedGPA) => {
    if (!projectedGPA || projectedGPA <= 0) {
      return { possible: false, suggestions: [] }
    }

    const suggestions = []
    const currentTermIndex = TERMS.indexOf(currentTerm)

    selectedSubjects.forEach(subject => {
      const subjectExpectedGrades = expectedGrades[subject]
      if (!subjectExpectedGrades) {
        return
      }

      Object.entries(subjectExpectedGrades).forEach(([term, grade]) => {
        if (!grade) {
          return
        }

        const termIndex = TERMS.indexOf(term)
        const recordedGrade = termGrades[subject]?.[term]
        if (termIndex <= currentTermIndex && recordedGrade) {
          return
        }

        const gradeIndex = GRADE_OPTIONS.indexOf(grade)
        if (gradeIndex <= 0) {
          return
        }

        const higherGrade = GRADE_OPTIONS[gradeIndex - 1]
        const improvedGPA = calculateProjectedGPA({
          [subject]: {
            [term]: higherGrade
          }
        })
        const impact = improvedGPA - projectedGPA

        if (impact > 0.005) {
          suggestions.push({
            subject,
            term,
            from: grade,
            to: higherGrade,
            impact: impact.toFixed(2)
          })
        }
      })
    })

    suggestions.sort((a, b) => parseFloat(b.impact) - parseFloat(a.impact))

    return {
      possible: suggestions.length > 0,
      suggestions: suggestions.slice(0, 3)
    }
  }

  const handleExpectedGradeChange = (subject, term, grade) => {
    setExpectedGrades(prev => ({
      ...prev,
      [subject]: {
        ...(prev[subject] || {}),
        [term]: grade
      }
    }))
  }

  const handleCurrentTermChange = (term) => {
    setCurrentTerm(term)
    setTermSelectionMode(term === detectedTerm ? 'auto' : 'manual')
  }

  const handleUseDetectedTerm = () => {
    setCurrentTerm(detectedTerm)
    setTermSelectionMode('auto')
  }

  const saveToGoogleDoc = async () => {
    if (!studentName.trim()) {
      alert('Please enter your name before saving!')
      return
    }

    // Check for inappropriate name
    if (isInappropriateName(studentName)) {
      alert('The name you entered appears to be inappropriate or invalid. Please use your real name.')
      return
    }

    if (!GOOGLE_APPS_SCRIPT_URL) {
      alert('Google Apps Script URL is not configured. Please set VITE_GOOGLE_APPS_SCRIPT_URL in your environment.')
      return
    }

    setIsSaving(true)
    
    // Open the Google Doc first, before the async operation
    // This ensures it's triggered by user action and won't be blocked by popup blockers
    const docUrl = `https://docs.google.com/document/d/${GOOGLE_DOC_ID}/edit`
    const docWindow = window.open(docUrl, '_blank', 'noopener,noreferrer')
    
    try {
      const subjectSummaries = selectedSubjects.map(subject => ({
        subject,
        weight: SUBJECTS[subject],
        entryMode: gradeEntryModes[subject] || 'terms',
        finalGrade: finalGrades[subject]?.grade ?? null,
        finalPoints: finalGrades[subject]?.points ?? null,
        termGrades: termGrades[subject] ?? {},
        directFinalGrade: directFinalGrades[subject] ?? null,
        semesterFinalGrade: termFinalGrades[subject] ?? null
      }))

      const payload = {
        studentName: studentName.trim(),
        yearLevel: studentYearLevel,
        currentTerm,
        detectedTerm,
        termSelectionMode,
        gpa: gpa !== null ? Number(gpa.toFixed(2)) : null,
        yearlyGpa: yearlyGPA !== null ? Number(yearlyGPA.toFixed(2)) : null,
        completedSubjects: enteredFinalGradeCount,
        totalSubjects: selectedSubjects.length,
        subjects: subjectSummaries,
        timestamp: new Date().toISOString(),
        googleDocId: GOOGLE_DOC_ID
      }

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          data: JSON.stringify(payload)
        })
      })

      // Try to read the response
      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        // If JSON parsing fails, assume success (for no-cors compatibility)
        responseData = { success: true }
      }

      if (responseData.success !== false) {
        alert(`Successfully saved ${studentName}'s GPA (${gpa?.toFixed(2)}) to Google Doc!`)
        
        // Check if popup was blocked
        if (!docWindow || docWindow.closed || typeof docWindow.closed === 'undefined') {
          // Popup was blocked, provide a fallback
          const openNow = confirm('The Google Doc popup was blocked. Click OK to open it now.')
          if (openNow) {
            window.open(docUrl, '_blank', 'noopener,noreferrer')
          }
        }
        
        setShowSaveDialog(false)
        setStudentName('')
        setSaveAttempts(0)
      } else {
        throw new Error(responseData.message || 'Failed to save to Google Doc')
      }
    } catch (error) {
      console.error('Failed to save GPA to Google Doc:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      
      // Show specific error message from server
      if (errorMessage.includes('inappropriate') || errorMessage.includes('invalid')) {
        alert(errorMessage)
      } else {
        alert(`Failed to save to Google Doc.\n\n${errorMessage}`)
      }
      
      // Close the doc window if save failed
      if (docWindow && !docWindow.closed) {
        docWindow.close()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const saveSnapshotToGoogleDoc = async () => {
    if (!studentName.trim()) {
      setSaveErrorMessage('Enter your name before saving.')
      return
    }

    if (isInappropriateName(studentName)) {
      setSaveErrorMessage('That name looks invalid. Please use your real name.')
      return
    }

    if (!GOOGLE_APPS_SCRIPT_URL) {
      setSaveErrorMessage('Google Docs is not connected yet. Add the Apps Script web app URL first.')
      return
    }

    setIsSaving(true)
    setSaveStatusMessage('')
    setSaveErrorMessage('')

    try {
      const subjectSummaries = selectedSubjects.map(subject => ({
        subject,
        weight: SUBJECTS[subject],
        entryMode: gradeEntryModes[subject] || 'terms',
        finalGrade: finalGrades[subject]?.grade ?? null,
        finalPoints: finalGrades[subject]?.points ?? null,
        termGrades: termGrades[subject] ?? {},
        directFinalGrade: directFinalGrades[subject] ?? null,
        semesterFinalGrade: termFinalGrades[subject] ?? null
      }))

      const payload = {
        studentName: studentName.trim(),
        yearLevel: studentYearLevel,
        currentTerm,
        detectedTerm,
        termSelectionMode,
        gpa: gpa !== null ? Number(gpa.toFixed(2)) : null,
        yearlyGpa: yearlyGPA !== null ? Number(yearlyGPA.toFixed(2)) : null,
        completedSubjects: enteredFinalGradeCount,
        totalSubjects: selectedSubjects.length,
        subjects: subjectSummaries,
        timestamp: new Date().toISOString(),
        googleDocId: GOOGLE_DOC_ID
      }

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          data: JSON.stringify(payload)
        })
      })

      const cannotVerifyAppsScriptPost = response.type === 'opaque'
      setSaveStatusMessage(
        cannotVerifyAppsScriptPost
          ? `Save request sent for ${studentName.trim()}. Check the Google Doc to confirm it was added.`
          : `Saved ${studentName.trim()}'s ${studentYearLevel} ${currentTerm} GPA to Google Docs.`
      )
      setShowSaveDialog(false)
      setStudentName('')
      setSaveAttempts(0)
    } catch (error) {
      console.error('Failed to save GPA to Google Doc:', error)
      const errorMessage = error.message || 'Unknown error occurred'

      if (errorMessage.includes('inappropriate') || errorMessage.includes('invalid')) {
        setSaveErrorMessage(errorMessage)
      } else {
        setSaveErrorMessage(`Could not reach Google Docs. ${errorMessage}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDialogOpenChange = (open) => {
    if (open) {
      setSaveErrorMessage('')
      setShowSaveDialog(true)
      return
    }

    setSaveAttempts(prev => prev + 1)
    setShowSaveDialog(false)
    setUserDismissedDialog(true)
  }

  const handleSaveDialogClose = () => handleSaveDialogOpenChange(false)

  const getPassiveAggressiveMessage = () => {
    switch (saveAttempts) {
      case 0:
        return "Save your GPA to Google Doc so you can keep a record of your progress."
      case 1:
        return "Want to save this now? It can help when you compare progress later."
      case 2:
        return "No pressure - saving now just makes it easier to come back to these results."
      case 3:
        return "You can keep going without saving, or save a copy to your Google Doc."
      default:
        return "All good. You can still save later anytime."
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
      const persistedSubjects = sanitizePersistedSubjects(parsed?.selectedSubjects)
      const safeSelectedSubjects = persistedSubjects.length > 0 ? persistedSubjects : [...CORE_SUBJECTS]

      const safeCurrentStep = parsed?.currentStep === 'gradeEntry' ? 'gradeEntry' : 'selection'
      const safeCalculationMode = parsed?.calculationMode === 'future' ? 'future' : 'current'
      const safeShowElectiveChooser = safeSelectedSubjects.some(subject => !CORE_SUBJECTS.includes(subject))
        ? false
        : typeof parsed?.showElectiveChooser === 'boolean'
        ? parsed.showElectiveChooser
        : true

      const persistedGradeModes = typeof parsed?.gradeEntryModes === 'object' && parsed.gradeEntryModes !== null
        ? parsed.gradeEntryModes
        : {}
      const hydratedGradeModes = safeSelectedSubjects.reduce((acc, subject) => {
        acc[subject] = persistedGradeModes[subject] === 'final' ? 'final' : 'terms'
        return acc
      }, {})

      if (safeSelectedSubjects.length > 0) {
        setSelectedSubjects(safeSelectedSubjects)
      }
      setCurrentStep(safeCurrentStep)
      const safeTermSelectionMode = parsed?.termSelectionMode === 'manual' ? 'manual' : 'auto'
      const safeCurrentTerm = safeTermSelectionMode === 'manual' && TERMS.includes(parsed?.currentTerm)
        ? parsed.currentTerm
        : getDetectedTerm()
      setTermSelectionMode(safeTermSelectionMode)
      setCurrentTerm(safeCurrentTerm)
      setCalculationMode(safeCalculationMode)
      setGradeEntryModes(hydratedGradeModes)
      setShowElectiveChooser(safeShowElectiveChooser)

      if (typeof parsed?.termGrades === 'object' && parsed.termGrades !== null) {
        setTermGrades(parsed.termGrades)
      }
      if (typeof parsed?.directFinalGrades === 'object' && parsed.directFinalGrades !== null) {
        setDirectFinalGrades(parsed.directFinalGrades)
      }
      if (typeof parsed?.termFinalGrades === 'object' && parsed.termFinalGrades !== null) {
        setTermFinalGrades(parsed.termFinalGrades)
      }
      if (typeof parsed?.expectedGrades === 'object' && parsed.expectedGrades !== null) {
        setExpectedGrades(parsed.expectedGrades)
      }

      if (Array.isArray(parsed?.targetGPAs)) {
        const safeTargetGPAs = [...new Set(parsed.targetGPAs)]
          .map(value => Number(value))
          .filter(value => Number.isFinite(value) && value >= MIN_GPA_VALUE && value <= MAX_GPA_VALUE)
          .sort((a, b) => a - b)
        if (safeTargetGPAs.length > 0) {
          setTargetGPAs(safeTargetGPAs)
        }
      }
      if (typeof parsed?.studentYearLevel === 'string' && parsed.studentYearLevel.trim()) {
        setStudentYearLevel(parsed.studentYearLevel)
      }

      const persistedActiveSubject = parsed?.activeSubject
      if (persistedActiveSubject && safeSelectedSubjects.includes(persistedActiveSubject)) {
        setActiveSubject(persistedActiveSubject)
      } else {
        setActiveSubject(safeSelectedSubjects[0] || null)
      }
    } catch (error) {
        console.error('Failed to restore calculator state. Starting with default settings.', error)
      setPersistenceWarning(true)
    } finally {
      setHasHydratedState(true)
    }
  }, [])

  useEffect(() => {
    const syncDetectedTerm = () => {
      if (termSelectionMode === 'auto') {
        setCurrentTerm(getDetectedTerm())
      }
    }
    syncDetectedTerm()
    const intervalId = window.setInterval(syncDetectedTerm, 60 * 60 * 1000)
    return () => window.clearInterval(intervalId)
  }, [termSelectionMode])

  useEffect(() => {
    if (!hasHydratedState) {
      return
    }

    const stateToPersist = {
      currentStep,
      selectedSubjects,
      currentTerm,
      gradeEntryModes,
      termGrades,
      directFinalGrades,
      termFinalGrades,
      expectedGrades,
      calculationMode,
      targetGPAs,
      activeSubject,
      termSelectionMode,
      studentYearLevel,
      showElectiveChooser
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
    calculationMode,
    targetGPAs,
    activeSubject,
    termSelectionMode,
    studentYearLevel,
    showElectiveChooser
  ])

  // Update final grades when term grades or direct final grades change
  useEffect(() => {
    const newFinalGrades = {}
    selectedSubjects.forEach(subject => {
      const finalGrade = calculateSubjectFinalGrade(subject)
      if (finalGrade) {
        newFinalGrades[subject] = finalGrade
      }
    })
    setFinalGrades(newFinalGrades)
  }, [termGrades, directFinalGrades, gradeEntryModes, selectedSubjects, termFinalGrades, currentTerm])

  // Update GPA when final grades change
  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const currentGPA = calculateGPA()
      setGpa(currentGPA)
      setYearlyGPA(calculateYearlyGPA())
    }
  }, [finalGrades, selectedSubjects])

  useEffect(() => {
    if (selectedSubjects.length === 0) {
      setActiveSubject(null)
      return
    }

    if (!activeSubject || !selectedSubjects.includes(activeSubject)) {
      setActiveSubject(selectedSubjects[0])
    }
  }, [selectedSubjects, activeSubject])

  const proceedToGradeEntry = () => {
    if (selectedSubjects.length > 0) {
      setShowTargetGPADialog(false)
      setActiveSubject(selectedSubjects[0])
      setCurrentStep('gradeEntry')
    }
  }

  const handleTargetGPASubmit = () => {
    const gpaValue = parseFloat(initialTargetGPA)
    
    if (initialTargetGPA && gpaValue && gpaValue >= MIN_GPA_VALUE && gpaValue <= MAX_GPA_VALUE) {
      // Check if already exists (with some tolerance for floating point)
      const exists = targetGPAs.some(target => Math.abs(target - gpaValue) < 0.01)
      if (!exists) {
        setTargetGPAs([...targetGPAs, gpaValue].sort((a, b) => a - b))
      }
    }
    
    setShowTargetGPADialog(false)
    setCurrentStep('gradeEntry')
    setInitialTargetGPA('')
  }

  const handleSkipTargetGPA = () => {
    setShowTargetGPADialog(false)
    setCurrentStep('gradeEntry')
    setInitialTargetGPA('')
  }

  const resetCalculator = () => {
    setCurrentStep('selection')
    setSelectedSubjects([...CORE_SUBJECTS])
    setCurrentTerm(getDetectedTerm())
    setTermSelectionMode('auto')
    setShowElectiveChooser(true)
    setGradeEntryModes(createDefaultGradeModes())
    setTermGrades({})
    setDirectFinalGrades({})
    setTermFinalGrades({})
    setFinalGrades({})
    setGpa(null)
    setYearlyGPA(null)
    setSaveAttempts(0)
    setExpectedGrades({})
    setCalculationMode('current')
    setActiveSubject(CORE_SUBJECTS[0] || null)
  }

  const getSubjectTermsCompleted = (subject) => {
    const subjectTerms = termGrades[subject] || {}
    const relevantTerms = getTermsForSubject(subject)
    if (relevantTerms.length === 0) return 0
    return relevantTerms.filter(term => subjectTerms[term] && subjectTerms[term] !== '').length
  }

  const getGradeEntryModeLabel = (subject) => {
    const mode = gradeEntryModes[subject] || 'terms'
    return mode === 'terms' ? 'Term Grades' : 'Final Grade (D2L)'
  }

  const getAllTermsForSubject = (subject) => {
    if (isThreeTermSubject(subject)) {
      return ['Term 1', 'Term 2', 'Term 3']
    }
    if (isSemesterSubject(subject)) {
      const recordedTerms = Object.keys(termGrades[subject] || {})
      const hasFirstSemesterData = recordedTerms.some(term => term === 'Term 1' || term === 'Term 2')
      const hasSecondSemesterData = recordedTerms.some(term => term === 'Term 3' || term === 'Term 4')
      if (hasSecondSemesterData) {
        return ['Term 3', 'Term 4']
      }
      if (hasFirstSemesterData) {
        return ['Term 1', 'Term 2']
      }
      const currentTermIndex = TERMS.indexOf(currentTerm)
      if (currentTermIndex >= 2) {
        return ['Term 3', 'Term 4']
      }
      return ['Term 1', 'Term 2']
    }
    return TERMS
  }

  const getFutureTermsForSubject = (subject) => {
    if (finalGrades[subject]) {
      return []
    }

    const subjectTerms = getAllTermsForSubject(subject)
    const currentTermIndex = TERMS.indexOf(currentTerm)

    return subjectTerms.filter(term => {
      // Ignore terms we already have recorded grades for
      if (termGrades[subject]?.[term]) {
        return false
      }

      const termIndex = TERMS.indexOf(term)

      // Always include terms after the current term
      if (termIndex > currentTermIndex) {
        return true
      }

      // When the current term is Term 4 (end of year), only allow predictions for Term 4 itself
      if (currentTerm === 'Term 4') {
        return term === 'Term 4'
      }

      // Include the current term if we do not yet have a grade saved
      if (termIndex === currentTermIndex) {
        return true
      }

      // Allow earlier terms without recorded grades so students can plan or backfill expectations
      return true
    })
  }

  const hasAnyExpectedFutureGrades = selectedSubjects.some(subject => {
    if (finalGrades[subject]) {
      return false
    }
    return getFutureTermsForSubject(subject).some(term => expectedGrades[subject]?.[term])
  })

  const hasCompleteExpectedFutureGrades = selectedSubjects.every(subject => {
    if (finalGrades[subject]) {
      return true
    }
    const futureTerms = getFutureTermsForSubject(subject)
    if (futureTerms.length === 0) {
      return true
    }
    return futureTerms.every(term => expectedGrades[subject]?.[term])
  })

  const hasPendingFutureTerms = selectedSubjects.some(subject => {
    if (finalGrades[subject]) {
      return false
    }
    return getFutureTermsForSubject(subject).length > 0
  })

  const renderSubjectPanel = () => {
    if (!activeSubject) {
      return (
        <div className="liquid-glass-subject-placeholder">
          <p>Select a subject from the list to start entering grades.</p>
        </div>
      )
    }

    const subject = activeSubject
    const mode = gradeEntryModes[subject] || 'terms'
    const termsForSubject = getTermsForSubject(subject)
    const termsCompleted = getSubjectTermsCompleted(subject)
    const totalTermsRequired = termsForSubject.length || 1
    const progressWidth = totalTermsRequired === 0 ? 0 : (termsCompleted / totalTermsRequired) * 100
    const showSemesterFinal = canCaptureSemesterFinal(subject)
    const subjectFinalGrade = finalGrades[subject]
  const futureTerms = getFutureTermsForSubject(subject)

    return (
      <div className="liquid-glass-subject-details">
        <div className="liquid-glass-subject-header">
          <h3 className="liquid-glass-subject-title">{subject}</h3>
          <div className="liquid-glass-subject-info">
            <span className="liquid-glass-weight-badge">Weight: {SUBJECTS[subject]}</span>
            {subjectFinalGrade && (
              <span className="liquid-glass-final-grade-badge">
                Final: {subjectFinalGrade.grade} ({subjectFinalGrade.points.toFixed(1)} pts)
              </span>
            )}
          </div>
        </div>

        <div className="liquid-glass-mode-toggle">
          <button
            onClick={() => handleGradeEntryModeToggle(subject)}
            className="liquid-glass-toggle-button"
          >
            {mode === 'terms' ? (
              <ToggleLeft className="liquid-glass-toggle-icon" />
            ) : (
              <ToggleRight className="liquid-glass-toggle-icon liquid-glass-toggle-active" />
            )}
            <span className="liquid-glass-toggle-label">
              {getGradeEntryModeLabel(subject)}
            </span>
          </button>
        </div>

        {mode === 'terms' ? (
          <>
            <div className="liquid-glass-terms-grid">
              {termsForSubject.map(term => (
                <div key={term} className="liquid-glass-term-input">
                  <label className="liquid-glass-term-label">{term}</label>
                  <Select
                    value={termGrades[subject]?.[term] || ''}
                    onValueChange={(value) => handleTermGradeChange(subject, term, value)}
                  >
                    <SelectTrigger className="liquid-glass-select">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="liquid-glass-select-content">
                      {GRADE_OPTIONS.map(grade => (
                        <SelectItem key={grade} value={grade} className="liquid-glass-select-item">
                          {grade} ({GRADES[grade]} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="liquid-glass-progress-indicator">
              <span className="liquid-glass-progress-text">
                {termsCompleted}/{totalTermsRequired} {totalTermsRequired === 1 ? 'term' : 'terms'} completed
              </span>
              <div className="liquid-glass-progress-bar">
                <div
                  className="liquid-glass-progress-fill"
                  style={{ width: `${progressWidth}%` }}
                ></div>
              </div>
            </div>
            {showSemesterFinal && calculationMode === 'current' && (
              <div className="liquid-glass-semester-final">
                <div className="liquid-glass-final-grade-input">
                  <label className="liquid-glass-final-grade-label">Final Grade from D2L</label>
                  <Select
                    value={termFinalGrades[subject] || ''}
                    onValueChange={(value) => handleTermFinalGradeChange(subject, value)}
                  >
                    <SelectTrigger className="liquid-glass-select liquid-glass-final-select">
                      <SelectValue placeholder="Enter final grade" />
                    </SelectTrigger>
                    <SelectContent className="liquid-glass-select-content">
                      {GRADE_OPTIONS.map(grade => (
                        <SelectItem key={grade} value={grade} className="liquid-glass-select-item">
                          {grade} ({GRADES[grade]} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="liquid-glass-final-grade-indicator">
                  <span className="liquid-glass-final-grade-status">
                    {termFinalGrades[subject] ? 'Final grade recorded' : 'No final grade recorded yet'}
                  </span>
                </div>
              </div>
            )}
            {calculationMode === 'future' && futureTerms.length > 0 && (
              <div className="liquid-glass-expected-subject">
                <div className="liquid-glass-expected-subject-name">Predict upcoming terms</div>
                <div className="liquid-glass-expected-terms">
                  {futureTerms.map(term => (
                    <div key={term} className="liquid-glass-expected-term">
                      <label className="liquid-glass-expected-label">{term}</label>
                      <Select
                        value={expectedGrades[subject]?.[term] || ''}
                        onValueChange={(value) => handleExpectedGradeChange(subject, term, value)}
                      >
                        <SelectTrigger className="liquid-glass-select liquid-glass-expected-select">
                          <SelectValue placeholder="Choose grade" />
                        </SelectTrigger>
                        <SelectContent className="liquid-glass-select-content">
                          {GRADE_OPTIONS.map(grade => (
                            <SelectItem key={grade} value={grade} className="liquid-glass-select-item">
                              {grade} ({GRADES[grade]} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="liquid-glass-final-grade-entry">
            <div className="liquid-glass-final-grade-input">
              <label className="liquid-glass-final-grade-label">Final Grade from D2L</label>
              <Select
                value={directFinalGrades[subject] || ''}
                onValueChange={(value) => handleDirectFinalGradeChange(subject, value)}
              >
                <SelectTrigger className="liquid-glass-select liquid-glass-final-select">
                  <SelectValue placeholder="Enter final grade" />
                </SelectTrigger>
                <SelectContent className="liquid-glass-select-content">
                  {GRADE_OPTIONS.map(grade => (
                    <SelectItem key={grade} value={grade} className="liquid-glass-select-item">
                      {grade} ({GRADES[grade]} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="liquid-glass-final-grade-indicator">
              <span className="liquid-glass-final-grade-status">
                {directFinalGrades[subject] ? 'Final grade entered' : 'No final grade entered'}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderModeGuide = () => {
    const isFuture = calculationMode === 'future'
    const title = isFuture ? 'How to Use Future GPA Predictions' : 'How to Track Your Current GPA'
    const description = isFuture
      ? 'Estimate where your GPA is heading by projecting grades you expect to earn.'
      : 'Record the grades you have right now to see your current standing.'
    const steps = isFuture
      ? [
          'Choose the term you are in at the top so we know which grades are already locked in.',
          'Enter any completed term grades as usual. For upcoming or unfinished terms, pick expected grades under "Predict upcoming terms".',
          'Watch the Predicted GPA and Target GPA cards to see how tweaks to future grades change your path.'
        ]
      : [
          'Pick the term you are in, then record each subject using term grades or switch to final grade if you already have the D2L result.',
          'Make sure every subject you are taking is selected on the left and that each required term grade is filled in.',
          'Review the Target GPA section to check what grades are still needed to hit each goal, then save to Google Doc if you want a record.'
        ]
    const tip = isFuture
      ? 'Tip: Missing a term grade? Leave it blank and enter an expected grade instead - the predictor will fill the gap.'
      : 'Tip: If a D2L final is available, switch that subject to "Final Grade" to lock in the official score.'

    return (
      <div className="liquid-glass-card liquid-glass-guide-card">
        <div className="liquid-glass-card-header">
          <div className="liquid-glass-card-title">
            <Info className="liquid-glass-card-icon" />
            {title}
          </div>
          <p className="liquid-glass-card-description">{description}</p>
        </div>
        <div className="liquid-glass-card-content">
          <ol className="liquid-glass-guide-list">
            {steps.map((step, idx) => (
              <li key={`${calculationMode}-guide-${idx}`}>{step}</li>
            ))}
          </ol>
          <p className="liquid-glass-guide-tip">{tip}</p>
        </div>
      </div>
    )
  }

  const projectedGPA = calculateProjectedGPA()
  const futureSuggestions = getFutureImprovementSuggestions(projectedGPA)
  const enteredFinalGradeCount = selectedSubjects.filter(subject => finalGrades[subject]).length

  const handleTargetDialogOpenChange = (open) => {
    if (open) {
      setShowTargetGPADialog(true)
      return
    }

    setShowTargetGPADialog(false)
    if (currentStep === 'selection') {
      handleSkipTargetGPA()
    }
  }

  const renderCustomTargetInput = () => (
    <div className="liquid-glass-custom-target">
      <div className="liquid-glass-input-group">
        <label className="liquid-glass-input-label">Add Custom Target GPA:</label>
        <div className="liquid-glass-custom-target-input-wrapper">
          <Input
            type="number"
            min="0"
            max="15"
            step="0.1"
            value={customTargetGPA}
            onChange={(e) => setCustomTargetGPA(e.target.value)}
            placeholder="e.g., 13.8"
            className="liquid-glass-input liquid-glass-custom-target-input"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              const gpaValue = parseFloat(customTargetGPA)

              if (!gpaValue || isNaN(gpaValue)) {
                alert('Please enter a valid number')
                return
              }

              if (gpaValue < MIN_GPA_VALUE || gpaValue > MAX_GPA_VALUE) {
                alert(`Please enter a GPA between ${MIN_GPA_VALUE} and ${MAX_GPA_VALUE}`)
                return
              }

              const exists = targetGPAs.some(target => Math.abs(target - gpaValue) < 0.01)
              if (exists) {
                alert('This target GPA is already in the list!')
                return
              }

              setTargetGPAs([...targetGPAs, gpaValue].sort((a, b) => a - b))
              setCustomTargetGPA('')
            }}
            disabled={!customTargetGPA || customTargetGPA.trim() === ''}
            className="liquid-glass-button liquid-glass-add-target-button"
          >
            Add Target
          </button>
        </div>
      </div>
    </div>
  )

  const targetGPADialog = (
    <Dialog open={showTargetGPADialog} onOpenChange={handleTargetDialogOpenChange}>
      <DialogContent className="liquid-glass-dialog">
        <DialogHeader>
          <DialogTitle className="liquid-glass-dialog-title">
            <Target className="liquid-glass-dialog-icon" />
            Set Your Target GPA
          </DialogTitle>
          <DialogDescription className="liquid-glass-dialog-description">
            What GPA are you aiming for? This will help us show you what grades you need.
          </DialogDescription>
        </DialogHeader>
        <div className="liquid-glass-dialog-content" style={{ padding: '24px 20px' }}>
          <div className="liquid-glass-input-group">
            <label className="liquid-glass-input-label" style={{ marginBottom: '8px', display: 'block' }}>
              Target GPA (0.1 - 15.0):
            </label>
            <Input
              type="number"
              min="0.1"
              max="15"
              step="0.1"
              value={initialTargetGPA}
              onChange={(e) => setInitialTargetGPA(e.target.value)}
              placeholder="e.g., 13.5"
              className="liquid-glass-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTargetGPASubmit()
                }
              }}
            />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'rgba(107, 114, 128, 0.8)', marginTop: '12px' }}>
            You can skip this and add target GPAs later if you prefer.
          </p>
        </div>
        <DialogFooter className="liquid-glass-dialog-footer" style={{ padding: '16px 20px', gap: '12px' }}>
          <Button
            onClick={handleSkipTargetGPA}
            variant="outline"
            className="liquid-glass-dialog-button liquid-glass-dialog-cancel"
          >
            Skip
          </Button>
          <Button
            onClick={handleTargetGPASubmit}
            className="liquid-glass-dialog-button liquid-glass-dialog-save"
          >
            <Target className="liquid-glass-button-icon-left" />
            Set Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (currentStep === 'selection') {
    return (
      <>
        <div className="liquid-glass-app">
          <div className="liquid-glass-background"></div>
          <div className="liquid-glass-container">
            <div className="liquid-glass-header">
              <div className="liquid-glass-icon-wrapper">
                <GraduationCap className="liquid-glass-icon" />
                <Sparkles className="liquid-glass-sparkle" />
              </div>
              <h1 className="liquid-glass-title">GPA Calculator</h1>
              <p className="liquid-glass-subtitle">Choose your electives first, then enter grades and see your GPA update instantly.</p>
              <p className="liquid-glass-subtitle-small">Core subjects are already included for everyone.</p>
              {persistenceWarning ? (
                <p className="liquid-glass-subtitle-small">Heads up: your browser blocked local saving, so progress may not persist after refresh.</p>
              ) : null}
            </div>

            <div className="liquid-glass-card liquid-glass-main-card liquid-glass-elective-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <BookOpen className="liquid-glass-card-icon" />
                  Select Your Electives
                </div>
                <p className="liquid-glass-card-description">
                  Pick up to {MAX_ELECTIVES}. This is the only subject choice you need to make.
                </p>
              </div>
              <div className="liquid-glass-card-content">
                {showElectiveChooser ? (
                  <>
                    <div className="liquid-glass-elective-hero">
                      <div>
                        <div className="liquid-glass-kicker">Step 1 of 2</div>
                        <h2>Choose the electives you actually take.</h2>
                        <p>Your five core subjects are added in the background, so this screen stays focused on the choices you control.</p>
                      </div>
                      <div className="liquid-glass-elective-meter">
                        <span>{selectedElectiveCount}/{MAX_ELECTIVES}</span>
                        <small>electives selected</small>
                      </div>
                    </div>
                    <div className="liquid-glass-subject-section liquid-glass-subject-section-primary">
                      <h3 className="liquid-glass-subject-section-title">Available Electives</h3>
                      <p className="liquid-glass-subject-section-meta">
                        Most electives are weighted at {DEFAULT_ELECTIVE_WEIGHT}; Spanish and Japanese are weighted at {LANGUAGE_ELECTIVE_WEIGHT}.
                      </p>
                      <div className="liquid-glass-subjects-grid">
                        {ELECTIVE_SUBJECTS.map(subject => (
                          <div key={subject} className={`liquid-glass-subject-item${selectedSubjects.includes(subject) ? ' is-selected' : ''}`}>
                            <Checkbox
                              id={subject}
                              checked={selectedSubjects.includes(subject)}
                              onCheckedChange={(checked) => handleSubjectToggle(subject, checked)}
                              disabled={!selectedSubjects.includes(subject) && selectedElectiveCount >= MAX_ELECTIVES}
                              className="liquid-glass-checkbox"
                            />
                            <label htmlFor={subject} className="liquid-glass-subject-label">
                              <div className="liquid-glass-subject-name">{subject}</div>
                              <div className="liquid-glass-subject-weight">Weight: {SUBJECTS[subject]}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="liquid-glass-elective-summary">
                    <div className="liquid-glass-elective-summary-header">
                      <div>
                        <div className="liquid-glass-kicker">Electives selected</div>
                        <h2>{selectedElectiveCount}/{MAX_ELECTIVES} chosen</h2>
                        <p>Core subjects stay included automatically. Use the button to change electives whenever you need to.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowElectiveChooser(true)}
                        className="liquid-glass-auto-term-button"
                      >
                        Choose electives
                      </button>
                    </div>
                    <div className="liquid-glass-badges">
                      {selectedElectives.map(subject => (
                        <div key={subject} className="liquid-glass-badge">{subject}</div>
                      ))}
                    </div>
                    <button onClick={proceedToGradeEntry} className="liquid-glass-button liquid-glass-primary-button">
                      <span>Continue to Grade Entry</span>
                      <Calculator className="liquid-glass-button-icon" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {showElectiveChooser && selectedSubjects.length > 0 && (
              <div className="liquid-glass-card liquid-glass-selected-card">
                <div className="liquid-glass-card-content">
                  <div className="liquid-glass-selected-subjects">
                    <span className="liquid-glass-selected-label">
                      {selectedElectiveCount > 0 ? `${selectedElectiveCount} elective${selectedElectiveCount === 1 ? '' : 's'} selected` : 'No electives selected yet'}
                    </span>
                    <div className="liquid-glass-badges">
                      {selectedElectives.length > 0 ? selectedElectives.map(subject => (
                        <div key={subject} className="liquid-glass-badge">{subject}</div>
                      )) : (
                        <div className="liquid-glass-badge liquid-glass-badge-muted">Core subjects included automatically</div>
                      )}
                    </div>
                  </div>
                  <button onClick={proceedToGradeEntry} className="liquid-glass-button liquid-glass-primary-button">
                    <span>Continue to Grade Entry</span>
                    <Calculator className="liquid-glass-button-icon" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {targetGPADialog}
      </>
    )
  }

  return (
    <div className="liquid-glass-app">
      <div className="liquid-glass-background"></div>
      <div className="liquid-glass-container liquid-glass-grade-container">
        <div className="liquid-glass-header">
          <div className="liquid-glass-icon-wrapper">
            <GraduationCap className="liquid-glass-icon" />
            <Sparkles className="liquid-glass-sparkle" />
          </div>
          <h1 className="liquid-glass-title">GPA Calculator</h1>
          <p className="liquid-glass-subtitle-small">Enter grades by subject. Results update as you go.</p>
          <div className="liquid-glass-mode-switch">
            <button
              type="button"
              onClick={() => setCalculationMode('current')}
              className={`liquid-glass-mode-button${calculationMode === 'current' ? ' is-active' : ''}`}
            >
              Calculate Current GPA
            </button>
            <button
              type="button"
              onClick={() => setCalculationMode('future')}
              className={`liquid-glass-mode-button${calculationMode === 'future' ? ' is-active' : ''}`}
            >
              Predict Future GPA
            </button>
          </div>
          <div className="liquid-glass-mode-explainer">
            {calculationMode === 'current' ? (
              <>
                <strong>Current GPA</strong> uses grades you already have. It answers: "Where am I sitting right now?"
              </>
            ) : (
              <>
                <strong>Future GPA</strong> adds your expected grades for unfinished terms. It answers: "What happens if I keep going like this?"
              </>
            )}
          </div>
          <button onClick={() => setCurrentStep('selection')} className="liquid-glass-button liquid-glass-secondary-button">
            Edit Subjects
          </button>
        </div>

        <div className="liquid-glass-grade-layout">
          <aside className="liquid-glass-elective-rail">
            <div className="liquid-glass-card liquid-glass-rail-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <BookOpen className="liquid-glass-card-icon" />
                  Subjects
                </div>
                <p className="liquid-glass-card-description">
                  {selectedElectiveCount}/{MAX_ELECTIVES} electives selected
                </p>
              </div>
              <div className="liquid-glass-card-content">
                <div className="liquid-glass-rail-section">
                  <div className="liquid-glass-rail-section-title">Electives</div>
                  <div className="liquid-glass-badges">
                    {selectedElectives.length > 0 ? selectedElectives.map(subject => (
                      <div key={subject} className="liquid-glass-badge">{subject}</div>
                    )) : (
                      <div className="liquid-glass-badge liquid-glass-badge-muted">Core only</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowElectiveChooser(true)
                      setCurrentStep('selection')
                    }}
                    className="liquid-glass-button liquid-glass-secondary-button liquid-glass-rail-button"
                  >
                    Choose electives
                  </button>
                </div>

                <div className="liquid-glass-rail-section">
                  <div className="liquid-glass-rail-section-title">Grade entry</div>
                  <div className="liquid-glass-subject-nav">
                    {selectedSubjects.map(subject => (
                      <button
                        type="button"
                        key={subject}
                        onClick={() => setActiveSubject(subject)}
                        className={`liquid-glass-subject-nav-button${activeSubject === subject ? ' is-active' : ''}`}
                      >
                        <span className="liquid-glass-subject-nav-name">{subject}</span>
                        <span className="liquid-glass-subject-nav-weight">Weight {SUBJECTS[subject]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Grade Entry Section */}
          <div className="liquid-glass-grade-entry">
            {renderModeGuide()}
            <div className="liquid-glass-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <Calendar className="liquid-glass-card-icon" />
                  Enter Grades
                </div>
                <p className="liquid-glass-card-description">
                  Choose between term-based calculation or direct final grade entry for each subject
                </p>
                <div className="liquid-glass-grade-context">
                  <div className="liquid-glass-term-selector-label-group">
                    <span className="liquid-glass-term-selector-label">Grade period</span>
                    <span className="liquid-glass-term-selector-description">
                      {termSelectionMode === 'manual'
                        ? `Manually set. Auto-detected term is ${detectedTerm}.`
                        : `Auto-detected from ${detectedTermInfo.source}.`}
                    </span>
                  </div>
                  <div className="liquid-glass-term-controls">
                    <Select value={currentTerm} onValueChange={handleCurrentTermChange}>
                      <SelectTrigger className="liquid-glass-select liquid-glass-term-select">
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent className="liquid-glass-select-content">
                        {TERMS.map(term => (
                          <SelectItem key={term} value={term} className="liquid-glass-select-item">
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {termSelectionMode === 'manual' ? (
                      <button
                        type="button"
                        onClick={handleUseDetectedTerm}
                        className="liquid-glass-auto-term-button"
                      >
                        Use auto
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="liquid-glass-card-content">

                {/* Global Mode Toggle */}
                {selectedSubjects.length > 0 && (
                  <div className="liquid-glass-global-toggle">
                    <button
                      onClick={handleGlobalModeToggle}
                      className="liquid-glass-global-toggle-button"
                    >
                      {getGlobalModeStatus() === 'final' ? (
                        <ToggleRight className="liquid-glass-toggle-icon liquid-glass-toggle-active" />
                      ) : (
                        <ToggleLeft className="liquid-glass-toggle-icon" />
                      )}
                      <span className="liquid-glass-toggle-label">
                        {getGlobalModeStatus() === 'final' 
                          ? 'Switch All to Term Grades' 
                          : getGlobalModeStatus() === 'terms'
                          ? 'Switch All to Final Grades (D2L)'
                          : 'Switch All to Final Grades (D2L)'}
                      </span>
                    </button>
                    <p className="liquid-glass-global-toggle-description">
                      {getGlobalModeStatus() === 'final' 
                        ? 'All subjects are using final grade entry'
                        : getGlobalModeStatus() === 'terms'
                        ? 'All subjects are using term-based calculation'
                        : 'Mixed modes - some subjects use terms, others use final grades'}
                    </p>
                  </div>
                )}
                
                {selectedSubjects.length > 0 ? (
                  <div className="liquid-glass-grade-entry-columns">
                    <div className="liquid-glass-subject-panel">
                      {renderSubjectPanel()}
                    </div>
                  </div>
                ) : (
                  <div className="liquid-glass-subject-placeholder">
                    <p>Select at least one subject to begin entering grades.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="liquid-glass-results">
            {calculationMode === 'current' ? (
              <>
                <div className="liquid-glass-card liquid-glass-gpa-card">
                  <div className="liquid-glass-card-header">
                    <div className="liquid-glass-card-title">
                      <Calculator className="liquid-glass-card-icon" />
                      Current GPA
                    </div>
                  </div>
                  <div className="liquid-glass-card-content">
                    <div className="liquid-glass-gpa-display">
                      <div className="liquid-glass-gpa-number">
                        {gpa !== null && gpa > 0 ? gpa.toFixed(2) : '--'}
                      </div>
                      <div className="liquid-glass-gpa-max">out of 15.00</div>
                      <div className="liquid-glass-gpa-note">
                        {enteredFinalGradeCount} of {selectedSubjects.length} subjects counted
                      </div>
                    </div>
                  </div>
                </div>

                {(gpa && gpa > 0 && enteredFinalGradeCount > 0) ? (
                  <div className="liquid-glass-card liquid-glass-save-card">
                    <div className="liquid-glass-card-content">
                      <div>
                        <div className="liquid-glass-save-card-title">Save this GPA snapshot</div>
                        <p className="liquid-glass-save-card-copy">
                          Saves this result to Google Docs with your name, year, term, GPA, and subjects.
                        </p>
                        {saveStatusMessage ? (
                          <p className="liquid-glass-save-status">{saveStatusMessage}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => {
                          setSaveErrorMessage('')
                          setShowSaveDialog(true)
                        }}
                        className="liquid-glass-button liquid-glass-save-button"
                      >
                        <Save className="liquid-glass-button-icon-left" />
                        <span>Save GPA</span>
                        <FileText className="liquid-glass-button-icon" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="liquid-glass-card liquid-glass-requirements-card">
                  <div className="liquid-glass-card-header">
                    <div className="liquid-glass-card-title">
                      <Target className="liquid-glass-card-icon" />
                      Grade Requirements
                    </div>
                    <p className="liquid-glass-card-description">
                      What final grades you need for target GPAs
                    </p>
                  </div>
                  <div className="liquid-glass-card-content">
                    {renderCustomTargetInput()}

                    <div className="liquid-glass-requirements">
                      {targetGPAs.map(targetGPA => {
                        const requirements = calculateRequiredGrades(targetGPA)
                        const hasUnenteredGrades = Object.keys(requirements.grades).length > 0
                        const improvements = suggestImprovements(targetGPA)

                        return (
                          <div key={targetGPA} className="liquid-glass-requirement-item">
                            <div className="liquid-glass-requirement-header">
                              <h4 className="liquid-glass-requirement-title">Target GPA: {targetGPA}</h4>
                              <div className="liquid-glass-requirement-header-actions">
                                <div className={`liquid-glass-requirement-badge ${requirements.possible ? 'liquid-glass-badge-success' : 'liquid-glass-badge-error'}`}>
                                  {requirements.possible ? 'Achievable' : 'Not Possible'}
                                </div>
                                {!([13.5, 14.0, 14.5].includes(targetGPA)) && (
                                  <button
                                    onClick={() => setTargetGPAs(targetGPAs.filter(gpa => gpa !== targetGPA))}
                                    className="liquid-glass-remove-target-button"
                                    title="Remove this target"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>

                            {requirements.possible && hasUnenteredGrades && (
                              <div className="liquid-glass-requirement-details">
                                <p className="liquid-glass-requirement-label">Required final grades:</p>
                                <div className="liquid-glass-requirement-grades">
                                  {Object.entries(requirements.grades).map(([subject, requiredGrade]) => (
                                    <div key={subject} className="liquid-glass-requirement-grade">
                                      <span className="liquid-glass-requirement-subject">{subject}:</span>
                                      <div className="liquid-glass-requirement-grade-badge">{requiredGrade}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {requirements.possible && !hasUnenteredGrades && gpa && gpa < targetGPA && improvements.possible && (
                              <div className="liquid-glass-requirement-details">
                                <p className="liquid-glass-requirement-label">Suggested improvements to reach target:</p>
                                <div className="liquid-glass-requirement-grades">
                                  {improvements.suggestions.map((suggestion, idx) => (
                                    <div key={idx} className="liquid-glass-requirement-grade">
                                      <span className="liquid-glass-requirement-subject">{suggestion.subject}:</span>
                                      <div className="liquid-glass-improvement-badge">
                                        {`${suggestion.from} -> ${suggestion.to} (+${suggestion.impact} GPA)`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {requirements.possible && !hasUnenteredGrades && (
                              <p className="liquid-glass-requirement-message liquid-glass-success-message">
                                {gpa >= targetGPA ? 'Already achieved' : 'All grades entered'}
                              </p>
                            )}

                            {!requirements.possible && (
                              <p className="liquid-glass-requirement-message liquid-glass-error-message">
                                Target GPA not achievable with remaining subjects
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="liquid-glass-card liquid-glass-gpa-card">
                  <div className="liquid-glass-card-header">
                    <div className="liquid-glass-card-title">
                      <Sparkles className="liquid-glass-card-icon" />
                      Predicted GPA
                    </div>
                  </div>
                  <div className="liquid-glass-card-content">
                    <div className="liquid-glass-gpa-display">
                      <div className="liquid-glass-gpa-number">
                        {projectedGPA && projectedGPA > 0 ? projectedGPA.toFixed(2) : '--'}
                      </div>
                      <div className="liquid-glass-gpa-max">based on your expected grades</div>
                      <div className="liquid-glass-gpa-note">
                        {enteredFinalGradeCount} of {selectedSubjects.length} subjects locked in
                      </div>
                    </div>
                  </div>
                </div>

                <div className="liquid-glass-card liquid-glass-future-card">
                  <div className="liquid-glass-card-header">
                    <div className="liquid-glass-card-title">
                      <Target className="liquid-glass-card-icon" />
                      Where to Improve
                    </div>
                    <p className="liquid-glass-card-description">
                      Biggest GPA gains from your expected grades
                    </p>
                  </div>
                  <div className="liquid-glass-card-content">
                    {futureSuggestions.possible ? (
                      <div className="liquid-glass-future-suggestion-list">
                        {futureSuggestions.suggestions.map((suggestion, idx) => (
                          <div key={`${suggestion.subject}-${suggestion.term}-${idx}`} className="liquid-glass-future-suggestion">
                            <div className="liquid-glass-future-suggestion-header">
                              <span className="liquid-glass-future-subject">{suggestion.subject}</span>
                              <span className="liquid-glass-future-term">{suggestion.term}</span>
                            </div>
                            <div className="liquid-glass-future-suggestion-body">
                              <span className="liquid-glass-future-grade">{`${suggestion.from} -> ${suggestion.to}`}</span>
                              <span className="liquid-glass-future-impact">+{suggestion.impact} GPA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="liquid-glass-muted-text">
                        Add expected grades for any unfinished terms to unlock personalized improvement ideas.
                      </p>
                    )}
                  </div>
                </div>

                <div className="liquid-glass-card liquid-glass-requirements-card">
                  <div className="liquid-glass-card-header">
                    <div className="liquid-glass-card-title">
                      <Trophy className="liquid-glass-card-icon" />
                      Target GPA Check
                    </div>
                    <p className="liquid-glass-card-description">
                      See how your predicted GPA compares to each goal and adjust expectations accordingly
                    </p>
                  </div>
                  <div className="liquid-glass-card-content">
                    {renderCustomTargetInput()}

                    <div className="liquid-glass-requirements">
                      {targetGPAs.map(targetGPA => {
                        const hasProjection = projectedGPA !== null && projectedGPA > 0
                        const onTrack = hasProjection && projectedGPA >= targetGPA
                        const needsMoreData = hasPendingFutureTerms && !hasAnyExpectedFutureGrades
                        const incompleteData = hasPendingFutureTerms && hasAnyExpectedFutureGrades && !hasCompleteExpectedFutureGrades
                        const badgeClass = !hasProjection
                          ? 'liquid-glass-badge-warning'
                          : onTrack
                          ? 'liquid-glass-badge-success'
                          : needsMoreData || incompleteData
                          ? 'liquid-glass-badge-warning'
                          : 'liquid-glass-badge-error'
                        const badgeLabel = !hasProjection
                          ? 'Need Data'
                          : onTrack
                          ? 'On Track'
                          : needsMoreData || incompleteData
                          ? 'Need Data'
                          : 'Needs Adjustment'
                        const shortfall = hasProjection && projectedGPA < targetGPA
                          ? targetGPA - projectedGPA
                          : 0

                        let statusMessage = ''
                        if (!hasProjection) {
                          if (needsMoreData) {
                            statusMessage = 'Add expected grades for the remaining terms to generate a prediction for this target.'
                          } else if (incompleteData) {
                            statusMessage = 'Finish entering expected grades for all remaining terms to sharpen this projection.'
                          } else if (!hasPendingFutureTerms) {
                            statusMessage = 'Enter grades or expectations to start projecting against this goal.'
                          } else {
                            statusMessage = 'Add a bit more data to start projecting against this target.'
                          }
                        } else if (onTrack) {
                          statusMessage = `Projected GPA of ${projectedGPA.toFixed(2)} already meets this target.`
                        } else {
                          statusMessage = `Projected GPA is ${projectedGPA.toFixed(2)}, about ${shortfall.toFixed(2)} below this target.`
                          if (incompleteData) {
                            statusMessage += ' Completing the remaining expected grades will improve accuracy.'
                          }
                        }

                        const showSuggestions = !onTrack && futureSuggestions.possible

                        return (
                          <div key={`future-target-${targetGPA}`} className="liquid-glass-requirement-item">
                            <div className="liquid-glass-requirement-header">
                              <h4 className="liquid-glass-requirement-title">Target GPA: {targetGPA}</h4>
                              <div className="liquid-glass-requirement-header-actions">
                                <div className={`liquid-glass-requirement-badge ${badgeClass}`}>
                                  {badgeLabel}
                                </div>
                                {!([13.5, 14.0, 14.5].includes(targetGPA)) && (
                                  <button
                                    type="button"
                                    className="liquid-glass-remove-target-button"
                                    onClick={() => setTargetGPAs(targetGPAs.filter(target => target !== targetGPA))}
                                  >
                                    -
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className={`liquid-glass-requirement-message ${onTrack ? 'liquid-glass-success-message' : needsMoreData || !hasProjection ? 'liquid-glass-warning-message' : 'liquid-glass-error-message'}`}>
                              {statusMessage}
                            </p>

                            {showSuggestions && (
                              <div className="liquid-glass-requirement-details">
                                <p className="liquid-glass-requirement-label">Try adjusting these expectations:</p>
                                <div className="liquid-glass-requirement-grades">
                                  {futureSuggestions.suggestions.map((suggestion, idx) => (
                                    <div key={`${suggestion.subject}-${suggestion.term}-${idx}`} className="liquid-glass-requirement-grade">
                                      <span className="liquid-glass-requirement-subject">{suggestion.subject} - {suggestion.term}</span>
                                      <div className="liquid-glass-improvement-badge">
                                        {`${suggestion.from} -> ${suggestion.to} (+${suggestion.impact} GPA)`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {targetGPADialog}

        {/* Save to Google Doc Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={handleSaveDialogOpenChange}>
          <DialogContent className="liquid-glass-dialog">
            <DialogHeader>
              <DialogTitle className="liquid-glass-dialog-title">
                <Save className="liquid-glass-dialog-icon" />
                Save GPA
              </DialogTitle>
              <DialogDescription className="liquid-glass-dialog-description">
                Save this GPA snapshot to Google Docs with your name and year level.
              </DialogDescription>
            </DialogHeader>
            <div className="liquid-glass-dialog-content">
              <div className="liquid-glass-input-group">
                <label className="liquid-glass-input-label">Your Name</label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your name..."
                  className="liquid-glass-input"
                />
              </div>
              <div className="liquid-glass-input-group">
                <label className="liquid-glass-input-label">Year Level</label>
                <Select value={studentYearLevel} onValueChange={setStudentYearLevel}>
                  <SelectTrigger className="liquid-glass-select">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass-select-content">
                    {['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'].map(year => (
                      <SelectItem key={year} value={year} className="liquid-glass-select-item">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="liquid-glass-gpa-summary">
                <p className="liquid-glass-summary-text">
                  <span>{studentYearLevel}</span>
                  <span>{currentTerm}</span>
                  <strong>{gpa?.toFixed(2) || '--'} GPA</strong>
                </p>
                <p className="liquid-glass-summary-subtext">
                  {enteredFinalGradeCount} of {selectedSubjects.length} subjects counted in this save.
                </p>
              </div>
              {saveErrorMessage ? (
                <div className="liquid-glass-save-error" role="alert">
                  {saveErrorMessage}
                </div>
              ) : null}
            </div>
            <DialogFooter className="liquid-glass-dialog-footer">
              <Button
                onClick={handleSaveDialogClose}
                variant="outline"
                className="liquid-glass-dialog-button liquid-glass-dialog-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={saveSnapshotToGoogleDoc}
                disabled={isSaving || !studentName.trim()}
                className="liquid-glass-dialog-button liquid-glass-dialog-save"
              >
                {isSaving ? (
                  <>
                    <div className="liquid-glass-spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="liquid-glass-button-icon-left" />
                    Save GPA
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App
