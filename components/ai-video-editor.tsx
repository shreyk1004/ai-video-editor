"use client"

import { useState } from "react"
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
                <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">Drop your video here or click to upload</p>
                      <p className="text-sm opacity-75">Supports MP4, MOV, AVI up to 2GB</p>
                      <Button className="mt-4" variant="secondary">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Video Controls */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Button size="icon" variant="outline" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="outline">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                      <Slider
                        value={[currentTime]}
                        max={duration}
                        step={1}
                        className="flex-1"
                        onValueChange={(value) => setCurrentTime(value[0])}
                      />
                      <span className="text-sm text-gray-600">{formatTime(duration)}</span>
                    </div>
                    <Button size="icon" variant="outline">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Waveform Timeline */}
                  <div className="h-16 bg-gray-100 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-end gap-1 h-12">
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div key={i} className="bg-blue-400 w-1" style={{ height: `${Math.random() * 100}%` }} />
                        ))}
                      </div>
                    </div>
                    {/* Filler word markers */}
                    <div className="absolute top-0 w-2 h-2 bg-red-500 rounded-full" style={{ left: "15%" }} />
                    <div className="absolute top-0 w-2 h-2 bg-red-500 rounded-full" style={{ left: "32%" }} />
                    <div className="absolute top-0 w-2 h-2 bg-red-500 rounded-full" style={{ left: "65%" }} />
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
