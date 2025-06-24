import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if FAL API key is configured
    if (!process.env.FAL_KEY) {
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

    // Convert the audio file to base64 for fal.ai
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = audioFile.type || 'audio/wav'
    const dataUrl = `data:${mimeType};base64,${base64Audio}`

    // Call fal.ai speech-to-text/turbo API
    const response = await fetch('https://fal.run/fal-ai/speech-to-text/turbo', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_path: dataUrl
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('fal.ai API error:', response.status, errorText)
      return NextResponse.json(
        { error: `fal.ai API error: ${response.status}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Transform fal.ai response to match OpenAI Whisper format for compatibility
    const transformedResult = {
      text: result.output || '',
      // Note: fal.ai turbo doesn't provide word-level timestamps like Whisper
      // We'll need to handle this differently in the frontend
      words: null
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