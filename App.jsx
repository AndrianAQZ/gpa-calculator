import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Calculator, GraduationCap, BookOpen, Target, Sparkles, Calendar, Save, FileText, Trophy, AlertTriangle, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Palette } from 'lucide-react'
import './App.css'

const SUBJECTS = {
  'Visual Art': 0.3,
  'Media': 0.3,
  'Drama': 0.3,
  'Music': 0.3,
  'Spanish': 0.3,
  'Japanese': 0.3,
  'HPE': 0.6,
  'Digital': 0.3,
  'Design': 0.3,
  'Math': 1.0,
  'Science': 1.0,
  'English': 1.0,
  'Humanities': 1.0
}

const GRADES = {
  'A+': 15, 'A': 14, 'A-': 13,
  'B+': 12, 'B': 11, 'B-': 10,
  'C+': 9, 'C': 8, 'C-': 7,
  'D+': 6, 'D': 5, 'D-': 4,
  'F+': 3, 'F': 2, 'F-': 1
}

const GRADE_OPTIONS = Object.keys(GRADES)
const MAX_SUBJECTS = 8
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const FINAL_TERMS = new Set(['Term 2', 'Term 4'])
const SEMESTER_SUBJECTS = new Set([
  'Visual Art',
  'Media',
  'Drama',
  'Music',
  'Spanish',
  'Japanese',
  'HPE',
  'Digital',
  'Design'
])
const GOOGLE_DOC_ID = '1ICuIvuBC-uTpdKCgQWYNKqAfPfnOzOQPIyLYMoXhqvo'
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
const LOCAL_SAVE_KEY = 'gpaCalculatorSavedRecords'
const THEME_STORAGE_KEY = 'gpaCalculatorTheme'
const DEFAULT_THEME = {
  primary: '#2563eb',
  primaryStrong: '#1746a2',
  background: '#f3f6fb',
  surface: '#ffffff',
  text: '#172033',
  accent: '#0f6f43'
}
const THEME_PRESETS = {
  Focus: DEFAULT_THEME,
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

function App() {
  const [currentStep, setCurrentStep] = useState('selection')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [currentTerm, setCurrentTerm] = useState(TERMS[0])
  const [gradeEntryModes, setGradeEntryModes] = useState({}) // { subject: 'terms' | 'final' }
  const [termGrades, setTermGrades] = useState({}) // { subject: { 'Term 1': 'A', 'Term 2': 'B+', ... } }
  const [directFinalGrades, setDirectFinalGrades] = useState({}) // { subject: 'A+' }
  const [termFinalGrades, setTermFinalGrades] = useState({}) // { subject: 'A+' }
  const [finalGrades, setFinalGrades] = useState({}) // Calculated final grades for each subject
  const [gpa, setGpa] = useState(null)
  const [yearlyGPA, setYearlyGPA] = useState(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveAttempts, setSaveAttempts] = useState(0)
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0)
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      return savedTheme ? { ...DEFAULT_THEME, ...JSON.parse(savedTheme) } : DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

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
    '--primary-soft': `${theme.primary}22`,
    '--success': theme.accent,
    '--success-soft': `${theme.accent}22`
  }

  const handleSubjectToggle = (subject, checked) => {
    if (checked) {
      if (selectedSubjects.length < MAX_SUBJECTS) {
        setSelectedSubjects([...selectedSubjects, subject])
        setActiveSubjectIndex(selectedSubjects.length)
        // Default to terms mode for new subjects
        setGradeEntryModes(prev => ({ ...prev, [subject]: 'terms' }))
      } else {
        alert(`You can select a maximum of ${MAX_SUBJECTS} subjects.`)
      }
    } else {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
      setActiveSubjectIndex(index => Math.max(0, Math.min(index, selectedSubjects.length - 2)))
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
    }
  }

  const handleGradeEntryModeToggle = (subject) => {
    const currentMode = gradeEntryModes[subject] || 'terms'
    const newMode = currentMode === 'terms' ? 'final' : 'terms'
    
    setGradeEntryModes(prev => ({
      ...prev,
      [subject]: newMode
    }))

    // Clear existing grades when switching modes
    if (newMode === 'final') {
      const newTermGrades = { ...termGrades }
      delete newTermGrades[subject]
      setTermGrades(newTermGrades)
      const newTermFinalGrades = { ...termFinalGrades }
      delete newTermFinalGrades[subject]
      setTermFinalGrades(newTermFinalGrades)
    } else {
      const newDirectFinalGrades = { ...directFinalGrades }
      delete newDirectFinalGrades[subject]
      setDirectFinalGrades(newDirectFinalGrades)
    }
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
    
    // Clear all grades when switching modes globally
    if (newMode === 'final') {
      setTermGrades({})
      setTermFinalGrades({})
    } else {
      setDirectFinalGrades({})
      setTermFinalGrades({})
    }
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

  const getTermsForSubject = (subject) => {
    const currentTermIndex = TERMS.indexOf(currentTerm)
    if (currentTermIndex === -1) return TERMS

    if (isSemesterSubject(subject)) {
      if (currentTerm === 'Term 1') return ['Term 1']
      if (currentTerm === 'Term 2') return ['Term 1', 'Term 2']
      if (currentTerm === 'Term 3') return ['Term 3']
      return ['Term 3', 'Term 4']
    }

    return TERMS.slice(0, currentTermIndex + 1)
  }

  const canCaptureSemesterFinal = (subject) => isSemesterSubject(subject) && FINAL_TERMS.has(currentTerm)

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

  const handleThemeChange = (key, value) => {
    setTheme(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const applyThemePreset = (presetName) => {
    setTheme(THEME_PRESETS[presetName] || DEFAULT_THEME)
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
      let closestGrade = 'F-'
      let closestDiff = Math.abs(GRADES['F-'] - averagePoints)
      
      Object.entries(GRADES).forEach(([grade, value]) => {
        const diff = Math.abs(value - averagePoints)
        if (diff < closestDiff) {
          closestGrade = grade
          closestDiff = diff
        }
      })

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

    const targetTotalScore = targetGPA * 5.8;
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

  const saveToGoogleDoc = async () => {
    if (!studentName.trim()) {
      alert('Please enter your name before saving!')
      return
    }

    setIsSaving(true)
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
        currentTerm,
        gpa: gpa !== null ? Number(gpa.toFixed(2)) : null,
        yearlyGpa: yearlyGPA !== null ? Number(yearlyGPA.toFixed(2)) : null,
        subjects: subjectSummaries,
        timestamp: new Date().toISOString(),
        googleDocId: GOOGLE_DOC_ID
      }

      const existingRecords = JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY) || '[]')
      localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify([payload, ...existingRecords].slice(0, 25)))

      if (!GOOGLE_APPS_SCRIPT_URL) {
        alert(`Saved ${studentName.trim()}'s GPA (${yearlyGPA?.toFixed(2)}) on this device. Google Doc sync is not configured yet.`)
        setShowSaveDialog(false)
        setStudentName('')
        setSaveAttempts(0)
        return
      }

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      let serverMessage = `Successfully saved ${studentName}'s GPA (${yearlyGPA?.toFixed(2)}) to Google Doc!`
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const result = await response.json()
        if (result?.message) {
          serverMessage = result.message
        }
        if (result?.docUrl) {
          window.open(result.docUrl, '_blank', 'noopener')
        }
      } else {
        const textResult = await response.text()
        if (textResult) {
          serverMessage = textResult
        }
      }

      alert(serverMessage)
      setShowSaveDialog(false)
      setStudentName('')
      setSaveAttempts(0)
    } catch (error) {
      console.error('Failed to save GPA to Google Doc:', error)
      alert(`Failed to save to Google Doc. ${error.message ?? ''}`.trim())
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDialogClose = () => {
    setSaveAttempts(prev => prev + 1)
    setShowSaveDialog(false)
  }

  const getPassiveAggressiveMessage = () => {
    switch (saveAttempts) {
      case 0:
        return "Save your GPA to Google Doc? It would be a shame if all this hard work just... disappeared."
      case 1:
        return "Are you sure you don't want to save? Your future self might thank you for keeping records..."
      case 2:
        return "Really? Still not saving? I mean, it's only your academic progress we're talking about here."
      case 3:
        return "Fine, I guess some people just like living dangerously without backups. Your choice! 🤷‍♂️"
      default:
        return "Okay, I'll stop asking. But don't come crying to me when you need these numbers later!"
    }
  }

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

  // Show save dialog when GPA is calculated and all subjects have grades
  useEffect(() => {
    if (yearlyGPA && yearlyGPA > 0 && selectedSubjects.length > 0) {
      const allSubjectsHaveGrades = selectedSubjects.every(subject => finalGrades[subject])
      if (allSubjectsHaveGrades && saveAttempts < 5) {
        setTimeout(() => setShowSaveDialog(true), 1000)
      }
    }
  }, [yearlyGPA, finalGrades, selectedSubjects, saveAttempts])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    setActiveSubjectIndex(index => Math.max(0, Math.min(index, selectedSubjects.length - 1)))
  }, [selectedSubjects])

  const proceedToGradeEntry = () => {
    if (selectedSubjects.length > 0) {
      setCurrentStep('gradeEntry')
    }
  }

  const resetCalculator = () => {
    setCurrentStep('selection')
    setSelectedSubjects([])
    setCurrentTerm(TERMS[0])
    setGradeEntryModes({})
    setTermGrades({})
    setDirectFinalGrades({})
    setTermFinalGrades({})
    setFinalGrades({})
    setGpa(null)
    setYearlyGPA(null)
    setSaveAttempts(0)
    setActiveSubjectIndex(0)
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

  const activeSubject = selectedSubjects[activeSubjectIndex] || selectedSubjects[0]
  const activeSubjectNumber = selectedSubjects.length === 0 ? 0 : activeSubjectIndex + 1
  const goToNextSubject = () => {
    setActiveSubjectIndex(index => Math.min(index + 1, selectedSubjects.length - 1))
  }
  const goToPreviousSubject = () => {
    setActiveSubjectIndex(index => Math.max(index - 1, 0))
  }

  if (currentStep === 'selection') {
    return (
      <div className="liquid-glass-app" style={appThemeStyle}>
        <div className="liquid-glass-background"></div>
        <div className="liquid-glass-container">
          <div className="liquid-glass-header">
            <div className="liquid-glass-icon-wrapper">
              <GraduationCap className="liquid-glass-icon" />
              <Sparkles className="liquid-glass-sparkle" />
            </div>
            <h1 className="liquid-glass-title">GPA Calculator</h1>
            <p className="liquid-glass-subtitle">Select the subjects you're currently taking (Max: {MAX_SUBJECTS})</p>
            <p className="liquid-glass-subtitle-small">Choose between term-based calculation or direct final grade entry for each subject</p>
          </div>

          <div className="liquid-glass-card liquid-glass-main-card">
            <div className="liquid-glass-card-header">
              <div className="liquid-glass-card-title">
                <BookOpen className="liquid-glass-card-icon" />
                Choose Your Subjects
              </div>
              <p className="liquid-glass-card-description">
                Select all the subjects you're enrolled in this semester
              </p>
            </div>
            <div className="liquid-glass-card-content">
              <div className="liquid-glass-subjects-grid">
                {Object.entries(SUBJECTS).map(([subject, weight]) => (
                  <div key={subject} className="liquid-glass-subject-item">
                    <Checkbox
                      id={subject}
                      checked={selectedSubjects.includes(subject)}
                      onCheckedChange={(checked) => handleSubjectToggle(subject, checked)}
                      disabled={!selectedSubjects.includes(subject) && selectedSubjects.length >= MAX_SUBJECTS}
                      className="liquid-glass-checkbox"
                    />
                    <label htmlFor={subject} className="liquid-glass-subject-label">
                      <div className="liquid-glass-subject-name">{subject}</div>
                      <div className="liquid-glass-subject-weight">Weight: {weight}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedSubjects.length > 0 && (
            <div className="liquid-glass-card liquid-glass-selected-card">
              <div className="liquid-glass-card-content">
                <div className="liquid-glass-selected-subjects">
                  <span className="liquid-glass-selected-label">Selected subjects:</span>
                  <div className="liquid-glass-badges">
                    {selectedSubjects.map(subject => (
                      <div key={subject} className="liquid-glass-badge">{subject}</div>
                    ))}
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
    )
  }

  return (
    <div className="liquid-glass-app" style={appThemeStyle}>
      <div className="liquid-glass-background"></div>
      <div className="liquid-glass-container liquid-glass-grade-container">
        <div className="liquid-glass-header">
          <div className="liquid-glass-icon-wrapper">
            <GraduationCap className="liquid-glass-icon" />
            <Sparkles className="liquid-glass-sparkle" />
          </div>
          <h1 className="liquid-glass-title">GPA Calculator</h1>
          <p className="liquid-glass-subtitle-small">Enter your grades using terms or final grades from D2L</p>
          <button onClick={resetCalculator} className="liquid-glass-button liquid-glass-secondary-button">
            Change Subjects
          </button>
        </div>

        <div className="liquid-glass-grade-layout">
          {/* Grade Entry Section */}
          <div className="liquid-glass-grade-entry">
            <div className="liquid-glass-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <Calendar className="liquid-glass-card-icon" />
                  Enter Grades
                </div>
                <p className="liquid-glass-card-description">
                  Use the term selector to preview what grade the calculator thinks you will get at different points in the year.
                </p>
              </div>
              <div className="liquid-glass-card-content">
                <div className="liquid-glass-term-selector">
                  <div className="liquid-glass-term-selector-label-group">
                    <span className="liquid-glass-term-selector-label">Preview Term</span>
                    <span className="liquid-glass-term-selector-description">
                      Change this manually to see the predicted grade for any term.
                    </span>
                  </div>
                  <Select value={currentTerm} onValueChange={setCurrentTerm}>
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
                </div>

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
                
                <div className="liquid-glass-stepper-bar">
                  <button
                    onClick={goToPreviousSubject}
                    disabled={activeSubjectIndex === 0}
                    className="liquid-glass-step-button"
                  >
                    <ChevronLeft className="liquid-glass-button-icon-left" />
                    Previous
                  </button>
                  <div className="liquid-glass-step-status">
                    Subject {activeSubjectNumber} of {selectedSubjects.length}
                  </div>
                  <button
                    onClick={goToNextSubject}
                    disabled={activeSubjectIndex >= selectedSubjects.length - 1}
                    className="liquid-glass-step-button liquid-glass-next-button"
                  >
                    Next
                    <ChevronRight className="liquid-glass-button-icon" />
                  </button>
                </div>

                <div className="liquid-glass-subject-tabs">
                  {selectedSubjects.map((subject, index) => (
                    <button
                      key={subject}
                      onClick={() => setActiveSubjectIndex(index)}
                      className={`liquid-glass-subject-tab ${index === activeSubjectIndex ? 'liquid-glass-subject-tab-active' : ''}`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
                
                <div className="liquid-glass-subjects-terms">
                  {activeSubject && [activeSubject].map(subject => {
                    const mode = gradeEntryModes[subject] || 'terms'
                    const termsForSubject = getTermsForSubject(subject)
                    const termsCompleted = getSubjectTermsCompleted(subject)
                    const totalTermsRequired = termsForSubject.length || 1
                    const progressWidth = totalTermsRequired === 0 ? 0 : (termsCompleted / totalTermsRequired) * 100
                    const showSemesterFinal = canCaptureSemesterFinal(subject)
                    return (
                      <div key={subject} className="liquid-glass-subject-terms-group">
                        <div className="liquid-glass-subject-header">
                          <h3 className="liquid-glass-subject-title">{subject}</h3>
                          <div className="liquid-glass-subject-info">
                            <span className="liquid-glass-weight-badge">Weight: {SUBJECTS[subject]}</span>
                            {finalGrades[subject] && (
                              <span className="liquid-glass-final-grade-badge">
                                Final: {finalGrades[subject].grade} ({finalGrades[subject].points.toFixed(1)} pts)
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Grade Entry Mode Toggle */}
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
                          // Term-based grade entry
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
                            {showSemesterFinal && (
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
                          </>
                        ) : (
                          // Direct final grade entry
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
                        <div className="liquid-glass-subject-next-row">
                          <button
                            onClick={goToNextSubject}
                            disabled={activeSubjectIndex >= selectedSubjects.length - 1}
                            className="liquid-glass-button liquid-glass-primary-button"
                          >
                            <span>{activeSubjectIndex >= selectedSubjects.length - 1 ? 'All Subjects Entered' : 'Next Subject'}</span>
                            <ChevronRight className="liquid-glass-button-icon" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="liquid-glass-results">
            {/* Current GPA */}
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
                    {gpa !== null ? gpa.toFixed(2) : '--'}
                  </div>
                  <div className="liquid-glass-gpa-max">out of 15.00</div>
                </div>
              </div>
            </div>

            {/* Save to Google Doc Button */}
            {gpa && gpa > 0 && (
              <div className="liquid-glass-card">
                <div className="liquid-glass-card-content">
                  <button 
                    onClick={() => setShowSaveDialog(true)}
                    className="liquid-glass-button liquid-glass-save-button"
                  >
                    <Save className="liquid-glass-button-icon-left" />
                    <span>Save to Google Doc</span>
                    <FileText className="liquid-glass-button-icon" />
                  </button>
                </div>
              </div>
            )}

            <div className="liquid-glass-card liquid-glass-summary-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <Trophy className="liquid-glass-card-icon" />
                  Grade Summary
                </div>
                <p className="liquid-glass-card-description">
                  Quick check of every subject grade.
                </p>
              </div>
              <div className="liquid-glass-card-content">
                <div className="liquid-glass-grade-summary-list">
                  {selectedSubjects.map(subject => (
                    <div key={subject} className={`liquid-glass-grade-summary-item ${subject === 'English' ? 'liquid-glass-english-summary' : ''}`}>
                      <span>{subject}</span>
                      <strong>{finalGrades[subject]?.grade || 'Not entered'}</strong>
                    </div>
                  ))}
                </div>
                {selectedSubjects.includes('English') && (
                  <div className="liquid-glass-english-callout">
                    English is currently {finalGrades.English?.grade || 'not entered yet'}.
                  </div>
                )}
              </div>
            </div>

            <div className="liquid-glass-card liquid-glass-theme-card">
              <div className="liquid-glass-card-header">
                <div className="liquid-glass-card-title">
                  <Palette className="liquid-glass-card-icon" />
                  Theme
                </div>
                <p className="liquid-glass-card-description">
                  Change the colors and keep them for next time.
                </p>
              </div>
              <div className="liquid-glass-card-content">
                <Select onValueChange={applyThemePreset}>
                  <SelectTrigger className="liquid-glass-select">
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass-select-content">
                    {Object.keys(THEME_PRESETS).map(preset => (
                      <SelectItem key={preset} value={preset} className="liquid-glass-select-item">
                        {preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="liquid-glass-theme-grid">
                  {[
                    ['primary', 'Main'],
                    ['primaryStrong', 'Dark main'],
                    ['background', 'Background'],
                    ['surface', 'Cards'],
                    ['text', 'Text'],
                    ['accent', 'Accent']
                  ].map(([key, label]) => (
                    <label key={key} className="liquid-glass-color-control">
                      <span>{label}</span>
                      <input
                        type="color"
                        value={theme[key]}
                        onChange={(event) => handleThemeChange(key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Grade Requirements */}
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
                <div className="liquid-glass-requirements">
                  {[13.5, 14.0, 14.5].map(targetGPA => {
                    const requirements = calculateRequiredGrades(targetGPA)
                    const hasUnenteredGrades = Object.keys(requirements.grades).length > 0
                    
                    return (
                      <div key={targetGPA} className="liquid-glass-requirement-item">
                        <div className="liquid-glass-requirement-header">
                          <h4 className="liquid-glass-requirement-title">Target GPA: {targetGPA}</h4>
                          <div className={`liquid-glass-requirement-badge ${requirements.possible ? 'liquid-glass-badge-success' : 'liquid-glass-badge-error'}`}>
                            {requirements.possible ? "Achievable" : "Not Possible"}
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
                        
                        {requirements.possible && !hasUnenteredGrades && (
                          <p className="liquid-glass-requirement-message liquid-glass-success-message">
                            {gpa >= targetGPA ? "Already achieved!" : "All grades entered"}
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
          </div>
        </div>

        {/* Save to Google Doc Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={handleSaveDialogClose}>
          <DialogContent className="liquid-glass-dialog">
            <DialogHeader>
              <DialogTitle className="liquid-glass-dialog-title">
                <AlertTriangle className="liquid-glass-dialog-icon" />
                Save Your GPA to Google Doc
              </DialogTitle>
              <DialogDescription className="liquid-glass-dialog-description">
                {getPassiveAggressiveMessage()}
              </DialogDescription>
            </DialogHeader>
            <div className="liquid-glass-dialog-content">
              <div className="liquid-glass-input-group">
                <label className="liquid-glass-input-label">Your Name:</label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your name..."
                  className="liquid-glass-input"
                />
              </div>
              <div className="liquid-glass-gpa-summary">
                <p className="liquid-glass-summary-text">
                  Final Yearly GPA: <span className="liquid-glass-gpa-highlight">{yearlyGPA?.toFixed(2)}</span>
                </p>
              </div>
            </div>
            <DialogFooter className="liquid-glass-dialog-footer">
              <Button
                onClick={handleSaveDialogClose}
                variant="outline"
                className="liquid-glass-dialog-button liquid-glass-dialog-cancel"
              >
                Maybe Later...
              </Button>
              <Button
                onClick={saveToGoogleDoc}
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
                    Save to Doc
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

