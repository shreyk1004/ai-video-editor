"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Scissors,
  Sparkles,
  Zap,
  Download,
  Settings,
  Wand2,
  Mic,
  Globe,
} from "lucide-react"

// Import the test transcript data
import kyleTestData from "./kyle video test transcript data.json"

export default function AIVideoEditor() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(180) // 3 minutes
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const [fillerWordsDetected, setFillerWordsDetected] = useState(47)
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  
  // New AI analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [detectedPauses, setDetectedPauses] = useState<Array<{start: number, end: number, duration: number}>>([])
  const [detectedFillerWords, setDetectedFillerWords] = useState<Array<{
    word: string, 
    start: number, 
    end: number, 
    confidence: number
  }>>([])
  const [transcription, setTranscription] = useState<string>("")
  const [transcriptSegments, setTranscriptSegments] = useState<Array<{
    text: string,
    start: number,
    end: number,
    id: string,
    originalStart: number,
    originalEnd: number
  }>>([])
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [cutSegments, setCutSegments] = useState<Array<{start: number, end: number, type: 'filler' | 'pause' | 'transcript'}>>([])
  const [appliedCuts, setAppliedCuts] = useState<Array<{start: number, end: number, type: 'filler' | 'pause' | 'transcript'}>>([])
  
  // Enhanced editing states with edit tracking
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [deletedWords, setDeletedWords] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Array<{
    id: string,
    type: 'deletion' | 'restoration',
    wordIds: string[],
    startTime: number,
    endTime: number,
    duration: number,
    text: string,
    timestamp: number
  }>>([])
  const [editIdCounter, setEditIdCounter] = useState(0)
  
  // Drag selection states
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null)
  const [dragSelection, setDragSelection] = useState<Set<string>>(new Set())
  
  // Confirmation message state
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)
  
  // Simple confirmation function
  const showConfirmation = (message: string) => {
    setConfirmationMessage(message)
    setTimeout(() => setConfirmationMessage(null), 2000) // Auto-hide after 2 seconds
  }

  // Test mode constants
  const TEST_AUDIO_URL = "https://v3.fal.media/files/monkey/ReqIwPt26dDZVOVFY-FKf_audio.wav"
  
  // Function to adjust timestamps: start +0.1s later, end -0.1s earlier
  // More conservative adjustments to preserve word beginnings and endings
  const adjustTimestamps = (wordData: Array<any>, startDelay: number = 0.05, endDelay: number = -0.05) => {
    return wordData.map(word => {
      const originalStart = word.timestamp[0]
      const originalEnd = word.timestamp[1]
      const originalDuration = originalEnd - originalStart
      
      // Apply adjustments but ensure we maintain a minimum duration of 0.1s
      const adjustedStart = Math.max(0, originalStart + startDelay)
      let adjustedEnd = originalEnd + endDelay
      
      // If the adjustment would make the duration too small or negative, preserve minimum duration
      const minDuration = Math.min(0.1, originalDuration * 0.5) // At least 0.1s or half original duration, whichever is smaller
      adjustedEnd = Math.max(adjustedStart + minDuration, adjustedEnd)
      
      return {
        ...word,
        timestamp: [adjustedStart, adjustedEnd]
      }
    })
  }
  
  // Get test data with adjusted timestamps
  const getTestData = () => {
    const rawTestTranscript = kyleTestData.text
    const rawWordData = kyleTestData.chunks
    
    // Adjust all timestamps: start +0.1s later, end -0.1s earlier
    const adjustedWordData = adjustTimestamps(rawWordData, 0.1, -0.1)
    
    console.log('📊 Timestamp Adjustment Applied:')
    console.log('⏱️ Original first word:', rawWordData[0]?.text, `[${rawWordData[0]?.timestamp[0]}, ${rawWordData[0]?.timestamp[1]}]`)
    console.log('⏱️ Adjusted first word:', adjustedWordData[0]?.text, `[${adjustedWordData[0]?.timestamp[0]}, ${adjustedWordData[0]?.timestamp[1]}]`)
    console.log('⏱️ Original last word:', rawWordData[rawWordData.length - 1]?.text, `[${rawWordData[rawWordData.length - 1]?.timestamp[0]}, ${rawWordData[rawWordData.length - 1]?.timestamp[1]}]`)
    console.log('⏱️ Adjusted last word:', adjustedWordData[adjustedWordData.length - 1]?.text, `[${adjustedWordData[adjustedWordData.length - 1]?.timestamp[0]}, ${adjustedWordData[adjustedWordData.length - 1]?.timestamp[1]}]`)
    console.log('📏 Timing changes: Start +0.1s, End -0.1s (segments shortened by ~0.2s)')
    
    return {
      transcript: rawTestTranscript,
      wordData: adjustedWordData
    }
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Create interactive transcript segments from API word data (one segment per word)
  const createTranscriptSegmentsFromChunks = (wordData: Array<any>) => {
    if (!wordData || wordData.length === 0) {
      console.log('No word data provided to createTranscriptSegmentsFromChunks')
      return []
    }
    
    console.log('Processing word data in createTranscriptSegmentsFromChunks:', wordData.length)
    console.log('First word example:', wordData[0])
    
    const segments: Array<{
      text: string, 
      start: number, 
      end: number, 
      id: string,
      originalStart: number,
      originalEnd: number
    }> = []
    
    wordData.forEach((word, index) => {
      if (word.text && word.text.trim()) {
        // Store both original timestamps (from FAL) and base-adjusted timestamps
        const originalStart = word.timestamp ? word.timestamp[0] : index * 0.5
        const originalEnd = word.timestamp ? word.timestamp[1] : (index + 1) * 0.5
        
        // Base adjustment: +0.1s start, -0.1s end with minimum duration protection
        const originalDuration = originalEnd - originalStart
        const adjustedStart = Math.max(0, originalStart + 0.1)
        let adjustedEnd = originalEnd - 0.1
        
        // Ensure minimum duration
        const minDuration = Math.min(0.1, originalDuration * 0.5)
        adjustedEnd = Math.max(adjustedStart + minDuration, adjustedEnd)
        
        const segment = {
          text: word.text.trim(),
          start: adjustedStart,      // Base-adjusted start time
          end: adjustedEnd,          // Base-adjusted end time
          originalStart: originalStart,  // Immutable original from FAL
          originalEnd: originalEnd,      // Immutable original from FAL
          id: `word-${index}`
        }
        
        segments.push(segment)
        
        // Log first few segments to debug
        if (index < 5) {
          console.log(`Segment ${index}:`, {
            text: segment.text,
            original: `${originalStart}s-${originalEnd}s`,
            adjusted: `${adjustedStart.toFixed(2)}s-${adjustedEnd.toFixed(2)}s`
          })
        }
      }
    })
    
    console.log(`Created ${segments.length} word-level segments from ${wordData.length} words`)
    console.log('Final segments sample:', segments.slice(0, 5))
    return segments
  }

  // Fallback: Create interactive transcript segments from full text (sentence-based)
  const createTranscriptSegments = (fullTranscript: string, videoDuration: number) => {
    if (!fullTranscript.trim()) return []
    
    // Split into sentences while keeping track of original positions
    const sentences: Array<{text: string, originalStart: number, originalEnd: number}> = []
    const sentenceRegex = /[.!?]+/g
    let lastIndex = 0
    let match
    
    while ((match = sentenceRegex.exec(fullTranscript)) !== null) {
      const sentenceText = fullTranscript.slice(lastIndex, match.index).trim()
      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          originalStart: lastIndex,
          originalEnd: match.index + match[0].length
        })
      }
      lastIndex = match.index + match[0].length
    }
    
    // Handle any remaining text after the last punctuation
    const remainingText = fullTranscript.slice(lastIndex).trim()
    if (remainingText.length > 0) {
      sentences.push({
        text: remainingText,
        originalStart: lastIndex,
        originalEnd: fullTranscript.length
      })
    }
    
    const segments: Array<{
      text: string, 
      start: number, 
      end: number, 
      id: string,
      originalStart: number,
      originalEnd: number
    }> = []
    const totalChars = fullTranscript.length
    
    sentences.forEach((sentence, index) => {
      const originalStartTime = (sentence.originalStart / totalChars) * videoDuration
      const originalEndTime = (sentence.originalEnd / totalChars) * videoDuration
      
      // Apply base adjustment: +0.1s start, -0.1s end
      const adjustedStart = Math.max(0, originalStartTime + 0.1)
      const adjustedEnd = Math.max(adjustedStart + 0.1, originalEndTime - 0.1)
      
      segments.push({
        text: sentence.text,
        start: adjustedStart,
        end: adjustedEnd,
        originalStart: originalStartTime,
        originalEnd: originalEndTime,
        id: `segment-${index}`
      })
    })
    
    return segments
  }

  // Find the currently active transcript segment based on video time
  const findActiveSegment = (currentTime: number): {
    text: string, 
    start: number, 
    end: number, 
    id: string,
    originalStart: number,
    originalEnd: number
  } | null => {
    // Find the closest word to current time using effective timestamps
    let closestSegment: {
      text: string, 
      start: number, 
      end: number, 
      id: string,
      originalStart: number,
      originalEnd: number
    } | null = null
    let closestDistance = Infinity
    
    // Convert current time to the same coordinate system as word timestamps
    const effectiveCurrentTime = getAdjustedWordTime(currentTime)
    
    transcriptSegments.forEach((segment, index) => {
      // Skip deleted words - they shouldn't be highlighted during playback
      if (deletedWords.has(segment.id)) {
        return
      }
      
      // Use the new effective timestamp system for accurate timing
      const effectiveStart = getEffectiveWordTime(index, 'start')
      const effectiveEnd = getEffectiveWordTime(index, 'end')
      
      const distance = Math.abs(effectiveCurrentTime - effectiveStart)
      const isInRange = effectiveCurrentTime >= effectiveStart && effectiveCurrentTime <= effectiveEnd + 0.2
      
      if (isInRange && distance < closestDistance) {
        closestDistance = distance
        closestSegment = segment
      }
    })
    
    return closestSegment
  }

  // Enable test mode with predefined audio and transcript
  const enableTestMode = () => {
    console.log('🔧 ENABLING TEST MODE WITH KYLE\'S VIDEO DATA')
    console.log('📁 Audio URL:', TEST_AUDIO_URL)
    
    // Get test data with adjusted timestamps
    const testData = getTestData()
    
    console.log('📄 Transcript length:', testData.transcript.length, 'characters')
    console.log('📊 Word data points:', testData.wordData.length)
    
    setIsTestMode(true)
    setUploadedVideo(null) // Clear any uploaded video
    setTranscription(testData.transcript)
    
    // Use the actual word data from Kyle's video with adjusted timestamps
    console.log('🔧 Creating segments from Kyle\'s word data...')
    console.log('📊 First 3 words:', testData.wordData.slice(0, 3))
    
    const testSegments = createTranscriptSegmentsFromChunks(testData.wordData)
    setTranscriptSegments(testSegments)
    
    // Set initial duration based on the last word's end time
    const lastWord = testData.wordData[testData.wordData.length - 1]
    const videoDuration = lastWord.timestamp[1] + 0.5 // Add small buffer
    setDuration(videoDuration)
    setCurrentTime(0)
    setIsPlaying(false)
    setDetectedPauses([])
    setDetectedFillerWords([])
    setActiveSegmentId(null)
    
    // Clear editing states
    setSelectedWords(new Set())
    setDeletedWords(new Set())
    setIsSelectionMode(false)
    setLastSelectedIndex(null)
    
    console.log('✅ Test mode enabled successfully!')
    console.log('📊 Created segments:', testSegments.length)
    console.log('⏱️ Video duration:', videoDuration.toFixed(2), 'seconds')
    console.log('📝 Sample segments:', testSegments.slice(0, 5))
  }

  // Disable test mode
  const disableTestMode = () => {
    setIsTestMode(false)
    setTranscription("")
    setTranscriptSegments([])
    setActiveSegmentId(null)
    setCurrentTime(0)
    setDuration(180)
    setIsPlaying(false)
    
    // Clear editing states
    setSelectedWords(new Set())
    setDeletedWords(new Set())
    setIsSelectionMode(false)
    setLastSelectedIndex(null)
    
    console.log('Test mode disabled')
  }

  // Helper function to check if a time is within any applied cut segment
  const isTimeInCutSegment = (time: number) => {
    return appliedCuts.some(cut => time >= cut.start && time <= cut.end)
  }

  // Helper function to get the next valid time after cuts
  const getNextValidTime = (time: number) => {
    const sortedCuts = [...appliedCuts].sort((a, b) => a.start - b.start)
    
    for (const cut of sortedCuts) {
      if (time >= cut.start && time <= cut.end) {
        // If we're in a cut segment, jump to the end of it
        return cut.end
      }
    }
    
    return time
  }

  // Helper function to convert edited time to original video time
  const getOriginalVideoTime = (editedTime: number) => {
    const sortedCuts = [...appliedCuts].sort((a, b) => a.start - b.start)
    let originalTime = editedTime
    
    for (const cut of sortedCuts) {
      if (editedTime >= cut.start) {
        // Add back the duration of this cut segment
        originalTime += (cut.end - cut.start)
      } else {
        break
      }
    }
    
    return originalTime
  }

  // Drag selection helper functions
  const startDragSelection = (wordIndex: number, event: React.MouseEvent) => {
    if (!isSelectionMode) return
    
    console.log('🖱️ STARTING DRAG SELECTION')
    console.log(`📍 Start word index: ${wordIndex}`)
    console.log(`📝 Start word: "${transcriptSegments[wordIndex]?.text.trim()}"`)
    
    event.preventDefault()
    setIsDragging(true)
    setDragStartIndex(wordIndex)
    setDragEndIndex(wordIndex)
    
    // Start with just the clicked word
    const wordId = transcriptSegments[wordIndex]?.id
    if (wordId) {
      setDragSelection(new Set([wordId]))
      console.log(`✅ Initial drag selection: "${transcriptSegments[wordIndex]?.text.trim()}" (${wordId})`)
    }
  }

  const updateDragSelection = (wordIndex: number) => {
    if (!isDragging || dragStartIndex === null) return
    
    console.log(`🔄 UPDATING DRAG SELECTION to index ${wordIndex}`)
    console.log(`📝 Current word: "${transcriptSegments[wordIndex]?.text.trim()}"`)
    
    setDragEndIndex(wordIndex)
    
    // Select all words in the drag range
    const startIndex = Math.min(dragStartIndex, wordIndex)
    const endIndex = Math.max(dragStartIndex, wordIndex)
    
    console.log(`📊 Drag range: [${startIndex}-${endIndex}] (${endIndex - startIndex + 1} words)`)
    
    const rangeWordIds = new Set<string>()
    const rangeWords: string[] = []
    for (let i = startIndex; i <= endIndex && i < transcriptSegments.length; i++) {
      const wordId = transcriptSegments[i]?.id
      if (wordId) {
        rangeWordIds.add(wordId)
        rangeWords.push(transcriptSegments[i].text.trim())
      }
    }
    
    console.log(`📝 Words in drag selection: ${rangeWords.join(', ')}`)
    console.log(`🔢 Total drag selected: ${rangeWordIds.size} words`)
    
    setDragSelection(rangeWordIds)
  }

  const finishDragSelection = () => {
    if (!isDragging) return
    
    console.log('✅ FINISHING DRAG SELECTION')
    console.log(`📊 Final drag selection size: ${dragSelection.size} words`)
    
    setIsDragging(false)
    
    // Apply the drag selection to the main selection
    if (dragSelection.size > 0) {
      const dragWords = Array.from(dragSelection).map(id => {
        const word = transcriptSegments.find(w => w.id === id)
        return word ? word.text.trim() : id
      })
      console.log(`📝 Applying drag selection: ${dragWords.join(', ')}`)
      setSelectedWords(dragSelection)
    }
    
    // Reset drag state
    setDragStartIndex(null)
    setDragEndIndex(null)
    setDragSelection(new Set())
    
    console.log('🧹 Drag selection completed and reset')
  }

  const cancelDragSelection = () => {
    console.log('❌ CANCELING DRAG SELECTION')
    console.log(`📊 Canceled selection of ${dragSelection.size} words`)
    
    setIsDragging(false)
    setDragStartIndex(null)
    setDragEndIndex(null)
    setDragSelection(new Set())
    
    console.log('🧹 Drag selection canceled and reset')
  }

  // Transcript editing helper functions
  const toggleWordSelection = (wordId: string, wordIndex: number, event?: React.MouseEvent) => {
    if (!isSelectionMode && !event?.ctrlKey && !event?.metaKey && !event?.shiftKey) {
      // Normal click in non-selection mode - just seek to the word
      const word = transcriptSegments.find(w => w.id === wordId)
      if (word) {
        handleSeek(word.start)
      }
      return
    }

    setSelectedWords(prev => {
      const newSelected = new Set(prev)
      
      if (event?.shiftKey && lastSelectedIndex !== null) {
        // Shift+click: select range
        const startIndex = Math.min(lastSelectedIndex, wordIndex)
        const endIndex = Math.max(lastSelectedIndex, wordIndex)
        
        for (let i = startIndex; i <= endIndex; i++) {
          if (i < transcriptSegments.length) {
            newSelected.add(transcriptSegments[i].id)
          }
        }
      } else if (event?.ctrlKey || event?.metaKey) {
        // Ctrl/Cmd+click: toggle single word
        if (newSelected.has(wordId)) {
          newSelected.delete(wordId)
        } else {
          newSelected.add(wordId)
        }
      } else {
        // Regular click in selection mode: toggle word
        if (newSelected.has(wordId)) {
          newSelected.delete(wordId)
        } else {
          newSelected.add(wordId)
        }
      }
      
      setLastSelectedIndex(wordIndex)
      return newSelected
    })
  }

  const deleteSelectedWords = () => {
    if (selectedWords.size === 0) return
    
    console.log('🔥 STARTING ENHANCED WORD DELETION')
    console.log('📊 Total selected words:', selectedWords.size)
    
    // Get the selected word indices to check for consecutive groups
    const selectedIndices = transcriptSegments
      .map((word, index) => selectedWords.has(word.id) ? index : -1)
      .filter(index => index !== -1)
      .sort((a, b) => a - b)
    
    if (selectedIndices.length === 0) return
    
    // Group consecutive indices into ranges
    const consecutiveRanges: Array<{startIndex: number, endIndex: number}> = []
    let currentRangeStart = selectedIndices[0]
    let currentRangeEnd = selectedIndices[0]
    
    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] === currentRangeEnd + 1) {
        currentRangeEnd = selectedIndices[i]
      } else {
        consecutiveRanges.push({startIndex: currentRangeStart, endIndex: currentRangeEnd})
        currentRangeStart = selectedIndices[i]
        currentRangeEnd = selectedIndices[i]
      }
    }
    consecutiveRanges.push({startIndex: currentRangeStart, endIndex: currentRangeEnd})
    
    // Create pending edits for each consecutive range
    consecutiveRanges.forEach((range, rangeIndex) => {
      const startWord = transcriptSegments[range.startIndex]
      const endWord = transcriptSegments[range.endIndex]
      
      const startTime = Math.max(0, startWord.originalStart - 0.25)
      const endTime = endWord.originalEnd + 0.25
      const duration = endTime - startTime
      
      // Get all word IDs in this range
      const rangeWordIds: string[] = []
      const rangeText: string[] = []
      for (let i = range.startIndex; i <= range.endIndex; i++) {
        if (i < transcriptSegments.length) {
          rangeWordIds.push(transcriptSegments[i].id)
          rangeText.push(transcriptSegments[i].text.trim())
        }
      }
      
      // Create edit entry
      const editId = `edit-${editIdCounter + rangeIndex}`
      const newEdit = {
        id: editId,
        type: 'deletion' as const,
        wordIds: rangeWordIds,
        startTime,
        endTime,
        duration,
        text: rangeText.join(' '),
        timestamp: Date.now()
      }
      
      console.log(`📝 Created deletion edit: "${newEdit.text}" (${duration.toFixed(2)}s)`)
      
      // Add to pending edits
      setPendingEdits(prev => [...prev, newEdit])
      
      // Mark words as deleted
      setDeletedWords(prev => {
        const newDeleted = new Set(prev)
        rangeWordIds.forEach(id => newDeleted.add(id))
        return newDeleted
      })
    })
    
    // Update edit counter and clear selection
    setEditIdCounter(prev => prev + consecutiveRanges.length)
    setSelectedWords(new Set())
    setLastSelectedIndex(null)
    
    const totalDeletedWords = consecutiveRanges.reduce((total, range) => {
      return total + (range.endIndex - range.startIndex + 1)
    }, 0)
    
    console.log(`✅ Added ${consecutiveRanges.length} deletion edits to pending list`)
    showConfirmation(`Added ${totalDeletedWords} words to deletion queue`)
  }

  const restoreSingleWord = (wordId: string, wordIndex: number) => {
    if (!deletedWords.has(wordId)) {
      console.log(`❌ Word "${transcriptSegments[wordIndex]?.text}" is not deleted - cannot restore`)
      return
    }
    
    console.log('🔄 RESTORING SINGLE WORD - SIMPLE APPROACH')
    const word = transcriptSegments[wordIndex]
    
    // 1. Remove from deleted words (word becomes normal immediately)
    setDeletedWords(prev => {
      const newDeleted = new Set(prev)
      newDeleted.delete(wordId)
      console.log(`💾 Restored word "${word.text.trim()}" - deleted count: ${prev.size} → ${newDeleted.size}`)
      return newDeleted
    })
    
    // 2. Remove any existing deletion edits that contain this word
    setPendingEdits(prev => {
      const editsWithoutThisWord = prev.filter(edit => {
        if (edit.type === 'deletion' && edit.wordIds.includes(wordId)) {
          console.log(`🗑️ Removing deletion edit that contained "${word.text.trim()}": "${edit.text}"`)
          return false
        }
        return true
      })
      
      // 3. Add restoration edit to the list
      const startTime = Math.max(0, word.originalStart - 0.25)
      const endTime = word.originalEnd + 0.25
      const duration = endTime - startTime
      
      const restorationEdit = {
        id: `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'restoration' as const,
        wordIds: [wordId],
        startTime,
        endTime,
        duration,
        text: word.text.trim(),
        timestamp: Date.now()
      }
      
      return [...editsWithoutThisWord, restorationEdit]
    })
    
    console.log(`✅ Simple restoration: "${word.text.trim()}" is now normal, deletion edits removed, restoration edit added`)
    showConfirmation(`Restored "${word.text.trim()}"`)
  }
  
  // Helper function to find consecutive deleted range around a word
  const findConsecutiveDeletedRange = (wordIndex: number) => {
    let startIndex = wordIndex
    let endIndex = wordIndex
    
    // Expand backwards to find start of consecutive deleted words
    while (startIndex > 0 && deletedWords.has(transcriptSegments[startIndex - 1].id)) {
      startIndex--
    }
    
    // Expand forwards to find end of consecutive deleted words
    while (endIndex < transcriptSegments.length - 1 && deletedWords.has(transcriptSegments[endIndex + 1].id)) {
      endIndex++
    }
    
    return { startIndex, endIndex }
  }

  const restoreSelectedWords = () => {
    if (selectedWords.size === 0) return
    
    console.log('🔄 STARTING SIMPLE MULTI-WORD RESTORATION')
    console.log('📊 Total selected words for restoration:', selectedWords.size)
    
    // Get only the words that are actually deleted
    const deletedSelectedWords = Array.from(selectedWords).filter(wordId => deletedWords.has(wordId))
    
    if (deletedSelectedWords.length === 0) {
      console.log('❌ No selected words are currently deleted - nothing to restore')
      return
    }
    
    console.log(`📝 Restoring ${deletedSelectedWords.length} deleted words`)
    
    // 1. Remove all selected words from deleted set (words become normal immediately)
    setDeletedWords(prev => {
      const newDeleted = new Set(prev)
      const beforeSize = newDeleted.size
      deletedSelectedWords.forEach(wordId => newDeleted.delete(wordId))
      const afterSize = newDeleted.size
      const restoredCount = beforeSize - afterSize
      
      console.log(`💾 Updated deleted words set: ${beforeSize} → ${afterSize} (-${restoredCount} restored)`)
      return newDeleted
    })
    
    // 2. Remove deletion edits that contain any of these words and add restoration edits
    setPendingEdits(prev => {
      // Remove any deletion edits that contain the restored words
      const editsWithoutRestoredWords = prev.filter(edit => {
        if (edit.type === 'deletion') {
          const hasRestoredWord = edit.wordIds.some(wordId => deletedSelectedWords.includes(wordId))
          if (hasRestoredWord) {
            const restoredWords = edit.wordIds.filter(wordId => deletedSelectedWords.includes(wordId))
            console.log(`🗑️ Removing deletion edit containing restored words: "${restoredWords.map(id => {
              const word = transcriptSegments.find(w => w.id === id)
              return word ? word.text.trim() : id
            }).join(', ')}" from "${edit.text}"`)
            return false
          }
        }
        return true
      })
      
      // Create restoration edits for each word
      const restorationEdits = deletedSelectedWords.map(wordId => {
        const wordIndex = transcriptSegments.findIndex(w => w.id === wordId)
        if (wordIndex < 0) return null
        
        const word = transcriptSegments[wordIndex]
        const startTime = Math.max(0, word.originalStart - 0.25)
        const endTime = word.originalEnd + 0.25
        const duration = endTime - startTime
        
        return {
          id: `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${wordId}`,
          type: 'restoration' as const,
          wordIds: [wordId],
          startTime,
          endTime,
          duration,
          text: word.text.trim(),
          timestamp: Date.now()
        }
      }).filter(edit => edit !== null)
      
      return [...editsWithoutRestoredWords, ...restorationEdits]
    })
    
    // Clear selection after restoration
    setSelectedWords(new Set())
    setLastSelectedIndex(null)
    
    console.log(`✅ Simple multi-word restoration complete: ${deletedSelectedWords.length} words restored, deletion edits removed`)
    showConfirmation(`Restored ${deletedSelectedWords.length} words`)
  }

  const selectAllWords = () => {
    const allWordIds = transcriptSegments.map(word => word.id)
    setSelectedWords(new Set(allWordIds))
  }

  const clearSelection = () => {
    setSelectedWords(new Set())
    setLastSelectedIndex(null)
    // Also clear any active drag selection
    cancelDragSelection()
  }

  const clearAllDeletions = () => {
    if (deletedWords.size === 0) return
    
    const deletedCount = deletedWords.size
    console.log('🔄 CLEARING ALL DELETIONS')
    console.log(`📊 Total deleted words: ${deletedCount}`)
    
    // Remove all transcript-based cuts from cut segments
    setCutSegments(prev => {
      const transcriptCuts = prev.filter(cut => cut.type === 'transcript')
      const otherCuts = prev.filter(cut => cut.type !== 'transcript')
      
      console.log(`📹 Removing ${transcriptCuts.length} transcript-based video cuts`)
      transcriptCuts.forEach(cut => {
        console.log(`  🔄 Removing cut: ${cut.start}s-${cut.end}s`)
      })
      
      return otherCuts
    })
    
    // Clear all word deletions
    setDeletedWords(new Set())
    
    console.log('✅ All word deletions cleared and video cuts removed')
    console.log('─'.repeat(80))
    
    // Show simple confirmation
    showConfirmation(`Cleared all ${deletedCount} deletions`)
  }

  const getSelectedWordsTimeRange = () => {
    if (selectedWords.size === 0) return null
    
    const selectedSegments = transcriptSegments.filter(word => selectedWords.has(word.id))
    if (selectedSegments.length === 0) return null
    
    const startTimes = selectedSegments.map(w => w.start)
    const endTimes = selectedSegments.map(w => w.end)
    
    return {
      start: Math.min(...startTimes),
      end: Math.max(...endTimes),
      wordCount: selectedSegments.length
    }
  }

  // Helper function to check if a word comes immediately after any deleted word(s)
  const isWordAfterDeletion = (wordIndex: number) => {
    if (deletedWords.size === 0 || wordIndex <= 0) return false
    
    // Check if the previous word is deleted
    const prevWord = transcriptSegments[wordIndex - 1]
    if (!prevWord || !deletedWords.has(prevWord.id)) return false
    
    // This word comes right after a deleted word
    return true
  }

  // Helper function to check if a word comes immediately before any deleted word(s)
  const isWordBeforeDeletion = (wordIndex: number) => {
    if (deletedWords.size === 0 || wordIndex >= transcriptSegments.length - 1) return false
    
    // Check if the next word is deleted
    const nextWord = transcriptSegments[wordIndex + 1]
    if (!nextWord || !deletedWords.has(nextWord.id)) return false
    
    // This word comes right before a deleted word
    return true
  }

  // Calculate effective timestamp for a word accounting for ALL adjustments:
      // 1. Base ±0.1s adjustment (already in word.start/end)
  // 2. Deletion-based timeline shifts
  // 3. Extra skip adjustments (+0.5s after deletions, -0.8s before deletions)
  const getEffectiveWordTime = (wordIndex: number, timeType: 'start' | 'end' = 'start') => {
    if (wordIndex < 0 || wordIndex >= transcriptSegments.length) {
      return 0
    }
    
    const word = transcriptSegments[wordIndex]
    
    // Start with base-adjusted time (already includes ±0.1s from FAL data)
    let effectiveTime = timeType === 'start' ? word.start : word.end
    
    // Step 1: Account for deleted words that came before this word (timeline shift)
    if (deletedWords.size > 0) {
      let totalRemovedTime = 0
      
      // Get all deleted words that end before this word's ORIGINAL position
      const originalTimeReference = timeType === 'start' ? word.originalStart : word.originalEnd
      
      transcriptSegments.forEach((segment, segmentIndex) => {
        if (deletedWords.has(segment.id) && segment.originalEnd <= originalTimeReference) {
          // Use original duration for calculating removed time
          const removedDuration = segment.originalEnd - segment.originalStart
          totalRemovedTime += removedDuration
        }
      })
      
      effectiveTime -= totalRemovedTime
    }
    
    // Step 2: Apply extra skip adjustments based on neighboring deletions
    if (isWordAfterDeletion(wordIndex)) {
      effectiveTime += 0.5  // Extra skip after deletions
    }
    
    if (isWordBeforeDeletion(wordIndex) && timeType === 'end') {
      effectiveTime -= 0.8  // Early cutoff before deletions
    }
    
    return Math.max(0, effectiveTime)
  }
  
  // Legacy function - kept for compatibility but should migrate to getEffectiveWordTime
  const getAdjustedWordTime = (originalTime: number) => {
    // NOTE: originalTime is already adjusted by ±0.4s from getTestData() or detectFillerWordsWithFal()
    // This function only handles deletion-based timing adjustments
    
    if (deletedWords.size === 0) {
      // No deletions, return the already-adjusted time as-is
      return originalTime
    }
    
    // Find the word that corresponds to this time
    const currentWordIndex = transcriptSegments.findIndex(word => 
      word.start <= originalTime && word.end >= originalTime
    )
    
    // Get all deleted segments that end before this time
    const deletedSegments = transcriptSegments
      .filter(word => deletedWords.has(word.id))
      .filter(word => word.end <= originalTime)
      .sort((a, b) => a.start - b.start)
    
    // Calculate total time removed before this point
    let totalRemovedTime = 0
    deletedSegments.forEach(segment => {
      const segmentDuration = segment.end - segment.start
      totalRemovedTime += segmentDuration
    })
    
    // The adjusted time accounts for deleted content before this point
    const adjustedTime = originalTime - totalRemovedTime
    return adjustedTime
  }

  // Calculate original timestamp from adjusted time (for seeking)
  const getOriginalTimeFromAdjusted = (adjustedTime: number) => {
    if (deletedWords.size === 0) {
      return adjustedTime
    }
    
    let originalTime = adjustedTime
    const deletedSegments = transcriptSegments
      .filter(word => deletedWords.has(word.id))
      .sort((a, b) => a.start - b.start)
    
    // Add back deleted time segments that would occur before the adjusted time
    // WITHOUT calling getAdjustedWordTime recursively
    let cumulativeRemovedTime = 0
    let cumulativeExtraSkips = 0
    
    for (const segment of deletedSegments) {
      // Calculate where this segment would start in adjusted time
      const segmentAdjustedStart = segment.start - cumulativeRemovedTime - cumulativeExtraSkips
      
      if (segmentAdjustedStart <= adjustedTime) {
        const segmentDuration = segment.end - segment.start
        originalTime += segmentDuration
        cumulativeRemovedTime += segmentDuration
        
        // Check if there's a word after this deleted segment that needs extra skip
        const segmentIndex = transcriptSegments.findIndex(w => w.id === segment.id)
        const nextWordIndex = segmentIndex + 1
        if (nextWordIndex < transcriptSegments.length && 
            !deletedWords.has(transcriptSegments[nextWordIndex].id)) {
          // The next word after this deletion gets an extra skip
          originalTime += 0.5
          cumulativeExtraSkips += 0.5
        }
      } else {
        break
      }
    }
    
    return originalTime
  }

  // Helper function to convert original video time to edited time
  const getEditedTime = (originalTime: number) => {
    const sortedCuts = [...appliedCuts].sort((a, b) => a.start - b.start)
    let editedTime = originalTime
    
    for (const cut of sortedCuts) {
      if (originalTime >= cut.end) {
        // Subtract the duration of this cut segment
        editedTime -= (cut.end - cut.start)
      } else if (originalTime >= cut.start) {
        // We're in a cut segment, map to the start of the cut
        editedTime = cut.start - sortedCuts
          .filter(c => c.end <= cut.start)
          .reduce((total, c) => total + (c.end - c.start), 0)
        break
      } else {
        break
      }
    }
    
    return Math.max(0, editedTime)
  }

  const handleProcess = async () => {
    // Run the AI analysis
    await analyzeAudioForAI()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('🎬 File selected for upload...')
      
      // Enhanced video file detection
      const fileInfo = getVideoFileInfo(file)
      console.log('📁 File analysis:', fileInfo)
      
      if (fileInfo.isVideoFile) {
        const { format } = fileInfo
        console.log(`✅ ${format?.name.toUpperCase()} video accepted:`, {
          size: fileInfo.file.sizeFormatted,
          compatibility: format?.transcriptionCompatibility,
          browserSupport: format?.browserSupport
        })
        
        if (format?.transcriptionCompatibility === 'low') {
          console.warn('⚠️ This video format may have transcription issues. Consider converting to MP4.')
        }
        
        const videoUrl = URL.createObjectURL(file)
        setUploadedVideo(videoUrl)
        
        // Clean up any existing audio context
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close()
          } catch (e) {
            console.log('Error closing audio context during cleanup:', e)
          }
          audioContextRef.current = null
          analyzerRef.current = null
        }
        
        // Reset states
        setCurrentTime(0)
        setIsPlaying(false)
        setAudioEnabled(false)
        setDetectedPauses([])
        setDetectedFillerWords([])
        setTranscription("")
        setTranscriptSegments([])
        setActiveSegmentId(null)
        setAudioData(null)
        
        console.log('🎥 Video uploaded successfully:', videoUrl)
      } else {
        console.error('❌ Unsupported file type:', file.type, 'File name:', file.name)
        showConfirmation(`Unsupported file format. Please select MP4, MOV, WebM, or AVI files.`)
      }
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    const file = files[0]
    
    if (file) {
      console.log('🎬 File dropped for upload...')
      
      // Enhanced video file detection
      const fileInfo = getVideoFileInfo(file)
      console.log('📁 Dropped file analysis:', fileInfo)
      
      if (fileInfo.isVideoFile) {
        const { format } = fileInfo
        console.log(`✅ ${format?.name.toUpperCase()} video accepted via drop:`, {
          size: fileInfo.file.sizeFormatted,
          compatibility: format?.transcriptionCompatibility,
          browserSupport: format?.browserSupport
        })
        
        if (format?.transcriptionCompatibility === 'low') {
          console.warn('⚠️ This video format may have transcription issues. Consider converting to MP4.')
        }
        
        const videoUrl = URL.createObjectURL(file)
        setUploadedVideo(videoUrl)
        
        // Clean up any existing audio context
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close()
          } catch (e) {
            console.log('Error closing audio context during cleanup:', e)
          }
          audioContextRef.current = null
          analyzerRef.current = null
        }
        
        // Reset states
        setCurrentTime(0)
        setIsPlaying(false)
        setAudioEnabled(false)
        setDetectedPauses([])
        setDetectedFillerWords([])
        setTranscription("")
        setTranscriptSegments([])
        setActiveSegmentId(null)
        setAudioData(null)
        
        console.log('🎥 Video uploaded successfully via drag and drop:', videoUrl)
      } else {
        console.error('❌ Unsupported file type:', file.type, 'File name:', file.name)
        showConfirmation(`Unsupported file format. Please select MP4, MOV, WebM, or AVI files.`)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const generateWaveform = async () => {
    if (!videoRef.current || !uploadedVideo) return
    
    try {
      console.log('Generating static waveform from entire video...')
      
      // Clean up any existing audio context first
      if (audioContextRef.current) {
        console.log('Cleaning up existing audio context...')
        try {
          audioContextRef.current.close()
        } catch (e) {
          console.log('Error closing existing audio context:', e)
        }
        audioContextRef.current = null
        analyzerRef.current = null
      }
      
      // Try to extract static waveform using OfflineAudioContext
      console.log('Attempting to extract full audio data...')
      
      try {
        // Fetch the video file as blob
        const response = await fetch(uploadedVideo)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        
        // Try to decode the entire audio track
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        console.log('Successfully decoded audio buffer:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          length: audioBuffer.length
        })
        
        // Extract channel data for waveform
        const channelData = audioBuffer.getChannelData(0)
        setAudioData(channelData)
        
        // Draw the complete static waveform
        drawFullWaveform(channelData)
        setAudioEnabled(true)
        
        // Close the temporary audio context
        audioContext.close()
        
        console.log('Static waveform generated successfully!')
        
      } catch (decodeError) {
        console.log('Direct audio decode failed, trying alternative approach:', decodeError)
        
        // Fallback: Use a different approach for .mov and other problematic formats
        await generateWaveformFromVideoElement()
      }
      
    } catch (error) {
      console.error('Error generating waveform:', error)
      drawPlaceholderWaveform()
      setAudioEnabled(false)
    }
  }

  const generateWaveformFromVideoElement = async () => {
    if (!videoRef.current) return
    
    console.log('Generating realistic static waveform for unsupported codec...')
    
    // Create a more realistic waveform based on video duration
    const duration = videoRef.current.duration
    const sampleCount = 1200 // Number of samples for waveform display
    const staticAudioData = new Float32Array(sampleCount)
    
    // Generate realistic audio-like waveform
    for (let i = 0; i < sampleCount; i++) {
      const time = (i / sampleCount) * duration
      
      // Create realistic amplitude variations
      let amplitude = 0
      
      // Base sine wave for natural rhythm
      amplitude += Math.sin(time * 0.5) * 0.3
      
      // Add harmonics for complexity
      amplitude += Math.sin(time * 1.2) * 0.2
      amplitude += Math.sin(time * 2.1) * 0.1
      
      // Add deterministic variations for natural feel
      amplitude += (Math.sin(time * 7.3) - 0.5) * 0.3
      
      // Create quiet sections (simulating pauses)
      if (Math.sin(time * 3.1) > 0.8) { // Deterministic quiet sections
        amplitude *= 0.1
      }
      
      // Create some louder sections (emphasis)
      if (Math.sin(time * 5.7) > 0.9) { // Deterministic loud sections
        amplitude *= 2
      }
      
      // Normalize and clamp
      amplitude = Math.max(-1, Math.min(1, amplitude * 0.7))
      staticAudioData[i] = amplitude
    }
    
    console.log(`Generated realistic static waveform with ${sampleCount} samples`)
    
    // Set up audio context for real-time playback (if user enables)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaElementSource(videoRef.current)
      const analyser = audioContext.createAnalyser()
      
      analyser.fftSize = 2048
      source.connect(analyser)
      source.connect(audioContext.destination)
      
      audioContextRef.current = audioContext
      analyzerRef.current = analyser
      
      console.log('Audio context ready for real-time visualization')
    } catch (contextError) {
      console.log('Could not set up real-time audio context:', contextError)
    }
    
    // Store and draw the static waveform
    setAudioData(staticAudioData)
    drawFullWaveform(staticAudioData)
    setAudioEnabled(true)
    
    console.log('Static waveform generated successfully!')
  }

  const drawFullWaveform = (audioData: Float32Array) => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas and set background
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, width, height)
    
    // Calculate samples per pixel
    const samplesPerPixel = Math.ceil(audioData.length / width)
    
    // Draw waveform
    ctx.strokeStyle = '#3b82f6'
    ctx.fillStyle = '#3b82f6'
    ctx.globalAlpha = 0.8
    
    for (let x = 0; x < width; x++) {
      let min = 1.0
      let max = -1.0
      
      // Find min and max values for this pixel
      for (let s = 0; s < samplesPerPixel; s++) {
        const sampleIndex = (x * samplesPerPixel) + s
        if (sampleIndex < audioData.length) {
          const sample = audioData[sampleIndex]
          if (sample < min) min = sample
          if (sample > max) max = sample
        }
      }
      
      // Convert to canvas coordinates
      const yMin = ((min + 1) / 2) * height
      const yMax = ((max + 1) / 2) * height
      
      // Draw vertical line for this pixel
      ctx.fillRect(x, Math.min(yMin, yMax), 1, Math.abs(yMax - yMin) || 1)
    }
    
    // Draw center line
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    
    ctx.globalAlpha = 1.0
    
    // Draw analysis markers (pauses and filler words) on top of waveform
    if (detectedPauses.length > 0 || detectedFillerWords.length > 0) {
      drawAnalysisMarkers()
    }
  }

  const drawAppliedCuts = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Use original video duration for positioning
    const originalDuration = videoRef.current?.duration || duration + appliedCuts.reduce((total, cut) => total + (cut.end - cut.start), 0)
    
    // Draw applied cuts as dark overlay
    appliedCuts.forEach(cut => {
      const startX = (cut.start / originalDuration) * width
      const endX = (cut.end / originalDuration) * width
      const cutWidth = Math.max(2, endX - startX)
      
      // Draw dark overlay for cut segments
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(startX, 0, cutWidth, height)
      
      // Draw border
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1
      ctx.strokeRect(startX, 0, cutWidth, height)
      
      // Draw "CUT" text in the middle
      const centerX = startX + (cutWidth / 2)
      const centerY = height / 2
      
      if (cutWidth > 30) { // Only show text if there's enough space
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('CUT', centerX, centerY + 3)
      }
    })
  }

  const drawPlaceholderWaveform = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas and set background
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, width, height)
    
    // Draw center line
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    
    // Draw placeholder waveform pattern
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    
    for (let x = 0; x < width; x++) {
      const frequency = 0.02
      const amplitude = Math.sin(x * frequency) * Math.sin(x * frequency * 0.1) * 0.4
      const noise = (Math.sin(x * 0.37) - 0.5) * 0.1 // Deterministic noise
      const y = height / 2 + (amplitude + noise) * height / 3
      
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    ctx.globalAlpha = 1.0
  }

  const detectPauses = (audioData: Float32Array, sampleRate: number = 44100) => {
    const pauses: Array<{start: number, end: number, duration: number}> = []
    const silenceThreshold = 0.01 // Amplitude threshold for silence
    const minPauseDuration = 0.3 // Minimum pause duration in seconds
    const windowSize = Math.floor(sampleRate * 0.1) // 100ms analysis window
    
    let isInSilence = false
    let silenceStart = 0
    
    for (let i = 0; i < audioData.length; i += windowSize) {
      // Calculate RMS (Root Mean Square) for this window
      let sumSquares = 0
      const windowEnd = Math.min(i + windowSize, audioData.length)
      
      for (let j = i; j < windowEnd; j++) {
        sumSquares += audioData[j] * audioData[j]
      }
      
      const rms = Math.sqrt(sumSquares / (windowEnd - i))
      const timeStamp = i / sampleRate
      
      if (rms < silenceThreshold) {
        // We're in silence
        if (!isInSilence) {
          isInSilence = true
          silenceStart = timeStamp
        }
      } else {
        // We're not in silence
        if (isInSilence) {
          const silenceDuration = timeStamp - silenceStart
          if (silenceDuration >= minPauseDuration) {
            pauses.push({
              start: silenceStart,
              end: timeStamp,
              duration: silenceDuration
            })
          }
          isInSilence = false
        }
      }
    }
    
    // Handle silence at the end
    if (isInSilence) {
      const silenceDuration = (audioData.length / sampleRate) - silenceStart
      if (silenceDuration >= minPauseDuration) {
        pauses.push({
          start: silenceStart,
          end: audioData.length / sampleRate,
          duration: silenceDuration
        })
      }
    }
    
    console.log(`Detected ${pauses.length} pauses:`, pauses)
    return pauses
  }

  // Enhanced video file type checking with detailed codec support information
  const getVideoFileInfo = (file: File) => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()
    
    // Enhanced video file detection with codec awareness
    const videoFormats = {
      mp4: {
        extensions: ['.mp4', '.m4v'],
        mimeTypes: ['video/mp4', 'video/x-m4v'],
        commonCodecs: ['H.264', 'H.265/HEVC', 'AAC', 'MP3'],
        browserSupport: 'excellent',
        transcriptionCompatibility: 'high'
      },
      mov: {
        extensions: ['.mov', '.qt'],
        mimeTypes: ['video/quicktime', 'video/mov'],
        commonCodecs: ['H.264', 'ProRes', 'AAC', 'ALAC', 'PCM'],
        browserSupport: 'variable',
        transcriptionCompatibility: 'medium'
      },
      webm: {
        extensions: ['.webm'],
        mimeTypes: ['video/webm'],
        commonCodecs: ['VP8', 'VP9', 'AV1', 'Vorbis', 'Opus'],
        browserSupport: 'good',
        transcriptionCompatibility: 'high'
      },
      avi: {
        extensions: ['.avi'],
        mimeTypes: ['video/avi', 'video/x-msvideo'],
        commonCodecs: ['Various legacy codecs'],
        browserSupport: 'limited',
        transcriptionCompatibility: 'low'
      },
      mkv: {
        extensions: ['.mkv'],
        mimeTypes: ['video/x-matroska'],
        commonCodecs: ['H.264', 'H.265', 'VP9', 'AAC', 'FLAC'],
        browserSupport: 'limited',
        transcriptionCompatibility: 'medium'
      }
    }
    
    // Determine format
    let detectedFormat = null
    for (const [format, info] of Object.entries(videoFormats)) {
      const extensionMatch = info.extensions.some(ext => fileName.endsWith(ext))
      const mimeMatch = info.mimeTypes.some(mime => fileType === mime)
      
      if (extensionMatch || mimeMatch) {
        detectedFormat = { name: format, ...info }
        break
      }
    }
    
    // Generic video/* fallback
    if (!detectedFormat && fileType.startsWith('video/')) {
      detectedFormat = {
        name: 'unknown',
        extensions: [fileName.slice(fileName.lastIndexOf('.'))],
        mimeTypes: [fileType],
        commonCodecs: ['Unknown'],
        browserSupport: 'unknown',
        transcriptionCompatibility: 'unknown'
      }
    }
    
    return {
      isVideoFile: detectedFormat !== null,
      format: detectedFormat,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)}MB`
      }
    }
  }

  // Strategy 2: Extract audio using a temporary video element (more compatible)
  const extractAudioViaVideoElement = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video')
      videoElement.muted = true // Prevent audio output during processing
      
      videoElement.onloadedmetadata = async () => {
        try {
          console.log('🎥 Video metadata loaded:', {
            duration: `${videoElement.duration.toFixed(2)}s`,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight
          })
          
          // For problematic formats like .mov, just send the original blob
          // The server/API can handle format conversion better than the browser
          console.log('📤 Using original video blob for transcription API')
          resolve(videoBlob)
          
        } catch (error) {
          reject(error)
        } finally {
          URL.revokeObjectURL(videoElement.src)
        }
      }
      
      videoElement.onerror = (e) => {
        console.error('Video element error:', e)
        URL.revokeObjectURL(videoElement.src)
        reject(new Error(`Video format not supported by browser: ${videoBlob.type}`))
      }
      
      // Load video blob
      videoElement.src = URL.createObjectURL(videoBlob)
      videoElement.load()
    })
  }
  
  // Strategy 3: Create minimal test audio as absolute fallback
  const createMinimalTestAudio = (): Blob => {
    const sampleRate = 44100
    const duration = 1 // 1 second of silence
    const numSamples = sampleRate * duration
    const buffer = new ArrayBuffer(44 + numSamples * 2) // WAV header + data
    const view = new DataView(buffer)
    
    // Minimal WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, buffer.byteLength - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // Mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, numSamples * 2, true)
    
    // Silent audio data
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(44 + i * 2, 0, true)
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
  }

    // Enhanced audio extraction optimized for MP3 output
  const extractAudioForTranscription = async (videoBlob: Blob): Promise<Blob> => {
    console.log('🎵 Starting enhanced audio extraction for FAL Whisper...')
    console.log('📁 Input video blob:', {
      size: `${(videoBlob.size / (1024 * 1024)).toFixed(1)}MB`,
      type: videoBlob.type
    })
    
    // Enhanced MP4 debugging and strategy selection
    if (videoBlob.type.includes('mp4')) {
      console.log('🎬 MP4 DETECTED - Using optimized MP3 extraction')
      console.log('💡 Skipping AudioContext (unreliable timestamps) → Direct MP3 extraction')
      
      // For MP4s, skip Strategy 1 and go straight to MP3 extraction
      try {
        const mp3Blob = await extractMP3FromVideo(videoBlob)
        console.log('✅ MP3 extraction successful:', `${(mp3Blob.size / (1024 * 1024)).toFixed(1)}MB`)
        return mp3Blob
      } catch (mp3Error) {
        console.log('❌ MP3 extraction failed:', mp3Error instanceof Error ? mp3Error.message : String(mp3Error))
        console.log('🔄 Falling back to original MP4 → FAL server-side extraction')
      }
    }
    
    // Strategy 1: Try direct audio context decoding and convert to high-quality format (Non-MP4 files only)
    if (!videoBlob.type.includes('mp4')) {
      try {
        console.log('🔄 Strategy 1: High-quality AudioContext extraction...')
        const audioContext = new AudioContext()
        
        try {
          const arrayBuffer = await videoBlob.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          console.log('✅ Direct decoding successful:', {
            duration: `${audioBuffer.duration.toFixed(2)}s`,
            sampleRate: `${audioBuffer.sampleRate}Hz`,
            channels: audioBuffer.numberOfChannels
          })
          
          // Create high-quality WAV with original sample rate and stereo
          const highQualityWav = audioBufferToHighQualityWav(audioBuffer)
          audioContext.close()
          
          console.log('🎵 Generated high-quality WAV:', `${(highQualityWav.size / (1024 * 1024)).toFixed(1)}MB`)
          return highQualityWav
          
        } catch (decodeError) {
          console.log('❌ Strategy 1 (AudioContext) failed:', decodeError instanceof Error ? decodeError.message : String(decodeError))
          audioContext.close()
          throw decodeError
        }
        
      } catch (directError) {
        console.log('🔄 Strategy 1 failed, trying Strategy 2...')
      }
    }
    
    // Strategy 2: Send original video - FAL can extract audio better than browser
    try {
      console.log('🔄 Strategy 2: Sending original video to FAL (recommended for .mov/.mp4)...')
      
      // Validate video can be processed
      const isValidVideo = await validateVideoForTranscription(videoBlob)
      if (isValidVideo) {
        console.log('✅ Strategy 2 SUCCESS: Video validated for direct FAL processing')
        console.log('🎯 This approach often yields better transcription quality than browser extraction')
        if (videoBlob.type.includes('mp4')) {
          console.log('🎬 MP4 Strategy 2: FAL Whisper will extract audio server-side')
          console.log('💡 FAL has better codec support than browser AudioContext')
        }
        return videoBlob
      } else {
        throw new Error('Video validation failed')
      }
      
    } catch (videoError) {
      console.log('❌ Strategy 2 failed:', videoError instanceof Error ? videoError.message : String(videoError))
      
      // Strategy 3: Try basic video element approach
      console.log('🔄 Strategy 3: Video element validation...')
      try {
        const audioBlob = await extractAudioViaVideoElement(videoBlob)
        console.log('✅ Video element extraction successful')
        return audioBlob
        
      } catch (elementError) {
        console.log('❌ Strategy 3 failed:', elementError instanceof Error ? elementError.message : String(elementError))
        
        // Strategy 4: Create minimal test audio as last resort
        console.log('🔄 Strategy 4: Creating minimal test audio...')
        const fallbackBlob = createMinimalTestAudio()
        console.log('⚠️ Using fallback audio - transcription may not work properly')
        return fallbackBlob
      }
    }
  }

  // NEW: MP3 extraction function optimized for MP4 files
  const extractMP3FromVideo = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      console.log('🎵 Starting MP3 extraction from MP4...')
      
      const video = document.createElement('video')
      video.muted = true
      video.crossOrigin = 'anonymous'
      
      video.onloadedmetadata = async () => {
        try {
          console.log('📹 Video metadata loaded for MP3 extraction:', {
            duration: `${video.duration.toFixed(2)}s`,
            hasAudio: !video.muted // Basic check
          })
          
          // Set up MediaRecorder for MP3 output
          const audioContext = new AudioContext({ sampleRate: 44100 })
          const source = audioContext.createMediaElementSource(video)
          const destination = audioContext.createMediaStreamDestination()
          
          source.connect(destination)
          
          // Check if MP3 recording is supported
          const mimeTypes = [
            'audio/mp3',
            'audio/mpeg',
            'audio/webm;codecs=opus', // Fallback
            'audio/webm'
          ]
          
          let selectedMimeType = null
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType
              console.log(`✅ Using MIME type: ${mimeType}`)
              break
            }
          }
          
          if (!selectedMimeType) {
            throw new Error('No supported audio recording format found')
          }
          
          const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: selectedMimeType,
            audioBitsPerSecond: 128000 // 128kbps for good quality
          })
          
          const audioChunks: Blob[] = []
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          }
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { 
              type: selectedMimeType?.includes('mp3') || selectedMimeType?.includes('mpeg') 
                ? 'audio/mpeg' 
                : selectedMimeType || 'audio/webm'
            })
            
            console.log('✅ MP3 extraction completed:', {
              size: `${(audioBlob.size / (1024 * 1024)).toFixed(1)}MB`,
              type: audioBlob.type,
              duration: `${video.duration.toFixed(2)}s`
            })
            
            // Cleanup
            audioContext.close()
            URL.revokeObjectURL(video.src)
            
            resolve(audioBlob)
          }
          
          mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event)
            audioContext.close()
            URL.revokeObjectURL(video.src)
            reject(new Error('MediaRecorder failed'))
          }
          
          // Start recording and play video
          mediaRecorder.start(100) // 100ms chunks
          
          video.currentTime = 0
          await video.play()
          
          // Wait for video to finish
          video.onended = () => {
            console.log('🎬 Video playback completed, stopping MP3 recording...')
            mediaRecorder.stop()
          }
          
        } catch (error) {
          console.error('MP3 extraction setup failed:', error)
          URL.revokeObjectURL(video.src)
          reject(error)
        }
      }
      
      video.onerror = (error) => {
        console.error('Video loading failed for MP3 extraction:', error)
        URL.revokeObjectURL(video.src)
        reject(new Error('Video loading failed'))
      }
      
      // Set timeout
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src)
        reject(new Error('MP3 extraction timeout'))
      }, 60000) // 1 minute timeout
      
      video.onended = () => clearTimeout(timeout)
      
      // Load video
      video.src = URL.createObjectURL(videoBlob)
      video.load()
    })
  }

  // Enhanced WAV creation with better quality for transcription
  const audioBufferToHighQualityWav = (audioBuffer: AudioBuffer): Blob => {
    const numChannels = Math.min(audioBuffer.numberOfChannels, 2) // Stereo or mono
    const sampleRate = audioBuffer.sampleRate // Preserve original sample rate
    const format = 1 // PCM
    const bitDepth = 24 // Higher bit depth for better quality
    
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = audioBuffer.length * blockAlign
    const bufferSize = 44 + dataSize
    
    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)
    
    // Enhanced WAV header with higher quality settings
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)
    
    // Convert audio data with higher precision
    let offset = 44
    const maxValue = Math.pow(2, bitDepth - 1) - 1
    const minValue = -Math.pow(2, bitDepth - 1)
    
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        const sample = Math.max(-1, Math.min(1, channelData[i]))
        const intSample = Math.round(sample * (sample < 0 ? -minValue : maxValue))
        
        // Write 24-bit sample
        const clampedSample = Math.max(minValue, Math.min(maxValue, intSample))
        view.setInt8(offset, clampedSample & 0xFF)
        view.setInt8(offset + 1, (clampedSample >> 8) & 0xFF)
        view.setInt8(offset + 2, (clampedSample >> 16) & 0xFF)
        offset += 3
      }
    }
    
    console.log('📊 High-quality WAV created:', {
      sampleRate: `${sampleRate}Hz`,
      channels: numChannels,
      bitDepth: `${bitDepth}-bit`,
      duration: `${audioBuffer.duration.toFixed(2)}s`
    })
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
  
  // Validate video for direct transcription
  const validateVideoForTranscription = async (videoBlob: Blob): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.muted = true
      
      const timeout = setTimeout(() => {
        cleanup()
        resolve(false)
      }, 5000) // 5 second timeout
      
      const cleanup = () => {
        clearTimeout(timeout)
        if (video.src) URL.revokeObjectURL(video.src)
      }
      
      video.onloadedmetadata = () => {
        const isValid = video.duration > 0 && video.videoWidth > 0
        console.log('📹 Video validation:', {
          duration: `${video.duration.toFixed(2)}s`,
          dimensions: `${video.videoWidth}x${video.videoHeight}`,
          valid: isValid
        })
        cleanup()
        resolve(isValid)
      }
      
      video.onerror = () => {
        console.log('❌ Video validation failed - format not supported by browser')
        cleanup()
        resolve(false)
      }
      
      video.src = URL.createObjectURL(videoBlob)
      video.load()
    })
  }

  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16
    
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = audioBuffer.length * blockAlign
    const bufferSize = 44 + dataSize
    
    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)
    
    // Convert audio data
    const channelData = audioBuffer.getChannelData(0)
    let offset = 44
    
    for (let i = 0; i < audioBuffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  const detectFillerWordsWithFal = async (audioBlob: Blob) => {
    try {
      console.log('Starting filler word detection with fal.ai...')
      console.log('Audio blob size:', audioBlob.size, 'bytes')
      console.log('Audio blob type:', audioBlob.type)
      
      // Log audio blob details for debugging
      if (audioBlob.size === 0) {
        console.error('ERROR: Audio blob is empty!')
        return []
      }
      
      if (audioBlob.size < 1000) {
        console.warn('WARNING: Audio blob seems very small (< 1KB). This might cause transcription issues.')
      }
      
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.wav')
      
      console.log('Sending request to /api/transcribe...')
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error response:', errorData)
        throw new Error(errorData.error || `API error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Transcription result:', result)
      
      const transcriptionText = result.text || ''
      const wordsData = result.words || []  // Use words array instead of chunks
      console.log('Transcription text:', transcriptionText)
      console.log('Total words found:', wordsData.length)
      
      // Enhanced MP4 debugging
      if (audioBlob.type?.includes('mp4') || result.metadata?.isVideo) {
        console.log('🎬 MP4 TRANSCRIPTION ANALYSIS:')
        console.log('📊 Result structure:', {
          hasText: !!transcriptionText,
          textLength: transcriptionText.length,
          hasWords: !!wordsData,
          wordsCount: wordsData.length,
          wordsSample: wordsData.slice(0, 2)
        })
        
        if (wordsData.length === 0 && transcriptionText.length === 0) {
          console.error('❌ MP4 TRANSCRIPTION FAILED: No text or words returned')
          console.error('🔍 Possible causes:')
          console.error('  - MP4 has no audio track')
          console.error('  - MP4 audio codec not supported by FAL')
          console.error('  - Audio track corrupted or encrypted')
          console.error('  - File upload issue')
        }
      }
      
      // Apply timestamp adjustment: start +0.1s later, end -0.1s earlier
      let adjustedWordsData = wordsData
      if (wordsData && wordsData.length > 0) {
        adjustedWordsData = adjustTimestamps(wordsData, 0.1, -0.1)
        console.log('📊 Applied timestamp adjustment to real video data: Start +0.1s, End -0.1s')
        console.log('⏱️ Original first word:', wordsData[0]?.text, `[${wordsData[0]?.timestamp[0]}, ${wordsData[0]?.timestamp[1]}]`)
        console.log('⏱️ Adjusted first word:', adjustedWordsData[0]?.text, `[${adjustedWordsData[0]?.timestamp[0]}, ${adjustedWordsData[0]?.timestamp[1]}]`)
        
        // Show duration change for first word as example
        const originalDuration = wordsData[0]?.timestamp[1] - wordsData[0]?.timestamp[0]
        const adjustedDuration = adjustedWordsData[0]?.timestamp[1] - adjustedWordsData[0]?.timestamp[0]
        console.log('📏 Duration change example:', `${originalDuration.toFixed(3)}s → ${adjustedDuration.toFixed(3)}s (${(adjustedDuration - originalDuration).toFixed(3)}s difference, -0.2s total)`)
      }
      
      // Log actual word data properly (not truncated)
      if (wordsData.length > 0) {
        console.log('First 5 words with full data:')
        wordsData.slice(0, 5).forEach((word: any, index: number) => {
          console.log(`Word ${index}:`, JSON.stringify(word, null, 2))
        })
        
        console.log('Sample word structure:', {
          text: wordsData[0].text,
          timestamp: wordsData[0].timestamp,
          speaker: wordsData[0].speaker
        })
        
        // Validate word data structure for MP4 debugging
        if (audioBlob.type?.includes('mp4') || result.metadata?.isVideo) {
          console.log('🎬 MP4 WORD DATA VALIDATION:')
          const firstWord = wordsData[0]
          const validations = {
            hasText: !!firstWord?.text,
            hasTimestamp: !!firstWord?.timestamp,
            timestampIsArray: Array.isArray(firstWord?.timestamp),
            timestampLength: firstWord?.timestamp?.length || 0,
            timestampValues: firstWord?.timestamp || 'missing'
          }
          console.log('📊 First word validation:', validations)
          
          if (!validations.hasText || !validations.hasTimestamp) {
            console.error('❌ MP4 WORD DATA CORRUPTION: Missing required fields')
          }
          if (!validations.timestampIsArray || validations.timestampLength !== 2) {
            console.error('❌ MP4 TIMESTAMP FORMAT ERROR: Expected [start, end] array')
          }
        }
      }
      
      // Extract filler words from transcription with precise matching using the adjusted word data
      const fillerWordPatterns = [
        'um', 'uh', 'ah', 'uhm', 'umm', 'erm', 'eh', 'hmm',
        'mm-hmm', 'uh-huh', 'mm', 'mhmm'
      ]
      
      const detectedFillers: Array<{word: string, start: number, end: number, confidence: number}> = []
      
      // Use the adjusted word data with timestamps for filler detection
      adjustedWordsData.forEach((wordObj: any, index: number) => {
        const cleanWord = wordObj.text.toLowerCase().replace(/[^\w-]/g, '')
        
        // Check for definite filler words
        const isDefiniteFillerWord = fillerWordPatterns.some(pattern => {
          if (pattern.includes('-')) {
            return cleanWord === pattern
          } else {
            return cleanWord === pattern
          }
        })
        
        // Additional check for very short hesitation sounds
        const isShortHesitation = cleanWord.length <= 3 && /^(um|uh|ah|oh|mm)+$/.test(cleanWord)
        
        // Also check for common variations
        const isVariation = ['umm', 'uhh', 'ahh', 'errr', 'emmm'].includes(cleanWord)
        
        if (isDefiniteFillerWord || isShortHesitation || isVariation) {
          console.log(`Found filler word: "${cleanWord}" at adjusted timestamp [${wordObj.timestamp[0]}, ${wordObj.timestamp[1]}] (start +0.1s, end -0.1s)`)
          
          detectedFillers.push({
            word: cleanWord,
            start: wordObj.timestamp[0],
            end: wordObj.timestamp[1],
            confidence: 0.9 // Higher confidence since we have exact timestamps
          })
        }
      })
      
      setDetectedFillerWords(detectedFillers)
      setTranscription(transcriptionText)
      
      // Create interactive transcript segments from words data
      let segments: Array<{
        text: string, 
        start: number, 
        end: number, 
        id: string,
        originalStart: number,
        originalEnd: number
      }> = []
      if (adjustedWordsData && adjustedWordsData.length > 0) {
        console.log('Using word-level data for transcript segments')
        console.log('Raw words structure:', wordsData.slice(0, 3)) // Show first 3 words
        
        segments = createTranscriptSegmentsFromChunks(adjustedWordsData)
        console.log('Created segments:', segments.slice(0, 3)) // Show first 3 segments
      } else {
        console.log('Falling back to sentence-based segmentation')
        const videoDuration = videoRef.current?.duration || 180
        segments = createTranscriptSegments(transcriptionText, videoDuration)
      }
      setTranscriptSegments(segments)
      
      console.log(`Detected ${detectedFillers.length} filler words in transcription:`, transcriptionText)
      console.log(`Created ${segments.length} interactive transcript segments`)
      console.log('Filler words found:', detectedFillers)
      
      return detectedFillers
    } catch (error) {
      console.error('Error with fal.ai transcription API:', error)
      // Fallback to local detection if API fails
      return []
    }
  }

  const analyzeAudioForAI = async () => {
    if (!uploadedVideo || !audioData) {
      console.log('No video or audio data available for analysis - keeping test data')
      console.log('Current test data before simulation:', {
        pauses: detectedPauses.length,
        fillerWords: detectedFillerWords.length
      })
      
      // If no real video, just simulate the process with test data
      setIsAnalyzing(true)
      setAnalysisProgress(0)
      
      // Simulate processing time
      for (let i = 0; i <= 100; i += 10) {
        setAnalysisProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Keep existing test data and redraw
      console.log('Simulation complete, test data after:', {
        pauses: detectedPauses.length,
        fillerWords: detectedFillerWords.length
      })
      
      setIsAnalyzing(false)
      setAnalysisProgress(0)
      
      // Force redraw with explicit delay
      setTimeout(() => {
        console.log('Force redrawing after simulation complete')
        if (canvasRef.current) {
          if (audioData) {
            drawFullWaveform(audioData)
          } else {
            drawPlaceholderWaveform()
          }
          drawAnalysisMarkers()
        }
      }, 200)
      
      console.log('Analysis simulation complete with test data')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      console.log('Starting AI audio analysis...')
      
      // Step 1: Local pause detection (fast)
      setAnalysisProgress(20)
      const detectedPausesFromAudio = detectPauses(audioData, 44100)
      
      // Only update if we found pauses, otherwise keep test data
      if (detectedPausesFromAudio.length > 0) {
        setDetectedPauses(detectedPausesFromAudio)
      } else {
        console.log('No pauses detected in real audio, keeping test data')
      }
      
      // Step 2: Prepare audio for transcription
      setAnalysisProgress(40)
      const response = await fetch(uploadedVideo)
      const videoBlob = await response.blob()
      const audioBlob = await extractAudioForTranscription(videoBlob)
      
      // Step 3: fal.ai transcription for filler words
      setAnalysisProgress(60)
      const fillerWords = await detectFillerWordsWithFal(audioBlob)
      
      // Only update filler words if we found some, otherwise keep test data
      if (fillerWords.length > 0) {
        setDetectedFillerWords(fillerWords)
        setFillerWordsDetected(fillerWords.length)
      } else {
        console.log('No filler words detected in transcription, keeping test data')
      }
      
      // Step 4: Update UI with results
      setAnalysisProgress(80)
      
      // Redraw waveform with markers
      if (audioData) {
        drawFullWaveform(audioData)
        drawAnalysisMarkers()
      }
      
      setAnalysisProgress(100)
      
      console.log('AI analysis complete!', {
        pauses: detectedPauses.length,
        fillerWords: detectedFillerWords.length
      })
      
    } catch (error) {
      console.error('Error during AI analysis:', error)
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
      
      // Ensure markers are redrawn after analysis completes
      setTimeout(() => {
        if (audioData) {
          drawFullWaveform(audioData)
          drawAnalysisMarkers()
        }
      }, 100)
    }
  }

  const drawAnalysisMarkers = (overrideCutSegments?: Array<{start: number, end: number, type: 'filler' | 'pause' | 'transcript'}>) => {
    if (!canvasRef.current) {
      console.log('No canvas ref available for drawing markers')
      return
    }
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('No canvas context available for drawing markers')
      return
    }
    
    const width = canvas.width
    const height = canvas.height
    
    // Use video duration if available, otherwise fall back to state duration
    const videoDuration = videoRef.current?.duration || duration
    
    if (!videoDuration || videoDuration <= 0) {
      console.log('No valid duration available for drawing markers:', {
        videoDuration: videoRef.current?.duration,
        stateDuration: duration
      })
      return
    }
    
    console.log('Drawing analysis markers:', {
      pauses: detectedPauses.length,
      fillerWords: detectedFillerWords.length,
      duration: videoDuration,
      canvasSize: { width, height },
      pauseTimestamps: detectedPauses.map(p => `${p.start}s-${p.end}s`),
      fillerTimestamps: detectedFillerWords.map(f => `${f.start}s-${f.end}s`),
      pausePositions: detectedPauses.map(p => `${((p.start / videoDuration) * width).toFixed(1)}px`),
      fillerPositions: detectedFillerWords.map(f => `${((f.start / videoDuration) * width).toFixed(1)}px`),
      timestamp: new Date().toISOString()
    })
    
    // Add extra debugging for red dots specifically
    if (detectedPauses.length > 0) {
      console.log('About to draw red pause dots:')
      detectedPauses.forEach((pause, index) => {
        const startX = (pause.start / videoDuration) * width
        const centerX = startX + (((pause.end / videoDuration) * width - startX) / 2)
        console.log(`  Pause ${index}: start=${pause.start}s, centerX=${centerX.toFixed(1)}px`)
      })
    }
    
    // Use override cut segments if provided, otherwise use current state
    const currentCutSegments = overrideCutSegments || cutSegments
    
    // Draw pause markers (red dots and regions)
    detectedPauses.forEach(pause => {
      const startX = (pause.start / videoDuration) * width
      const endX = (pause.end / videoDuration) * width
      const pauseWidth = Math.max(2, endX - startX)
      const centerX = startX + (pauseWidth / 2)
      
      // Check if this segment is marked for cutting
      const isCut = currentCutSegments.some(cut => 
        cut.start <= pause.start && cut.end >= pause.end && cut.type === 'pause'
      )
      
      // Draw pause region (subtle background)
      ctx.fillStyle = isCut ? 'rgba(156, 163, 175, 0.3)' : 'rgba(239, 68, 68, 0.2)' // gray if cut, light red otherwise
      ctx.fillRect(startX, 0, pauseWidth, height)
      
      // Draw pause border
      ctx.strokeStyle = isCut ? '#9ca3af' : '#ef4444' // gray if cut, red otherwise
      ctx.lineWidth = 1
      ctx.strokeRect(startX, 0, pauseWidth, height)
      
      // Draw clickable pause cut dot (RED)
      const dotRadius = 8
      const dotY = 12 // Top position for pauses
      
      // Dot background (white circle)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Dot border and icon
      ctx.strokeStyle = isCut ? '#22c55e' : '#ef4444' // green if cut, red otherwise
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Fill the dot with red color for pauses
      if (!isCut) {
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(centerX, dotY, dotRadius - 2, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        // Draw checkmark if cut
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX - 4, dotY)
        ctx.lineTo(centerX - 1, dotY + 3)
        ctx.lineTo(centerX + 4, dotY - 2)
        ctx.stroke()
      }
    })
    
    // Draw filler word markers (orange dots and regions)
    detectedFillerWords.forEach((filler, index) => {
      const startX = (filler.start / videoDuration) * width
      const endX = (filler.end / videoDuration) * width
      const fillerWidth = Math.max(3, endX - startX)
      const centerX = startX + (fillerWidth / 2)
      
      // Check if this segment is marked for cutting
      const isCut = currentCutSegments.some(cut => 
        cut.start <= filler.start && cut.end >= filler.end && cut.type === 'filler'
      )
      
      // Draw filler word region (subtle background)
      ctx.fillStyle = isCut ? 'rgba(156, 163, 175, 0.3)' : 'rgba(249, 115, 22, 0.2)' // gray if cut, light orange otherwise
      ctx.fillRect(startX, 0, fillerWidth, height)
      
      // Draw filler word border
      ctx.strokeStyle = isCut ? '#9ca3af' : '#f97316' // gray if cut, orange otherwise
      ctx.lineWidth = 1
      ctx.strokeRect(startX, 0, fillerWidth, height)
      
      // Draw clickable filler word cut dot (ORANGE)
      const dotRadius = 8
      const dotY = height - 12 // Bottom position for filler words
      
      // Dot background (white circle)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Dot border
      ctx.strokeStyle = isCut ? '#22c55e' : '#f97316' // green if cut, orange otherwise
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Fill the dot with orange color for filler words
      if (!isCut) {
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.arc(centerX, dotY, dotRadius - 2, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        // Draw checkmark if cut
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX - 4, dotY)
        ctx.lineTo(centerX - 1, dotY + 3)
        ctx.lineTo(centerX + 4, dotY - 2)
        ctx.stroke()
      }
    })
    
    // Draw applied cuts as dark overlays on top of everything
    if (appliedCuts.length > 0) {
      drawAppliedCuts()
    }
  }

  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert to canvas coordinates
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    // Use video duration if available, otherwise fall back to state duration
    const videoDuration = videoRef.current?.duration || duration
    
    if (!videoDuration || videoDuration <= 0) return
    
    let clickHandled = false
    
    // Check if click is near any pause cut dot (top of waveform)
    detectedPauses.forEach((pause, index) => {
      if (clickHandled) return
      
      const startX = (pause.start / videoDuration) * canvas.width
      const endX = (pause.end / videoDuration) * canvas.width
      const pauseWidth = Math.max(2, endX - startX)
      const centerX = startX + (pauseWidth / 2)
      const dotY = 12 // Top position
      const dotRadius = 12 // Slightly larger hit area
      
      const distance = Math.sqrt(Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - dotY, 2))
      
      if (distance <= dotRadius) {
        // Toggle cut for this pause
        toggleCutSegment(pause)
        clickHandled = true
      }
    })
    
          // Check if click is near any filler word cut dot (bottom of waveform)
      if (!clickHandled) {
        detectedFillerWords.forEach((filler, index) => {
          if (clickHandled) return
          
          const startX = (filler.start / videoDuration) * canvas.width
          const endX = (filler.end / videoDuration) * canvas.width
        const fillerWidth = Math.max(3, endX - startX)
        const centerX = startX + (fillerWidth / 2)
        const dotY = canvas.height - 12 // Bottom position
        const dotRadius = 12 // Slightly larger hit area
        
        const distance = Math.sqrt(Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - dotY, 2))
        
        if (distance <= dotRadius) {
          // Toggle cut for this filler word
          toggleCutSegment(filler)
          clickHandled = true
        }
      })
    }
  }

  const toggleCutSegment = (segment: {word: string, start: number, end: number, confidence: number} | {start: number, end: number, duration: number}) => {
    const isFillerWord = 'word' in segment
    const segmentStart = segment.start
    const segmentEnd = segment.end
    const segmentType: 'filler' | 'pause' | 'transcript' = isFillerWord ? 'filler' : 'pause'
    
    // Calculate the new state immediately
    const existingIndex = cutSegments.findIndex(cut => 
      cut.start === segmentStart && cut.end === segmentEnd && cut.type === segmentType
    )
    
    let newCutSegments: Array<{start: number, end: number, type: 'filler' | 'pause' | 'transcript'}>
    if (existingIndex >= 0) {
      // Remove the cut
      console.log(`Removing cut for ${segmentType}:`, segment)
      newCutSegments = cutSegments.filter((_, index) => index !== existingIndex)
    } else {
      // Add the cut
      console.log(`Adding cut for ${segmentType}:`, segment)
      newCutSegments = [...cutSegments, { start: segmentStart, end: segmentEnd, type: segmentType }]
    }
    
    // Update state
    setCutSegments(newCutSegments)
    
    // Immediately redraw with the calculated new state
    // This bypasses React's async state updates
    setTimeout(() => {
      console.log('Redrawing with immediate state:', newCutSegments.length, 'cuts')
      if (audioData) {
        drawFullWaveform(audioData)
      } else {
        drawPlaceholderWaveform()
      }
      
      // Pass the new cut segments directly to the drawing function
      drawAnalysisMarkers(newCutSegments)
    }, 0)
   }

  

   const applyEdits = async () => {
     // Combine traditional cuts and transcript edits
     const allCuts = [...cutSegments]
     
     // Convert pending deletion edits to cut segments
     const deletionCuts = pendingEdits
       .filter(edit => edit.type === 'deletion')
       .map(edit => ({
         start: edit.startTime,
         end: edit.endTime,
         type: 'transcript' as const
       }))
     
     allCuts.push(...deletionCuts)
     
     const restorations = pendingEdits.filter(edit => edit.type === 'restoration')
     
     if (allCuts.length === 0 && restorations.length === 0) {
       showConfirmation('No edits to apply')
       return
     }
     
     // Sort cuts by start time for processing
     const sortedCuts = [...allCuts].sort((a, b) => a.start - b.start)
     
     console.log('Applying edits to video:', {
       cuts: sortedCuts.length,
       restorations: restorations.length
     })
     
     // Calculate metrics - restorations already removed conflicting deletions
     // so this calculation should be accurate
     const totalTimeSaved = sortedCuts.reduce((total, cut) => total + (cut.end - cut.start), 0)
     const totalTimeRestored = restorations.reduce((total, restoration) => total + restoration.duration, 0)
     const netTimeSaved = totalTimeSaved - totalTimeRestored
     const newDuration = duration - netTimeSaved
     
     // Apply edits immediately
     console.log('Applying edits immediately:', {
       cuts: sortedCuts.length,
       restorations: restorations.length,
       netTimeSaved,
       newDuration: newDuration.toFixed(2) + 's'
     })
     
     // Store the applied cuts for video playback handling (only actual cuts, not restorations)
     setAppliedCuts(sortedCuts)
     
     // Clear all pending edits and cuts since they're now processed
     setPendingEdits([])
     setCutSegments([])
     
     // Update duration to reflect the net changes
     setDuration(newDuration)
     
     // Update filler words count based on actual applied cuts
     const fillerCuts = sortedCuts.filter(cut => cut.type === 'filler').length
     setFillerWordsDetected(prev => Math.max(0, prev - fillerCuts))
     
     // Redraw waveform
     if (audioData) {
       drawFullWaveform(audioData)
     } else {
       drawPlaceholderWaveform()
     }
     
     // Remove the cut segments from detected arrays
     setDetectedPauses(prev => prev.filter(pause => 
       !sortedCuts.some(cut => 
         cut.start === pause.start && cut.end === pause.end && cut.type === 'pause'
       )
     ))
     
     setDetectedFillerWords(prev => prev.filter(filler => 
       !sortedCuts.some(cut => 
         cut.start === filler.start && cut.end === filler.end && cut.type === 'filler'
       )
     ))
     
     // Show confirmation with edit summary
     if (netTimeSaved > 0) {
       showConfirmation(`Edits applied! ${netTimeSaved.toFixed(1)}s saved`)
     } else if (netTimeSaved < 0) {
       showConfirmation(`Edits applied! ${Math.abs(netTimeSaved).toFixed(1)}s restored`)
     } else {
       showConfirmation(`Edits applied! No net time change`)
     }
   }

  const enableAudioVisualization = async () => {
    if (videoRef.current && uploadedVideo && !audioEnabled) {
      // If we already have an audio context set up, just enable it
      if (audioContextRef.current && analyzerRef.current) {
        console.log('Enabling existing audio visualization...')
        setAudioEnabled(true)
        
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
      } else {
        // Set up audio visualization from scratch
        console.log('Setting up audio visualization from scratch...')
        await generateWaveform()
        setAudioEnabled(true)
      }
    }
  }

  const visualizeAudio = () => {
    // For static waveforms, we don't need continuous real-time animation
    // Just update the playhead position during playback
    if (audioData && audioData.length > 0) {
      updateStaticWaveform()
    } else if (analyzerRef.current && canvasRef.current) {
      // Fallback for when we don't have static audio data
      drawPlaceholderWaveform()
    }
  }

  const updateStaticWaveform = () => {
    if (!audioData || audioData.length === 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Always redraw the complete static waveform with current playhead
    drawFullWaveform(audioData)
    
    // Draw analysis markers (pauses and filler words) if they exist
    if (detectedPauses.length > 0 || detectedFillerWords.length > 0) {
      drawAnalysisMarkers()
    }
    
    // Add current position indicator (playhead)
    if (videoRef.current) {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const currentTime = videoRef.current.currentTime
      const duration = videoRef.current.duration
      const progress = duration > 0 ? currentTime / duration : 0
      const playheadX = progress * canvas.width
      
      // Draw playhead line
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, canvas.height)
      ctx.stroke()
      
      // Draw small playhead indicator at the top
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(playheadX, 8, 6, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // Continue updating during playback
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateStaticWaveform)
    }
  }

  const handlePlayPause = async () => {
    const mediaElement = isTestMode ? audioRef.current : videoRef.current
    if (!mediaElement) return
    
    if (isPlaying) {
      mediaElement.pause()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    } else {
      // Resume audio context if needed (only for video mode)
      if (!isTestMode && audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      mediaElement.play()
      if (!isTestMode) {
        visualizeAudio()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    const mediaElement = isTestMode ? audioRef.current : videoRef.current
    if (mediaElement) {
      const originalTime = mediaElement.currentTime
      
      // Check if we're in a cut segment and need to skip
      if (appliedCuts.length > 0 && isTimeInCutSegment(originalTime)) {
        const nextValidTime = getNextValidTime(originalTime)
        if (nextValidTime !== originalTime && nextValidTime < (mediaElement.duration || 0)) {
          console.log(`Skipping cut segment: ${originalTime.toFixed(2)}s → ${nextValidTime.toFixed(2)}s`)
          mediaElement.currentTime = nextValidTime
          return
        }
      }
      
      // Convert original time to edited time for display
      const displayTime = appliedCuts.length > 0 ? getEditedTime(originalTime) : originalTime
      setCurrentTime(displayTime)
      
      // Update active transcript segment
      const activeSegment = findActiveSegment(originalTime)
      if (activeSegment?.id !== activeSegmentId) {
        setActiveSegmentId(activeSegment?.id || null)
      }
      
      // Update static waveform playhead during playback (only for video mode)
      if (!isTestMode && audioData && audioData.length > 0 && !animationFrameRef.current) {
        updateStaticWaveform()
      }
    }
  }

  const handleLoadedMetadata = async () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      console.log('Video loaded, duration:', videoRef.current.duration)
      
      // Setup audio visualization for the video (only if not already set up)
      if (uploadedVideo && !audioContextRef.current) {
        await generateWaveform()
      }
      
      // Force redraw markers after video is loaded
      setTimeout(() => {
        if (audioData && audioData.length > 0) {
          drawFullWaveform(audioData)
          drawAnalysisMarkers()
        } else {
          drawPlaceholderWaveform()
          // Draw markers even on placeholder
          if (detectedPauses.length > 0 || detectedFillerWords.length > 0) {
            drawAnalysisMarkers()
          }
        }
      }, 100)
    }
  }

  const handleSeek = (newTime: number) => {
    const mediaElement = isTestMode ? audioRef.current : videoRef.current
    if (mediaElement) {
      // Convert edited time to original video time if cuts have been applied
      const originalTime = appliedCuts.length > 0 ? getOriginalVideoTime(newTime) : newTime
      
      // Make sure we don't seek to a cut segment
      const validTime = appliedCuts.length > 0 ? getNextValidTime(originalTime) : originalTime
      
      console.log(`Seeking: edited=${newTime.toFixed(2)}s → original=${validTime.toFixed(2)}s`)
      
      mediaElement.currentTime = validTime
      setCurrentTime(newTime)
    }
  }

  // Effect to redraw markers when analysis data changes
  useEffect(() => {
    console.log('Data change detected:', {
      pauses: detectedPauses.length,
      fillerWords: detectedFillerWords.length,
      hasCanvas: !!canvasRef.current,
      hasAudioData: !!audioData
    })
    
    if (canvasRef.current && (detectedPauses.length > 0 || detectedFillerWords.length > 0)) {
      console.log('Redrawing markers due to data change')
      setTimeout(() => {
        if (audioData && audioData.length > 0) {
          drawFullWaveform(audioData)
        } else {
          drawPlaceholderWaveform()
        }
        drawAnalysisMarkers()
      }, 50)
    } else if (canvasRef.current && detectedPauses.length === 0 && detectedFillerWords.length === 0) {
      console.log('WARNING: Data arrays are empty - markers will not be drawn')
    }
  }, [detectedPauses, detectedFillerWords, audioData])

  // Effect to draw initial markers when component mounts
  useEffect(() => {
    console.log('Component mounted, drawing initial state')
    if (canvasRef.current && (detectedPauses.length > 0 || detectedFillerWords.length > 0)) {
      setTimeout(() => {
        console.log('Drawing initial markers with placeholder waveform')
        drawPlaceholderWaveform()
        drawAnalysisMarkers()
      }, 100)
    }
  }, []) // Empty dependency array means this runs once on mount

  // Global mouse events for drag selection and keyboard shortcuts
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        finishDragSelection()
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Prevent text selection during drag
        e.preventDefault()
      }
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        cancelDragSelection()
      }
      
      // Delete key support for selected words in edit mode
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isSelectionMode && selectedWords.size > 0) {
          e.preventDefault()
          console.log('⌨️ Keyboard delete triggered for', selectedWords.size, 'words')
          deleteSelectedWords()
        }
      }
    }

    // Always listen for delete key, but only during drag for other events
    document.addEventListener('keydown', handleGlobalKeyDown)
    
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('mousemove', handleGlobalMouseMove)
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, isSelectionMode, selectedWords])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (uploadedVideo) {
        URL.revokeObjectURL(uploadedVideo)
      }
    }
  }, [uploadedVideo])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              AI Video Editor
            </h1>
            <p className="text-gray-600 mt-1">Remove filler words and create engaging content automatically</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Test Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm font-medium text-yellow-800">Test Mode</span>
              <Switch 
                checked={isTestMode} 
                onCheckedChange={(checked) => {
                  if (checked) {
                    enableTestMode()
                  } else {
                    disableTestMode()
                  }
                }}
              />
            </div>
            
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Upload/Preview */}
            <Card>
              <CardContent className="p-6">
                <div 
                  ref={dropZoneRef}
                  className={`aspect-video bg-black rounded-lg relative overflow-hidden transition-all duration-200 ${
                    isDragOver ? 'ring-4 ring-purple-500 ring-opacity-50 bg-purple-900' : ''
                  }`}
                  onDrop={!isTestMode ? handleDrop : undefined}
                  onDragOver={!isTestMode ? handleDragOver : undefined}
                  onDragLeave={!isTestMode ? handleDragLeave : undefined}
                >
                  {isTestMode ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
                      <div className="text-center text-white">
                        <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                          <Volume2 className="w-12 h-12" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Test Audio Mode</h3>
                        <p className="text-blue-200 mb-4">Using predefined test audio and transcript</p>
                                                 <audio
                           ref={audioRef}
                           src={TEST_AUDIO_URL}
                           className="hidden"
                           onTimeUpdate={handleTimeUpdate}
                           onLoadedMetadata={(e) => {
                             const audio = e.target as HTMLAudioElement
                             setDuration(audio.duration)
                             console.log('Test audio loaded, duration:', audio.duration)
                             console.log('Test audio URL being used:', TEST_AUDIO_URL)
                           }}
                           onError={(e) => {
                             console.error('Test audio failed to load:', e)
                           }}
                           onPlay={() => setIsPlaying(true)}
                           onPause={() => setIsPlaying(false)}
                         />
                        <div className="text-sm text-blue-200">
                          Audio: {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                      </div>
                    </div>
                  ) : uploadedVideo ? (
                    <video
                      ref={videoRef}
                      src={uploadedVideo}
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Upload className={`w-12 h-12 mx-auto mb-4 opacity-50 transition-all duration-200 ${
                          isDragOver ? 'scale-110 text-purple-300' : ''
                        }`} />
                        <p className="text-lg mb-2">
                          {isDragOver ? 'Drop your video here' : 'Drop your video here or click to upload'}
                        </p>
                        <p className="text-sm opacity-75">Supports MP4, MOV, AVI up to 2GB</p>
                        {!isDragOver && (
                          <Button 
                            className="mt-4" 
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </Button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*,.mov,.mp4,.avi,.webm,.mkv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Controls */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={handlePlayPause}
                      disabled={!uploadedVideo && !isTestMode}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline"
                      disabled={!uploadedVideo && !isTestMode}
                      onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline"
                      disabled={!uploadedVideo && !isTestMode}
                      onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                      <Slider
                        value={[currentTime]}
                        max={duration}
                        step={0.1}
                        className="flex-1"
                        onValueChange={(value) => handleSeek(value[0])}
                        disabled={!uploadedVideo && !isTestMode}
                      />
                      <span className="text-sm text-gray-600">{formatTime(duration)}</span>
                    </div>
                    <Button size="icon" variant="outline" disabled={!uploadedVideo && !isTestMode}>
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Audio Waveform Timeline */}
                  {!isTestMode && (
                    <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                      {uploadedVideo ? (
                      <div className="relative">
                        <canvas
                          ref={canvasRef}
                          width={1200}
                          height={64}
                          className="w-full h-full bg-gray-900 rounded cursor-pointer"
                          onClick={handleWaveformClick}
                        />
                        {/* Audio enable overlay */}
                        {!audioEnabled && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                            <Button 
                              onClick={enableAudioVisualization}
                              className="bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              Enable Audio Visualization
                            </Button>
                          </div>
                        )}
                        {/* Playhead indicator */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-10 shadow-lg"
                          style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                                                  <div className="flex items-end gap-1 h-12">
                            {Array.from({ length: 100 }).map((_, i) => (
                              <div key={i} className="bg-blue-400 w-1" style={{ height: `${(50 + 40 * Math.sin(i * 0.15)).toFixed(2)}%` }} />
                            ))}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Status */}
            {isAnalyzing && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Analyzing Audio...</span>
                        <span className="text-sm text-gray-600">{analysisProgress}%</span>
                      </div>
                      <Progress value={analysisProgress} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        {analysisProgress <= 20 && "Detecting pauses..."}
                        {analysisProgress > 20 && analysisProgress <= 40 && "Extracting audio..."}
                        {analysisProgress > 40 && analysisProgress <= 80 && "Transcribing with AI..."}
                        {analysisProgress > 80 && "Finalizing results..."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}



            {/* Enhanced Interactive Transcript Editor */}
            {transcription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-blue-600" />
                    Transcript Editor
                    <Badge variant="secondary">{transcriptSegments.length} words</Badge>
                    {deletedWords.size > 0 && (
                      <Badge variant="destructive">{deletedWords.size} deleted</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Editing Controls */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isSelectionMode ? "default" : "outline"}
                        onClick={() => {
                          setIsSelectionMode(!isSelectionMode)
                          if (!isSelectionMode) {
                            clearSelection()
                          }
                        }}
                      >
                        <Scissors className="w-3 h-3 mr-1" />
                        {isSelectionMode ? "Exit Edit" : "Edit Mode"}
                      </Button>
                      
                      {selectedWords.size > 0 && (
                        <>
                          <Badge variant="outline">
                            {selectedWords.size} selected
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={deleteSelectedWords}
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={restoreSelectedWords}
                          >
                            Restore
                          </Button>
                        </>
                      )}
                      

                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isSelectionMode && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={selectAllWords}
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={clearSelection}
                          >
                            Clear
                          </Button>
                        </>
                      )}
                                             <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => navigator.clipboard.writeText(transcription)}
                       >
                         Copy Text
                       </Button>
                       
                       {deletedWords.size > 0 && !isSelectionMode && (
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={clearAllDeletions}
                           className="text-red-600 hover:text-red-700"
                         >
                           Clear Deletions
                         </Button>
                       )}
                     </div>
                   </div>

                                    {/* Selection Info */}
                  {(selectedWords.size > 0 || dragSelection.size > 0) && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          {isDragging 
                            ? `Selecting: ${dragSelection.size} words` 
                            : `Selected: ${selectedWords.size} words`
                          }
                        </span>
                        <span className="text-xs text-blue-600">
                          {(() => {
                            const activeSelection = isDragging ? dragSelection : selectedWords
                            if (activeSelection.size === 0) return ''
                            
                            const activeSegments = transcriptSegments
                              .filter(word => activeSelection.has(word.id))
                              .sort((a, b) => a.start - b.start)
                            
                            if (activeSegments.length === 0) return ''
                            
                            const startTime = activeSegments[0].start
                            const endTime = activeSegments[activeSegments.length - 1].end
                            let adjustedStart = getAdjustedWordTime(startTime)
                            let adjustedEnd = getAdjustedWordTime(endTime)
                            
                            // Check if the first selected word comes after a deletion
                            const firstWordIndex = transcriptSegments.findIndex(w => w.id === activeSegments[0].id)
                            const lastWordIndex = transcriptSegments.findIndex(w => w.id === activeSegments[activeSegments.length - 1].id)
                            
                            if (firstWordIndex >= 0 && isWordAfterDeletion(firstWordIndex)) {
                              adjustedStart += 0.5
                            }
                            
                            if (lastWordIndex >= 0 && isWordBeforeDeletion(lastWordIndex)) {
                              adjustedEnd -= 0.5
                            }
                            
                            // If there are words both after and before deletions
                            if (firstWordIndex >= 0 && isWordAfterDeletion(firstWordIndex) && 
                                lastWordIndex >= 0 && isWordBeforeDeletion(lastWordIndex)) {
                              // No additional adjustment to adjustedEnd since we already handled both cases
                            } else if (firstWordIndex >= 0 && isWordAfterDeletion(firstWordIndex)) {
                              adjustedEnd += 0.5
                            }
                            
                            return `${formatTime(adjustedStart)} - ${formatTime(adjustedEnd)} (${(adjustedEnd - adjustedStart).toFixed(1)}s continuous)`
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Word-by-word editable transcript */}
                  <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm leading-relaxed select-none">
                      {transcriptSegments.length > 0 ? (
                        transcriptSegments.map((word, index) => {
                          // Use the new effective timestamp system for accurate timing
                          const effectiveCurrentTime = getAdjustedWordTime(currentTime)
                          const effectiveStart = getEffectiveWordTime(index, 'start')
                          const effectiveEnd = getEffectiveWordTime(index, 'end')
                          
                          // Calculate distance to this word
                          const distanceToStart = Math.abs(effectiveCurrentTime - effectiveStart)
                          
                          // Check if this is the closest non-deleted word to the current time
                          const isClosestWord = transcriptSegments.every((otherWord, otherIndex) => {
                            if (otherIndex === index) return true
                            // Skip deleted words when finding the closest word
                            if (deletedWords.has(otherWord.id)) return true
                            
                            const otherEffectiveStart = getEffectiveWordTime(otherIndex, 'start')
                            const otherDistance = Math.abs(effectiveCurrentTime - otherEffectiveStart)
                            return distanceToStart <= otherDistance
                          })
                          
                          // Check if we're within the word's effective time range
                          const isInRange = effectiveCurrentTime >= effectiveStart && effectiveCurrentTime <= effectiveEnd + 0.2
                          const isCurrentlyPlaying = isInRange && isClosestWord && !deletedWords.has(word.id)
                          
                          // For display purposes, calculate final adjusted times for tooltips
                          const finalAdjustedStart = effectiveStart
                          const finalAdjustedEnd = effectiveEnd
                          
                          const isSelected = selectedWords.has(word.id)
                          const isDragSelected = dragSelection.has(word.id)
                          const isDeleted = deletedWords.has(word.id)
                          
                          return (
                            <span
                              key={word.id}
                              className={`
                                inline-block px-1 py-0.5 mx-0.5 my-0.5 rounded transition-all duration-200 border border-transparent select-none
                                ${isCurrentlyPlaying && !isDeleted
                                  ? 'bg-green-500 text-white font-semibold shadow-md scale-105 border-green-600 cursor-pointer' 
                                  : isDragSelected
                                  ? 'bg-purple-400 text-white border-purple-500 shadow-sm cursor-pointer'
                                  : isSelected
                                  ? 'bg-blue-500 text-white border-blue-600 shadow-sm cursor-pointer'
                                  : isDeleted
                                  ? isSelectionMode 
                                    ? 'bg-red-100 text-red-600 line-through opacity-80 cursor-pointer hover:bg-red-200 hover:opacity-90 border-red-300'
                                    : 'bg-red-100 text-red-400 line-through opacity-60 cursor-not-allowed'
                                  : isSelectionMode
                                  ? 'hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 hover:shadow-sm bg-white border-gray-200 cursor-pointer'
                                  : 'hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                                }
                                ${isSelectionMode ? 'border' : ''}
                              `}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                if (isSelectionMode && !isDeleted) {
                                  startDragSelection(index, e)
                                }
                              }}
                              onMouseEnter={() => {
                                if (isDragging && !isDeleted) {
                                  updateDragSelection(index)
                                }
                              }}
                              onMouseUp={() => {
                                if (isDragging) {
                                  finishDragSelection()
                                }
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                if (isDragging) {
                                  // Don't handle clicks during drag
                                  return
                                }
                                
                                // Handle deleted word clicks - restore them in edit mode
                                if (isDeleted && isSelectionMode) {
                                  console.log(`🔄 Clicked on deleted word "${word.text}" in edit mode - restoring...`)
                                  restoreSingleWord(word.id, index)
                                  return
                                }
                                
                                if (isSelectionMode || e.ctrlKey || e.metaKey || e.shiftKey) {
                                  // Only allow selection of non-deleted words
                                  if (!isDeleted) {
                                    toggleWordSelection(word.id, index, e)
                                  }
                                } else if (!isDeleted) {
                                  // Use effective timing for accurate seeking
                                  const seekTime = getEffectiveWordTime(index, 'start')
                                  const afterDeletion = isWordAfterDeletion(index)
                                  const beforeDeletion = isWordBeforeDeletion(index)
                                  let adjustmentNote = 'base ±0.1s'
                                  if (afterDeletion) adjustmentNote += ', +0.5s after deletion'
                                  if (beforeDeletion) adjustmentNote += ', -0.8s before deletion'
                                  console.log(`🎯 Seeking to word "${word.text}" at effective time ${seekTime.toFixed(2)}s (original: ${word.originalStart}s, adjustments: ${adjustmentNote})`)
                                  handleSeek(seekTime)
                                }
                              }}
                              title={
                                isDeleted 
                                  ? isSelectionMode
                                    ? `"${word.text}" - DELETED (originally at ${formatTime(word.originalStart)}) - Click to restore this word`
                                    : `"${word.text}" - DELETED (originally at ${formatTime(word.originalStart)}) - Enable Edit Mode to restore`
                                  : isSelectionMode
                                  ? `"${word.text}" - Original: ${formatTime(word.originalStart)} | Effective: ${formatTime(effectiveStart)} - Click to select, Shift+click for range, Ctrl+click to toggle`
                                  : `"${word.text}" - Original: ${formatTime(word.originalStart)} | Effective: ${formatTime(effectiveStart)} - Click to jump`
                              }
                            >
                              {word.text}
                            </span>
                          )
                        })
                      ) : (
                        <div className="text-center py-4">
                          <span className="text-gray-500">No word-level data available</span>
                          <p className="text-xs text-gray-400 mt-1">
                            {transcription ? 'Transcript loaded but no word timestamps' : 'No transcript generated yet'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>
                        Generated by Whisper AI • {transcriptSegments.length} words • {deletedWords.size} deleted
                      </span>
                                             <span>
                         {isSelectionMode 
                           ? isDragging
                             ? "Dragging to select words • Release to finish selection • ESC to cancel"
                             : deletedWords.size > 0
                             ? "Selection Mode: Click words to select/delete • Click deleted words to restore • Shift+click for range"
                             : "Selection Mode: Click words or click+drag to select ranges • Shift+click for range"
                           : deletedWords.size > 0
                           ? "Struck-through words are deleted • Click words to jump • Enable Edit Mode to restore deleted words"
                           : "Click words to jump • Toggle Edit Mode to select and delete"
                         }
                       </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* AI Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  AI Enhancement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={handleProcess}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Video
                </Button>
                
                <div className="text-xs text-gray-500 text-center">
                  Analyzes audio for pauses and filler words using AI transcription
                </div>
              </CardContent>
            </Card>

            {/* Detected Pauses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pause className="w-5 h-5 text-amber-500" />
                  Long Pauses
                  <Badge variant="secondary">{detectedPauses.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {detectedPauses.length > 0 ? (
                    detectedPauses.map((pause, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatTime(pause.start)}</span>
                          <Badge variant="outline">{pause.duration.toFixed(1)}s</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSeek(pause.start)}
                            title="Jump to pause"
                          >
                            <SkipForward className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={cutSegments.some(cut => 
                              cut.start === pause.start && cut.end === pause.end && cut.type === 'pause'
                            ) ? "default" : "ghost"}
                            onClick={() => toggleCutSegment(pause)}
                            title={cutSegments.some(cut => 
                              cut.start === pause.start && cut.end === pause.end && cut.type === 'pause'
                            ) ? "Remove cut" : "Cut this pause"}
                          >
                            <Scissors className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-gray-500">
                      <p className="text-xs">No long pauses detected yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filler Words Detected */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-red-500" />
                  Filler Words
                  <Badge variant="destructive">{detectedFillerWords.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detectedFillerWords.length > 0 ? (
                    detectedFillerWords.map((filler, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">&ldquo;{filler.word}&rdquo;</span>
                          <Badge variant="outline">{formatTime(filler.start)}</Badge>
                          <span className="text-xs text-gray-500">
                            {Math.round(filler.confidence * 100)}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSeek(filler.start)}
                            title="Jump to filler word"
                          >
                            <SkipForward className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={cutSegments.some(cut => 
                              cut.start === filler.start && cut.end === filler.end && cut.type === 'filler'
                            ) ? "default" : "ghost"}
                            onClick={() => toggleCutSegment(filler)}
                            title={cutSegments.some(cut => 
                              cut.start === filler.start && cut.end === filler.end && cut.type === 'filler'
                            ) ? "Remove cut" : "Cut this segment"}
                          >
                            <Scissors className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No filler words detected yet</p>
                      <p className="text-xs mt-1">Click &ldquo;Enhance Video&rdquo; to analyze audio</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Edits Summary */}
            {(cutSegments.length > 0 || pendingEdits.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-purple-600" />
                    Pending Edits
                    <Badge variant="secondary">{cutSegments.length + pendingEdits.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {/* Traditional cuts (filler words and pauses) */}
                    {cutSegments.map((cut, index) => (
                      <div key={`cut-${index}`} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-red-700">
                            {cut.type === 'filler' ? 'Filler' : cut.type === 'pause' ? 'Pause' : 'Cut'}
                          </span>
                          <Badge variant="outline">{formatTime(cut.start)} - {formatTime(cut.end)}</Badge>
                          <span className="text-xs text-gray-500">
                            -{(cut.end - cut.start).toFixed(1)}s
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setCutSegments(prev => prev.filter((_, i) => i !== index))}
                          title="Remove this cut"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    
                    {/* Transcript edits (deletions and restorations) */}
                    {pendingEdits.map((edit) => (
                      <div key={edit.id} className={`flex items-center justify-between p-2 rounded ${
                        edit.type === 'deletion' ? 'bg-red-50' : 'bg-green-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${
                            edit.type === 'deletion' ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {edit.type === 'deletion' ? 'Delete' : 'Restore'}
                          </span>
                          <Badge variant="outline" className="max-w-32 truncate">
                            {edit.text}
                          </Badge>
                          <span className={`text-xs ${
                            edit.type === 'deletion' ? 'text-gray-500' : 'text-green-600'
                          }`}>
                            {edit.type === 'deletion' ? '-' : '+'}{edit.duration.toFixed(1)}s
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            // Remove the edit and restore/re-delete the words accordingly
                            if (edit.type === 'deletion') {
                              // Restore the words
                              setDeletedWords(prev => {
                                const newDeleted = new Set(prev)
                                edit.wordIds.forEach(id => newDeleted.delete(id))
                                return newDeleted
                              })
                            } else {
                              // Re-delete the words
                              setDeletedWords(prev => {
                                const newDeleted = new Set(prev)
                                edit.wordIds.forEach(id => newDeleted.add(id))
                                return newDeleted
                              })
                            }
                            // Remove from pending edits
                            setPendingEdits(prev => prev.filter(e => e.id !== edit.id))
                          }}
                          title={`Cancel this ${edit.type}`}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {(cutSegments.length > 0 || pendingEdits.length > 0) && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">Net time change:</span>
                        <span className={`font-bold ${
                          (() => {
                            const cutTime = cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0)
                            const deletionTime = pendingEdits.filter(e => e.type === 'deletion').reduce((total, edit) => total + edit.duration, 0)
                            const restorationTime = pendingEdits.filter(e => e.type === 'restoration').reduce((total, edit) => total + edit.duration, 0)
                            const netTime = cutTime + deletionTime - restorationTime
                            return netTime >= 0 ? 'text-green-600' : 'text-red-600'
                          })()
                        }`}>
                          {(() => {
                            const cutTime = cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0)
                            const deletionTime = pendingEdits.filter(e => e.type === 'deletion').reduce((total, edit) => total + edit.duration, 0)
                            const restorationTime = pendingEdits.filter(e => e.type === 'restoration').reduce((total, edit) => total + edit.duration, 0)
                            const netTime = cutTime + deletionTime - restorationTime
                            return `${netTime >= 0 ? '-' : '+'}${Math.abs(netTime).toFixed(1)}s`
                          })()}
                        </span>
                      </div>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700" 
                        size="sm"
                        onClick={() => applyEdits()}
                        disabled={cutSegments.length === 0 && pendingEdits.length === 0}
                      >
                                                  <Scissors className="w-3 h-3 mr-2" />
                          Apply Edits
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


          </div>
        </div>



        {/* Export Options */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Ready to Export</h3>
                <p className="text-sm text-gray-600">Your enhanced video is ready for download</p>
              </div>
              <div className="flex items-center gap-3">
                <Select defaultValue="1080p">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4k">4K (2160p)</SelectItem>
                    <SelectItem value="1080p">HD (1080p)</SelectItem>
                    <SelectItem value="720p">HD (720p)</SelectItem>
                    <SelectItem value="480p">SD (480p)</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Floating Confirmation Message */}
      {confirmationMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in-0 duration-300">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-medium">{confirmationMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

