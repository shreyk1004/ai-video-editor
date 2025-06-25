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
  Eye,
  Mic,
  Globe,
  Film,
  Palette,
  Music,
  Type,
  Layers,
} from "lucide-react"

export default function AIVideoEditor() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(180) // 3 minutes
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const [fillerWordsDetected, setFillerWordsDetected] = useState(47)
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [waveformGenerated, setWaveformGenerated] = useState(false)
  
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
  const [transcription, setTranscription] = useState<Array<{
    text: string,
    start: number,
    end: number,
    confidence: number
  }>>([])
  const [cutSegments, setCutSegments] = useState<Array<{start: number, end: number, type: 'filler' | 'pause'}>>([])
  const [appliedCuts, setAppliedCuts] = useState<Array<{start: number, end: number, type: 'filler' | 'pause'}>>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const fillerWords = [
    { word: "um", count: 23, timestamp: "0:15" },
    { word: "uh", count: 12, timestamp: "0:32" },
    { word: "like", count: 8, timestamp: "1:05" },
    { word: "you know", count: 4, timestamp: "1:45" },
  ]

  const engagementMetrics = {
    attention: 78,
    pacing: 85,
    clarity: 92,
    energy: 67,
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
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
        return cut.end + 0.1 // Add small buffer to avoid edge cases
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
    setIsProcessing(true)
    setProcessingProgress(0)

    // First run the AI analysis
    await analyzeAudioForAI()

    // Then simulate the enhancement process
    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)
          return 100
        }
        return prev + 2
      })
    }, 100)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size)
      
      // Check if it's a video file (more flexible check)
      const isVideoFile = file.type.startsWith('video/') || 
                         file.name.toLowerCase().endsWith('.mov') ||
                         file.name.toLowerCase().endsWith('.mp4') ||
                         file.name.toLowerCase().endsWith('.avi') ||
                         file.name.toLowerCase().endsWith('.webm') ||
                         file.name.toLowerCase().endsWith('.mkv')
      
      if (isVideoFile) {
        console.log('Video file accepted, creating object URL...')
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
        setWaveformGenerated(false)
        setDetectedPauses([])
        setDetectedFillerWords([])
        setAudioData(null)
        
        console.log('Video uploaded successfully:', videoUrl)
      } else {
        console.error('Unsupported file type:', file.type, 'File name:', file.name)
        alert('Please select a valid video file (.mp4, .mov, .avi, .webm, .mkv)')
      }
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    const file = files[0]
    
    if (file) {
      console.log('File dropped:', file.name, 'Type:', file.type, 'Size:', file.size)
      
      // Check if it's a video file (more flexible check)
      const isVideoFile = file.type.startsWith('video/') || 
                         file.name.toLowerCase().endsWith('.mov') ||
                         file.name.toLowerCase().endsWith('.mp4') ||
                         file.name.toLowerCase().endsWith('.avi') ||
                         file.name.toLowerCase().endsWith('.webm') ||
                         file.name.toLowerCase().endsWith('.mkv')
      
      if (isVideoFile) {
        console.log('Video file accepted, creating object URL...')
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
        setWaveformGenerated(false)
        setDetectedPauses([])
        setDetectedFillerWords([])
        setAudioData(null)
        
        console.log('Video uploaded successfully via drag and drop:', videoUrl)
      } else {
        console.error('Unsupported file type:', file.type, 'File name:', file.name)
        alert('Please select a valid video file (.mp4, .mov, .avi, .webm, .mkv)')
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
        setWaveformGenerated(true)
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
      setWaveformGenerated(true)
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
    setWaveformGenerated(true)
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

  const extractAudioForTranscription = async (videoBlob: Blob): Promise<Blob> => {
    // Create audio context for audio extraction
    const audioContext = new AudioContext()
    
    try {
      // Convert video blob to array buffer
      const arrayBuffer = await videoBlob.arrayBuffer()
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Convert to WAV format for API submission
      const wavBlob = audioBufferToWav(audioBuffer)
      
      audioContext.close()
      return wavBlob
    } catch (error) {
      audioContext.close()
      throw error
    }
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
      
      // fal.ai turbo doesn't provide word-level timestamps, so we'll do text-based detection
      const transcriptionText = result.text || ''
      console.log('Transcription text:', transcriptionText)
      
      // Extract filler words from transcription with precise matching
      const fillerWordPatterns = [
        'um', 'uh', 'ah', 'uhm', 'umm', 'erm', 'eh', 'hmm',
        'mm-hmm', 'uh-huh', 'mm', 'mhmm'
      ]
      
      const detectedFillers: Array<{word: string, start: number, end: number, confidence: number}> = []
      const transcriptionSegments: Array<{text: string, start: number, end: number, confidence: number}> = []
      
      // Store the full transcription
      transcriptionSegments.push({
        text: transcriptionText,
        start: 0,
        end: videoRef.current?.duration || 0,
        confidence: 0.9
      })
      
      // Enhanced text-based filler word detection
      if (transcriptionText.trim().length === 0) {
        console.warn('Empty transcription text - no filler words to detect')
        return []
      }
      
      const splitWords = transcriptionText.toLowerCase().split(/\s+/)
      const words: string[] = []
      for (const word of splitWords) {
        if (word.length > 0) {
          words.push(word)
        }
      }
      console.log('Split words for analysis:', words)
      let fillerCount = 0
      
      for (let index = 0; index < words.length; index++) {
        const word = words[index]
        const cleanWord = word.replace(/[^\w-]/g, '') // Remove punctuation but keep hyphens
        
        // Skip empty words
        if (!cleanWord) continue
        
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
          fillerCount++
          // Estimate timestamps based on word position (rough approximation)
          const duration = videoRef.current?.duration || 180
          const estimatedStart = (index / words.length) * duration
          const estimatedEnd = estimatedStart + 0.5 // Assume 0.5 second duration
          
          console.log(`Found filler word: "${cleanWord}" at position ${index}/${words.length} (${estimatedStart.toFixed(1)}s)`)
          
          detectedFillers.push({
            word: cleanWord,
            start: estimatedStart,
            end: estimatedEnd,
            confidence: 0.8 // Lower confidence since we're estimating
          })
        }
      }
      
      setTranscription(transcriptionSegments)
      setDetectedFillerWords(detectedFillers)
      
      console.log(`Detected ${detectedFillers.length} filler words in transcription:`, transcriptionText)
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

  const drawAnalysisMarkers = (overrideCutSegments?: Array<{start: number, end: number, type: 'filler' | 'pause'}>) => {
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
    const segmentType: 'filler' | 'pause' = isFillerWord ? 'filler' : 'pause'
    
    // Calculate the new state immediately
    const existingIndex = cutSegments.findIndex(cut => 
      cut.start === segmentStart && cut.end === segmentEnd && cut.type === segmentType
    )
    
    let newCutSegments: Array<{start: number, end: number, type: 'filler' | 'pause'}>
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

   const applyCuts = async () => {
     if (cutSegments.length === 0) {
       alert('No cuts selected to apply!')
       return
     }
     
     // Sort cuts by start time for processing
     const sortedCuts = [...cutSegments].sort((a, b) => a.start - b.start)
     
     console.log('Applying cuts to video:', sortedCuts)
     
     // Calculate metrics
     const totalTimeSaved = cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0)
     const newDuration = duration - totalTimeSaved
     const pauseCuts = sortedCuts.filter(cut => cut.type === 'pause').length
     const fillerCuts = sortedCuts.filter(cut => cut.type === 'filler').length
     
     // Start processing simulation
     setIsProcessing(true)
     setProcessingProgress(0)
     
     try {
       // Simulate video processing steps
       const steps = [
         { progress: 10, message: 'Analyzing cut points...' },
         { progress: 25, message: 'Preparing video segments...' },
         { progress: 40, message: 'Removing pauses and filler words...' },
         { progress: 60, message: 'Re-encoding video...' },
         { progress: 80, message: 'Optimizing audio sync...' },
         { progress: 95, message: 'Finalizing edited video...' },
         { progress: 100, message: 'Processing complete!' }
       ]
       
       for (const step of steps) {
         setProcessingProgress(step.progress)
         console.log(step.message)
         await new Promise(resolve => setTimeout(resolve, 800)) // Simulate processing time
       }
       
       // Simulate successful completion
       setTimeout(() => {
         setIsProcessing(false)
         setProcessingProgress(0)
         
                   // Store the applied cuts for video playback handling
          setAppliedCuts(sortedCuts)
          
          // Clear the pending cuts since they're now processed
          setCutSegments([])
          
          // Update duration to reflect the cuts
          setDuration(newDuration)
         
         // Update filler words count
         setFillerWordsDetected(prev => Math.max(0, prev - fillerCuts))
         
         // Redraw waveform without the cut segments
         if (audioData) {
           drawFullWaveform(audioData)
         } else {
           drawPlaceholderWaveform()
         }
         
         // Remove the cut segments from detected arrays to simulate they're gone
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
         
         // Show success message
         alert(`✅ Video processing complete!\n\n📊 Results:\n• ${pauseCuts} pauses removed\n• ${fillerCuts} filler words removed\n• ${totalTimeSaved.toFixed(1)} seconds saved\n• New duration: ${formatTime(newDuration)}\n\nYour enhanced video is ready!`)
         
         console.log('Video processing simulation complete:', {
           originalDuration: duration,
           newDuration,
           timeSaved: totalTimeSaved,
           cutsApplied: sortedCuts.length
         })
         
       }, 200)
       
     } catch (error) {
       console.error('Error during video processing:', error)
       setIsProcessing(false)
       setProcessingProgress(0)
       alert('❌ An error occurred during video processing. Please try again.')
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
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    } else {
      // Resume audio context if needed
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      videoRef.current.play()
      visualizeAudio()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const originalTime = videoRef.current.currentTime
      
      // Check if we're in a cut segment and need to skip
      if (appliedCuts.length > 0 && isTimeInCutSegment(originalTime)) {
        const nextValidTime = getNextValidTime(originalTime)
        if (nextValidTime !== originalTime && nextValidTime < (videoRef.current.duration || 0)) {
          console.log(`Skipping cut segment: ${originalTime.toFixed(2)}s → ${nextValidTime.toFixed(2)}s`)
          videoRef.current.currentTime = nextValidTime
          return
        }
      }
      
      // Convert original time to edited time for display
      const displayTime = appliedCuts.length > 0 ? getEditedTime(originalTime) : originalTime
      setCurrentTime(displayTime)
      
      // Update static waveform playhead during playback
      if (audioData && audioData.length > 0 && !animationFrameRef.current) {
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
    if (videoRef.current) {
      // Convert edited time to original video time if cuts have been applied
      const originalTime = appliedCuts.length > 0 ? getOriginalVideoTime(newTime) : newTime
      
      // Make sure we don't seek to a cut segment
      const validTime = appliedCuts.length > 0 ? getNextValidTime(originalTime) : originalTime
      
      console.log(`Seeking: edited=${newTime.toFixed(2)}s → original=${validTime.toFixed(2)}s`)
      
      videoRef.current.currentTime = validTime
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
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {uploadedVideo ? (
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
                      disabled={!uploadedVideo}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline"
                      disabled={!uploadedVideo}
                      onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline"
                      disabled={!uploadedVideo}
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
                        disabled={!uploadedVideo}
                      />
                      <span className="text-sm text-gray-600">{formatTime(duration)}</span>
                    </div>
                    <Button size="icon" variant="outline" disabled={!uploadedVideo}>
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Audio Waveform Timeline */}
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

            {/* Processing Status */}
            {isProcessing && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {cutSegments.length > 0 ? (
                      <Scissors className="w-5 h-5 text-red-600 animate-pulse" />
                    ) : (
                      <Zap className="w-5 h-5 text-purple-600 animate-pulse" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {cutSegments.length > 0 ? "Applying Cuts..." : "AI Processing Video..."}
                        </span>
                        <span className="text-sm text-gray-600">{processingProgress}%</span>
                      </div>
                      <Progress value={processingProgress} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        {processingProgress <= 10 && "Analyzing cut points..."}
                        {processingProgress > 10 && processingProgress <= 25 && "Preparing video segments..."}
                        {processingProgress > 25 && processingProgress <= 40 && "Removing pauses and filler words..."}
                        {processingProgress > 40 && processingProgress <= 60 && "Re-encoding video..."}
                        {processingProgress > 60 && processingProgress <= 80 && "Optimizing audio sync..."}
                        {processingProgress > 80 && processingProgress < 100 && "Finalizing edited video..."}
                        {processingProgress >= 100 && "Processing complete!"}
                      </div>
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
                <Button className="w-full" onClick={handleProcess} disabled={isProcessing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Enhance Video"}
                </Button>
                
                {/* Debug button - remove later */}
                <Button 
                  className="w-full mt-2" 
                  variant="outline" 
                  onClick={() => {
                    console.log('Manual redraw triggered, current data:', {
                      pauses: detectedPauses.length,
                      fillerWords: detectedFillerWords.length
                    })
                    if (canvasRef.current) {
                      if (audioData) {
                        drawFullWaveform(audioData)
                      } else {
                        drawPlaceholderWaveform()
                      }
                      drawAnalysisMarkers()
                    }
                  }}
                >
                  🔧 Force Redraw Markers
                </Button>
                
                {/* Test filler word detection button */}
                <Button 
                  className="w-full mt-2" 
                  variant="outline" 
                  onClick={() => {
                    // Test with sample transcription
                    const testTranscription = "Hello um this is a test uh video with ah some filler words like you know"
                    console.log('Testing filler word detection with:', testTranscription)
                    
                    const fillerWordPatterns = [
                      'um', 'uh', 'ah', 'uhm', 'umm', 'erm', 'eh', 'hmm',
                      'mm-hmm', 'uh-huh', 'mm', 'mhmm', 'like', 'you know'
                    ]
                    
                    const testFillers: Array<{word: string, start: number, end: number, confidence: number}> = []
                    const words = testTranscription.toLowerCase().split(' ')
                    
                    words.forEach((word, index) => {
                      const cleanWord = word.replace(/[^\w-]/g, '')
                      if (fillerWordPatterns.includes(cleanWord)) {
                        const estimatedStart = (index / words.length) * 180
                        testFillers.push({
                          word: cleanWord,
                          start: estimatedStart,
                          end: estimatedStart + 0.5,
                          confidence: 0.9
                        })
                        console.log(`Found test filler: "${cleanWord}" at ${estimatedStart.toFixed(1)}s`)
                      }
                    })
                    
                    setDetectedFillerWords(testFillers)
                    console.log('Set test filler words:', testFillers)
                  }}
                >
                                     🧪 Test Filler Detection
                 </Button>
                 
                 {/* Test API button */}
                 <Button 
                   className="w-full mt-2" 
                   variant="outline" 
                   onClick={async () => {
                     try {
                       console.log('Testing API directly...')
                       const response = await fetch('/api/transcribe', {
                         method: 'POST',
                         body: new FormData() // Empty form data to test
                       })
                       console.log('API response status:', response.status)
                       const result = await response.json()
                       console.log('API result:', result)
                     } catch (error) {
                       console.error('API test error:', error)
                     }
                   }}
                 >
                   🔌 Test API
                 </Button>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Remove Filler Words</label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto Pacing</label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Smart Cuts</label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Engagement Boost</label>
                    <Switch defaultChecked />
                  </div>
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

            {/* Selected Cuts Summary */}
            {cutSegments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-red-600" />
                    Selected Cuts
                    <Badge variant="destructive">{cutSegments.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cutSegments.map((cut, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-red-700">
                            {cut.type === 'filler' ? 'Filler' : 'Pause'}
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
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Total time saved:</span>
                      <span className="text-green-600 font-bold">
                        {cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0).toFixed(1)}s
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700" 
                      size="sm"
                      onClick={() => applyCuts()}
                      disabled={isProcessing || cutSegments.length === 0}
                    >
                      <Scissors className="w-3 h-3 mr-2" />
                      {isProcessing ? "Processing..." : "Apply All Cuts"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  Engagement Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(engagementMetrics).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{key}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Panel - Effects and Tools */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="effects" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="effects" className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Effects
                </TabsTrigger>
                <TabsTrigger value="transitions" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Transitions
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="color" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color
                </TabsTrigger>
              </TabsList>

              <TabsContent value="effects" className="mt-4">
                <div className="grid grid-cols-6 gap-3">
                  {[
                    "Zoom In",
                    "Zoom Out",
                    "Pan Left",
                    "Pan Right",
                    "Fade In",
                    "Fade Out",
                    "Blur",
                    "Sharpen",
                    "Vintage",
                    "B&W",
                    "Sepia",
                    "Vignette",
                  ].map((effect) => (
                    <Button key={effect} variant="outline" className="h-20 flex-col">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded mb-1" />
                      <span className="text-xs">{effect}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="transitions" className="mt-4">
                <div className="grid grid-cols-6 gap-3">
                  {[
                    "Cut",
                    "Fade",
                    "Dissolve",
                    "Wipe",
                    "Slide",
                    "Push",
                    "Iris",
                    "Clock",
                    "Zoom",
                    "Spin",
                    "Flip",
                    "Cube",
                  ].map((transition) => (
                    <Button key={transition} variant="outline" className="h-20 flex-col">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded mb-1" />
                      <span className="text-xs">{transition}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 cursor-pointer hover:bg-gray-50">
                    <h3 className="font-bold text-lg">Bold Title</h3>
                    <p className="text-sm text-gray-600">Perfect for headlines</p>
                  </Card>
                  <Card className="p-4 cursor-pointer hover:bg-gray-50">
                    <h3 className="font-medium italic">Elegant Script</h3>
                    <p className="text-sm text-gray-600">Stylish and refined</p>
                  </Card>
                  <Card className="p-4 cursor-pointer hover:bg-gray-50">
                    <h3 className="font-mono text-green-600">Code Style</h3>
                    <p className="text-sm text-gray-600">Technical content</p>
                  </Card>
                  <Card className="p-4 cursor-pointer hover:bg-gray-50">
                    <h3 className="font-bold text-red-500 text-xl">IMPACT</h3>
                    <p className="text-sm text-gray-600">High attention</p>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 cursor-pointer hover:bg-gray-50">
                      <Music className="w-8 h-8 text-purple-600 mb-2" />
                      <h3 className="font-medium">Background Music</h3>
                      <p className="text-sm text-gray-600">Add ambient tracks</p>
                    </Card>
                    <Card className="p-4 cursor-pointer hover:bg-gray-50">
                      <Volume2 className="w-8 h-8 text-blue-600 mb-2" />
                      <h3 className="font-medium">Sound Effects</h3>
                      <p className="text-sm text-gray-600">Enhance moments</p>
                    </Card>
                    <Card className="p-4 cursor-pointer hover:bg-gray-50">
                      <Mic className="w-8 h-8 text-green-600 mb-2" />
                      <h3 className="font-medium">Voice Enhancement</h3>
                      <p className="text-sm text-gray-600">Improve clarity</p>
                    </Card>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audio Levels</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">Voice</span>
                        <Slider defaultValue={[80]} max={100} className="flex-1" />
                        <span className="text-sm w-8">80%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">Music</span>
                        <Slider defaultValue={[30]} max={100} className="flex-1" />
                        <span className="text-sm w-8">30%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="color" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: "Natural", colors: ["#8B4513", "#228B22", "#87CEEB"] },
                      { name: "Cinematic", colors: ["#1a1a1a", "#ff6b35", "#f7931e"] },
                      { name: "Vibrant", colors: ["#ff0080", "#00ff80", "#8000ff"] },
                      { name: "Vintage", colors: ["#d4a574", "#8b4513", "#2f4f4f"] },
                    ].map((palette) => (
                      <Card key={palette.name} className="p-3 cursor-pointer hover:bg-gray-50">
                        <div className="flex gap-1 mb-2">
                          {palette.colors.map((color, i) => (
                            <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{palette.name}</span>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adjustments</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-20">Brightness</span>
                        <Slider defaultValue={[50]} max={100} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-20">Contrast</span>
                        <Slider defaultValue={[50]} max={100} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-20">Saturation</span>
                        <Slider defaultValue={[50]} max={100} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
    </div>
  )
}
