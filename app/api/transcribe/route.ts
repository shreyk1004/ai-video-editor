import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export async function POST(request: NextRequest) {
  try {
    // Check if FAL API key is configured
    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      )
    }

    // Get the form data from the request
    const formData = await request.formData()
    const audioFile = formData.get('file') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Enhanced file type detection and logging
    const getFileInfo = (file: File) => {
      const fileName = file.name.toLowerCase()
      const fileType = file.type.toLowerCase()
      
      const supportedFormats = {
        audio: ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg'],
        video: ['.mp4', '.mov', '.webm', '.avi', '.mkv']
      }
      
      const isAudio = fileType.startsWith('audio/') || 
                     supportedFormats.audio.some(ext => fileName.endsWith(ext))
      const isVideo = fileType.startsWith('video/') || 
                     supportedFormats.video.some(ext => fileName.endsWith(ext))
      
      return {
        name: file.name,
        size: file.size,
        sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        type: file.type,
        isAudio,
        isVideo,
        isSupported: isAudio || isVideo
      }
    }

    const fileInfo = getFileInfo(audioFile)
    console.log('📁 Transcription file details:', fileInfo)

    // Check if file type is supported
    if (!fileInfo.isSupported) {
      return NextResponse.json(
        { error: `Unsupported file format: ${audioFile.type}. Please upload audio (WAV, MP3, M4A) or video (MP4, MOV, WebM) files.` },
        { status: 400 }
      )
    }

    // Check file size limit (fal.ai has limits)
    const maxSize = 25 * 1024 * 1024 // 25MB limit
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${fileInfo.sizeFormatted}. Maximum allowed: 25MB` },
        { status: 413 }
      )
    }

    // Log compatibility info for video files
    if (fileInfo.isVideo) {
      const videoCompatibility = {
        '.mp4': 'Excellent - Best compatibility',
        '.webm': 'Good - Modern browsers support',
        '.mov': 'Variable - May need codec checking',
        '.avi': 'Limited - Older format, codec dependent',
        '.mkv': 'Limited - Container format, codec dependent'
      }
      
      const extension = audioFile.name.toLowerCase().slice(audioFile.name.lastIndexOf('.'))
      const compatibility = videoCompatibility[extension as keyof typeof videoCompatibility] || 'Unknown'
      console.log(`🎥 Video format compatibility: ${compatibility}`)
    }

    // Configure fal.ai client with API key
    fal.config({
      credentials: process.env.FAL_API_KEY
    })

    console.log(`📤 Uploading ${fileInfo.isVideo ? 'video' : 'audio'} file using fal.ai client...`)
    
    // Log what we're sending to FAL for debugging
    if (fileInfo.isVideo) {
      console.log('🎬 Video file being sent to FAL Whisper (direct video processing)')
      console.log('💡 FAL will extract audio internally - often better quality than browser extraction')
    } else {
      console.log('🎵 Audio file being sent to FAL Whisper')
      if (audioFile.type === 'audio/wav') {
        console.log('📊 WAV format detected - check if high-quality (24-bit preferred)')
      } else if (audioFile.type === 'audio/mpeg' || audioFile.name.toLowerCase().endsWith('.mp3')) {
        console.log('🎯 MP3 format detected - excellent for transcription quality')
      }
    }
    
    // Convert File to the format expected by fal.ai client
    const audioArrayBuffer = await audioFile.arrayBuffer()
    const audioFile2 = new File([audioArrayBuffer], audioFile.name, { type: audioFile.type })
    
    // Use fal.ai client to upload file and get URL
    const audioUrl = await fal.storage.upload(audioFile2)
    console.log('✅ File uploaded successfully to fal.ai:', audioUrl)
    console.log(`📏 Uploaded file size: ${fileInfo.sizeFormatted}`)

    console.log('🎯 Calling Whisper API with uploaded file URL...')
    
    // Enhanced Whisper API configuration for better accuracy
    const whisperConfig = {
      input: {
        audio_url: audioUrl,
        task: "transcribe" as const,
        chunk_level: "word" as const, // Word-level timestamps for precision
        version: "3" as const, // Use latest Whisper v3 for best accuracy
        batch_size: 8,
        // Enhanced parameters for better video file handling
        ...(fileInfo.isVideo && {
          // Video-specific optimizations
          audio_start_time: 0,
          audio_end_time: null, // Process entire audio track
        })
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          const logs = update.logs.map((log: any) => log.message)
          logs.forEach((log: any) => console.log('🔄 Whisper progress:', log))
        }
      },
    }

    console.log('⚙️ Whisper configuration:', {
      task: whisperConfig.input.task,
      chunkLevel: whisperConfig.input.chunk_level,
      version: whisperConfig.input.version,
      fileType: fileInfo.isVideo ? 'video' : 'audio'
    })
    
    // Use fal.ai client to call the Whisper API
    const whisperResult = await fal.subscribe('fal-ai/whisper', whisperConfig)

    // Enhanced result logging and validation
    console.log('✅ Whisper API completed successfully')
    console.log('📊 Transcription stats:', {
      textLength: whisperResult.data.text?.length || 0,
      chunksCount: whisperResult.data.chunks?.length || 0,
      hasWordTimestamps: !!(whisperResult.data.chunks && whisperResult.data.chunks.length > 0)
    })
    
    // Enhanced MP4 result analysis
    if (fileInfo.isVideo && audioFile.name.toLowerCase().endsWith('.mp4')) {
      console.log('🎬 MP4 TRANSCRIPTION RESULT ANALYSIS:')
      const hasTranscript = !!(whisperResult.data.text && whisperResult.data.text.length > 0)
      const hasWordData = !!(whisperResult.data.chunks && whisperResult.data.chunks.length > 0)
      
      if (!hasTranscript && !hasWordData) {
        console.error('❌ MP4 TRANSCRIPTION FAILURE: No audio extracted')
        console.error('🔍 Possible MP4 issues:')
        console.error('  - MP4 contains no audio track')
        console.error('  - MP4 audio codec not supported by FAL Whisper')
        console.error('  - MP4 file corrupted or incomplete')
        console.error('  - Audio track is silent/empty')
      } else if (hasTranscript && !hasWordData) {
        console.warn('⚠️ MP4 PARTIAL SUCCESS: Text but no word timestamps')
        console.warn('💡 This may cause timestamp issues in the editor')
      } else if (hasWordData) {
                 console.log('✅ MP4 FULL SUCCESS: Text and word timestamps extracted')
         console.log(`📊 Word timing data: ${whisperResult.data.chunks?.length || 0} words with timestamps`)
      }
    }
    
    // Log first few chunks for debugging
    if (whisperResult.data.chunks && whisperResult.data.chunks.length > 0) {
      console.log('🔍 Sample word chunks (first 3):')
      whisperResult.data.chunks.slice(0, 3).forEach((chunk: any, index: number) => {
        console.log(`  ${index + 1}:`, {
          text: chunk.text,
          timestamp: chunk.timestamp,
          ...(chunk.speaker && { speaker: chunk.speaker })
        })
      })
    }
    
    // Transform fal.ai response to match expected format for compatibility
    const transformedResult = {
      text: whisperResult.data.text || '',
      // fal.ai Whisper provides chunks with timestamps if needed
      words: whisperResult.data.chunks || null,
      // Additional metadata for debugging
      metadata: {
        originalFileType: audioFile.type,
        fileName: audioFile.name,
        fileSize: fileInfo.sizeFormatted,
        isVideo: fileInfo.isVideo,
        processingTime: Date.now() // Could track actual processing time if needed
      }
    }
    
    return NextResponse.json(transformedResult)

  } catch (error) {
    console.error('Transcription API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 