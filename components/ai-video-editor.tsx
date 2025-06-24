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

  const handleProcess = () => {
    setIsProcessing(true)
    setProcessingProgress(0)

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
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file)
      setUploadedVideo(videoUrl)
      
      // Reset states
      setCurrentTime(0)
      setIsPlaying(false)
      setAudioEnabled(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    const file = files[0]
    
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file)
      setUploadedVideo(videoUrl)
      
      // Reset states
      setCurrentTime(0)
      setIsPlaying(false)
      setAudioEnabled(false)
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
      
      // Fetch the video file as blob
      const response = await fetch(uploadedVideo)
      const blob = await response.blob()
      
      // Create a new audio context for analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer()
      
      // Try to decode audio from the video file
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const channelData = audioBuffer.getChannelData(0) // Get first channel
        
        console.log('Successfully extracted audio data:', channelData.length, 'samples')
        
        // Store the full audio data
        setAudioData(channelData)
        setWaveformGenerated(true)
        setAudioEnabled(true)
        
        // Draw the complete waveform
        drawFullWaveform(channelData)
        
        // Close this temporary audio context
        audioContext.close()
        
      } catch (decodeError) {
        console.log('Direct audio decode failed, using alternative method...')
        
        // Fallback: Setup real-time analysis for when user enables audio
        const source = audioContext.createMediaElementSource(videoRef.current)
        const analyser = audioContext.createAnalyser()
        
        analyser.fftSize = 2048
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        
        audioContextRef.current = audioContext
        analyzerRef.current = analyser
        
        // Draw placeholder waveform
        drawPlaceholderWaveform()
        setAudioEnabled(false) // User needs to enable
        setWaveformGenerated(true)
      }
      
    } catch (error) {
      console.error('Error generating waveform:', error)
      drawPlaceholderWaveform()
      setAudioEnabled(false)
      setWaveformGenerated(false)
    }
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



  const enableAudioVisualization = async () => {
    if (videoRef.current && uploadedVideo && !audioEnabled) {
      // If we already have static waveform, just enable real-time playback visualization
      if (audioData) {
        setAudioEnabled(true)
        // Setup real-time audio context for playback
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const source = audioContext.createMediaElementSource(videoRef.current)
          const analyser = audioContext.createAnalyser()
          
          analyser.fftSize = 2048
          source.connect(analyser)
          analyser.connect(audioContext.destination)
          
          audioContextRef.current = audioContext
          analyzerRef.current = analyser
        } catch (error) {
          console.log('Audio context setup for playback failed:', error)
        }
      } else {
        // Try to generate waveform again
        await generateWaveform()
      }
    }
  }

  const visualizeAudio = () => {
    if (!analyzerRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const analyzer = analyzerRef.current
    
    if (!ctx) return
    
    const bufferLength = analyzer.fftSize
    const dataArray = new Uint8Array(bufferLength)
    
    const draw = () => {
      // Get time domain data for waveform
      analyzer.getByteTimeDomainData(dataArray)
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Set up waveform styling
      ctx.lineWidth = 2
      ctx.strokeStyle = '#3b82f6'
      ctx.beginPath()
      
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      
      // Draw waveform
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = v * canvas.height / 2
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      ctx.stroke()
      
      // Add center line
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(draw)
    }
    
    draw()
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
    }
  }

  const handleLoadedMetadata = async () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      console.log('Video loaded, duration:', videoRef.current.duration)
      
      // Setup audio visualization for the video
      if (uploadedVideo) {
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
                          accept="video/*"
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
                          className="w-full h-full bg-gray-900 rounded"
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

            {/* Filler Words Detected */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-red-500" />
                  Filler Words
                  <Badge variant="destructive">{fillerWordsDetected}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fillerWords.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">&ldquo;{item.word}&rdquo;</span>
                        <Badge variant="outline">{item.count}x</Badge>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Scissors className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
