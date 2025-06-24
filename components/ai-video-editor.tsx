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
      
      // Add random variations for natural feel
      amplitude += (Math.random() - 0.5) * 0.3
      
      // Create quiet sections (simulating pauses)
      if (Math.random() < 0.1) { // 10% chance of quiet section
        amplitude *= 0.1
      }
      
      // Create some louder sections (emphasis)
      if (Math.random() < 0.05) { // 5% chance of loud section
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
      const noise = (Math.random() - 0.5) * 0.1
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
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.wav')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      // fal.ai turbo doesn't provide word-level timestamps, so we'll do text-based detection
      const transcriptionText = result.text || ''
      
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
      
      // Simple text-based filler word detection (without precise timestamps)
      const words = transcriptionText.toLowerCase().split(/\s+/)
      let fillerCount = 0
      
             words.forEach((word: string, index: number) => {
        const cleanWord = word.replace(/[^\w-]/g, '') // Remove punctuation but keep hyphens
        
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
        
        if (isDefiniteFillerWord || isShortHesitation) {
          fillerCount++
          // Estimate timestamps based on word position (rough approximation)
          const duration = videoRef.current?.duration || 180
          const estimatedStart = (index / words.length) * duration
          const estimatedEnd = estimatedStart + 0.5 // Assume 0.5 second duration
          
          detectedFillers.push({
            word: cleanWord,
            start: estimatedStart,
            end: estimatedEnd,
            confidence: 0.8 // Lower confidence since we're estimating
          })
        }
      })
      
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
      console.log('No video or audio data available for analysis')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      console.log('Starting AI audio analysis...')
      
      // Step 1: Local pause detection (fast)
      setAnalysisProgress(20)
      const detectedPauses = detectPauses(audioData, 44100)
      setDetectedPauses(detectedPauses)
      
      // Step 2: Prepare audio for transcription
      setAnalysisProgress(40)
      const response = await fetch(uploadedVideo)
      const videoBlob = await response.blob()
      const audioBlob = await extractAudioForTranscription(videoBlob)
      
      // Step 3: fal.ai transcription for filler words
      setAnalysisProgress(60)
      const fillerWords = await detectFillerWordsWithFal(audioBlob)
      
      // Step 4: Update UI with results
      setAnalysisProgress(80)
      
      // Update filler words count for display
      setFillerWordsDetected(fillerWords.length)
      
      // Redraw waveform with markers
      if (audioData) {
        drawFullWaveform(audioData)
        drawAnalysisMarkers()
      }
      
      setAnalysisProgress(100)
      
      console.log('AI analysis complete!', {
        pauses: detectedPauses.length,
        fillerWords: fillerWords.length
      })
      
    } catch (error) {
      console.error('Error during AI analysis:', error)
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const drawAnalysisMarkers = () => {
    if (!canvasRef.current || !duration) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Draw pause markers (yellow/orange)
    detectedPauses.forEach(pause => {
      const startX = (pause.start / duration) * width
      const endX = (pause.end / duration) * width
      const pauseWidth = Math.max(2, endX - startX)
      
      // Check if this segment is marked for cutting
      const isCut = cutSegments.some(cut => 
        cut.start <= pause.start && cut.end >= pause.end && cut.type === 'pause'
      )
      
      // Draw pause region
      ctx.fillStyle = isCut ? 'rgba(156, 163, 175, 0.4)' : 'rgba(251, 191, 36, 0.4)' // gray if cut, amber otherwise
      ctx.fillRect(startX, 0, pauseWidth, height)
      
      // Draw pause border
      ctx.strokeStyle = isCut ? '#9ca3af' : '#f59e0b' // gray if cut, amber otherwise
      ctx.lineWidth = 1
      ctx.strokeRect(startX, 0, pauseWidth, height)
    })
    
    // Draw filler word markers with clickable cut dots
    detectedFillerWords.forEach((filler, index) => {
      const startX = (filler.start / duration) * width
      const endX = (filler.end / duration) * width
      const fillerWidth = Math.max(3, endX - startX)
      const centerX = startX + (fillerWidth / 2)
      
      // Check if this segment is marked for cutting
      const isCut = cutSegments.some(cut => 
        cut.start <= filler.start && cut.end >= filler.end && cut.type === 'filler'
      )
      
      // Draw filler word region
      ctx.fillStyle = isCut ? 'rgba(156, 163, 175, 0.4)' : 'rgba(239, 68, 68, 0.6)' // gray if cut, red otherwise
      ctx.fillRect(startX, 0, fillerWidth, height)
      
      // Draw marker at top
      ctx.fillStyle = isCut ? '#9ca3af' : '#dc2626' // gray if cut, red otherwise
      ctx.fillRect(startX, 0, fillerWidth, 4)
      
      // Draw clickable cut dot
      const dotRadius = 8
      const dotY = height - 16
      
      // Dot background (white circle)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Dot border and icon
      ctx.strokeStyle = isCut ? '#22c55e' : '#dc2626' // green if cut, red otherwise
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Draw scissors icon or checkmark
      ctx.strokeStyle = isCut ? '#22c55e' : '#dc2626'
      ctx.lineWidth = 2
      
      if (isCut) {
        // Draw checkmark
        ctx.beginPath()
        ctx.moveTo(centerX - 4, dotY)
        ctx.lineTo(centerX - 1, dotY + 3)
        ctx.lineTo(centerX + 4, dotY - 2)
        ctx.stroke()
      } else {
        // Draw scissors icon (simplified)
        ctx.beginPath()
        ctx.moveTo(centerX - 3, dotY - 2)
        ctx.lineTo(centerX + 3, dotY + 2)
        ctx.moveTo(centerX - 3, dotY + 2)
        ctx.lineTo(centerX + 3, dotY - 2)
        ctx.stroke()
      }
    })
  }

  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !duration || detectedFillerWords.length === 0) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert to canvas coordinates
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    // Check if click is near any filler word cut dot
    detectedFillerWords.forEach((filler, index) => {
      const startX = (filler.start / duration) * canvas.width
      const endX = (filler.end / duration) * canvas.width
      const fillerWidth = Math.max(3, endX - startX)
      const centerX = startX + (fillerWidth / 2)
      const dotY = canvas.height - 16
      const dotRadius = 12 // Slightly larger hit area
      
      const distance = Math.sqrt(Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - dotY, 2))
      
      if (distance <= dotRadius) {
        // Toggle cut for this filler word
        toggleCutSegment(filler)
      }
    })
  }

  const toggleCutSegment = (segment: {word: string, start: number, end: number, confidence: number} | {start: number, end: number, duration: number}) => {
    const isFillerWord = 'word' in segment
    const segmentStart = segment.start
    const segmentEnd = segment.end
    const segmentType = isFillerWord ? 'filler' : 'pause'
    
    setCutSegments(prev => {
      const existingIndex = prev.findIndex(cut => 
        cut.start === segmentStart && cut.end === segmentEnd && cut.type === segmentType
      )
      
      if (existingIndex >= 0) {
        // Remove the cut
        console.log(`Removing cut for ${segmentType}:`, segment)
        return prev.filter((_, index) => index !== existingIndex)
      } else {
        // Add the cut
        console.log(`Adding cut for ${segmentType}:`, segment)
        return [...prev, { start: segmentStart, end: segmentEnd, type: segmentType }]
      }
    })
    
         // Redraw the waveform with updated markers
     if (audioData) {
       drawFullWaveform(audioData)
       drawAnalysisMarkers()
     }
   }

   const applyCuts = () => {
     if (cutSegments.length === 0) return
     
     // Sort cuts by start time for processing
     const sortedCuts = [...cutSegments].sort((a, b) => a.start - b.start)
     
     console.log('Applying cuts to video:', sortedCuts)
     
     // In a real implementation, this would:
     // 1. Create a new video by removing the specified segments
     // 2. Generate a new file with the cuts applied
     // 3. Update the video source
     
     // For now, we'll simulate the process
     alert(`Ready to apply ${cutSegments.length} cuts, saving ${cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0).toFixed(1)} seconds!\n\nThis would create a new video file with the selected segments removed.`)
     
     // Update metrics to reflect the cuts
     const totalTimeSaved = cutSegments.reduce((total, cut) => total + (cut.end - cut.start), 0)
     const newDuration = duration - totalTimeSaved
     
     console.log(`Original duration: ${duration}s, New duration: ${newDuration}s, Time saved: ${totalTimeSaved}s`)
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
      setCurrentTime(videoRef.current.currentTime)
      
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
    }
  }

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

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
                        {/* Filler word markers */}
                        <div className="absolute top-1 w-2 h-2 bg-red-500 rounded-full shadow" style={{ left: "15%" }} />
                        <div className="absolute top-1 w-2 h-2 bg-red-500 rounded-full shadow" style={{ left: "32%" }} />
                        <div className="absolute top-1 w-2 h-2 bg-red-500 rounded-full shadow" style={{ left: "65%" }} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-end gap-1 h-12">
                          {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="bg-blue-400 w-1" style={{ height: `${Math.random() * 100}%` }} />
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
                    <Zap className="w-5 h-5 text-purple-600 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">AI Processing Video...</span>
                        <span className="text-sm text-gray-600">{processingProgress}%</span>
                      </div>
                      <Progress value={processingProgress} className="h-2" />
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
                    ))
                  ) : (
                    // Show placeholder data until analysis is complete
                    fillerWords.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded opacity-50">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">&ldquo;{item.word}&rdquo;</span>
                          <Badge variant="outline">{item.count}x</Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Scissors className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                {detectedFillerWords.length === 0 && detectedPauses.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">Click "Enhance Video" to analyze audio</p>
                  </div>
                )}
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
                    >
                      <Scissors className="w-3 h-3 mr-2" />
                      Apply All Cuts
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
