# AI Video Editor

A modern, AI-powered video editing application built with Next.js, React, and TypeScript. Remove filler words, enhance engagement, and create professional content automatically.

## Features

- **AI-Powered Enhancement**: Automatically detect and remove filler words
- **Smart Video Analysis**: Real-time engagement metrics and pacing analysis
- **Professional Effects**: Video effects, transitions, text overlays, and color grading
- **Multi-language Support**: Support for 9 languages
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui
- **Export Options**: Multiple resolution options (4K, 1080p, 720p, 480p)

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (built on Radix UI)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-video-editor
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to [Vercel](https://vercel.com)
3. Vercel will automatically detect the Next.js project and deploy it
4. Your app will be available at `https://your-project-name.vercel.app`

### Manual Deployment

```bash
npm run build
npm start
```

## Project Structure

```
ai-video-editor/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ai-video-editor.tsx # Main video editor component
├── lib/
│   └── utils.ts           # Utility functions
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 