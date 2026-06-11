# UniMate — Frontend

React single-page application for the UniMate platform.

## Prerequisites
- Node.js 18+
- npm 9+

## Setup

```bash
cd client
npm install
```

## Environment Variables

Create a `.env` file in the `client/` directory:

```
REACT_APP_API_URL=http://localhost:4000
```

## Running the App

```bash
npm start
```

Opens at http://localhost:3000. Requires the backend server running at port 4000.

## Running Tests

```bash
# Watch mode (development)
npm test

# Run all tests once with coverage
CI=true npm test -- --watchAll=false --forceExit --coverage

# Generate HTML test report
CI=true npm test -- --watchAll=false --forceExit --reporters=default --reporters=jest-html-reporters
open jest_html_reporters.html

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## Test Results
- 15 test suites, 198 tests, 0 failures
- 80.23% statement coverage, 82.45% line coverage

## Project Structure

```
client/src/
├── pages/          # Page components
│   ├── SignInPage.js
│   ├── DashboardPage.js
│   ├── CollaboratePage.js
│   ├── DiscussionsPage.js
│   ├── ReviewsPage.js
│   ├── ProfilePage.js
│   ├── OnboardingPage.js
│   ├── CollabGroupChatPage.js
│   └── GoogleAuthCallback.js
├── components/
│   ├── auth/       # AuthCard, GoogleSignInButton, OnboardingCard, OnboardingStepper
│   └── shared/     # ProtectedRoute (auth guard for protected pages)
├── hooks/          # useDashboard.js, useReviews.js (Axios data-fetching hooks)
├── context/        # AuthContext.js (global JWT state via React Context API)
├── __tests__/      # 15 Jest test files covering unit and accessibility smoke tests
└── apiUrl.js       # Helper to resolve API base URL from environment
```
