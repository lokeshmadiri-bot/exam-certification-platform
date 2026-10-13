# OryFolks Certify — React Client Portal

Production-ready React application managing candidate examination flows, proctoring controls, and administrator oversight reports.

## Technology Stack

* React JS (Vite bundle runner)
* Tailwind CSS
* Axios (API connection)
* React Router DOM
* Lucide React

## Configuration

Set the API endpoint inside `.env` (or in Vercel project environment variables):
```env
VITE_API_URL=http://localhost:8080/api
VITE_API_HOST=http://localhost:8080
```
*(For production, e.g. `https://exam-certification-platform.onrender.com/api` and `https://exam-certification-platform.onrender.com`)*


## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Build for production compilation:
   ```bash
   npm run build
   ```
