# Bookly

Bookly is a full-stack web application designed for discovering, rating, and organizing books. It leverages the Open Library API for comprehensive book data and uses a local SQLite database to store user-specific information like profiles, ratings, and favorites.

The application consists of a .NET 9 Web API backend that serves data and a modern React/TypeScript frontend built with Vite.

## Features

-   **Book Discovery:** Search for books by title, author, or subject. Browse by popular genres or see what's currently trending.
-   **Multi-User Profiles:** Create multiple user profiles, each with a customizable avatar and color. Profiles can be secured with a 4-digit PIN.
-   **Personal Library:**
    -   Rate books on a 5-star scale.
    -   Write and save personal reviews.
    -   Mark books as favorites for easy access.
    -   View dedicated pages for your favorited and rated books.
-   **Customizable Interface:**
    -   Toggle between light and dark modes.
    -   Choose from multiple accent colors to personalize the UI.
    -   Adjust the application's text size for better readability.
-   **Infinite Scroll:** Seamlessly load more books as you scroll through search results and trending lists.
-   **Local First:** All user data, including profiles, ratings, and reviews, is stored in a single `bookrating.db` SQLite file locally.

## Tech Stack

-   **Backend (`BookRating.Api`)**
    -   .NET 9 / ASP.NET Core Web API
    -   Entity Framework Core
    -   SQLite for local database storage
-   **Frontend (`BookRating.Web`)**
    -   React 19 & TypeScript
    -   Vite for a fast development experience
    -   React Router for client-side routing
    -   CSS with variables for theming

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
-   [Node.js](https://nodejs.org/) (v20 or later) and npm

### Installation & Running

The project is split into a backend API and a frontend web client. You will need to run both concurrently.

**1. Run the Backend API:**

```bash
# Navigate to the API directory
cd BookRating.Api

# Run the .NET application
dotnet run
```

The API will start and be available at `http://localhost:5159`. On the first run, Entity Framework Core will automatically create the `bookrating.db` SQLite database file in this directory.

**2. Run the Frontend Client:**

Open a **new terminal window** for this step.

```bash
# Navigate to the web client directory
cd BookRating.Web

# Install the required npm packages
npm install

# Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173`. The Vite development server is configured to proxy all API requests from the frontend (`/api`) to the backend server running on port `5159`.

You can now open `http://localhost:5173` in your browser to use the application.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
