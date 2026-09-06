# GD-Library Web

A web version of the GD-Library e-book platform built with SvelteKit and Firebase.

## Features

- User authentication (Login/Register)
- Browse and search digital books
- Personal book shelves
- Reading history tracking
- Responsive design

## Tech Stack

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Backend**: Firebase (Authentication, Firestore)
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Firebase Configuration

Replace the Firebase config in `src/lib/firebase.ts` with your own Firebase project credentials from the Firebase Console.

## Deployment

This project is configured for automatic deployment to Vercel. Connect your GitHub repository to Vercel to enable automatic deployments.

## License

MIT
