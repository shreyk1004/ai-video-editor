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

    console.log('Audio file details:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // Check file size limit (fal.ai may have limits)
    const maxSize = 25 * 1024 * 1024 // 25MB limit
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: `Audio file too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: 25MB` },
        { status: 413 }
      )
    }

    // Configure fal.ai client with API key
    fal.config({
      credentials: process.env.FAL_API_KEY
    })

    console.log('Uploading audio file using fal.ai client...')
    
    // Convert File to the format expected by fal.ai client
    const audioArrayBuffer = await audioFile.arrayBuffer()
    const audioFile2 = new File([audioArrayBuffer], audioFile.name, { type: audioFile.type })
    
    // Use fal.ai client to upload file and get URL
    const audioUrl = await fal.storage.upload(audioFile2)
    console.log('Audio uploaded successfully:', audioUrl)

    console.log('Calling Whisper API with uploaded file URL...')
    
    // Use fal.ai client to call the Whisper API
    const whisperResult = await fal.subscribe('fal-ai/whisper', {
      input: {
        audio_url: audioUrl
      }
    })

    console.log('Whisper transcription completed:', whisperResult.data)
    
    // Transform fal.ai response to match expected format for compatibility
    const transformedResult = {
      text: whisperResult.data.text || '',
      // fal.ai Whisper provides chunks with timestamps if needed
      words: whisperResult.data.chunks || null
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