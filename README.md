# Movie Collector

A modern web application for collecting and managing movies.

## 🚀 Features

-   Manage movie collection
-   User-friendly interface
-   Responsive design
-   Secure user authentication
-   RESTful API
-   Integration with TMDB API for movie data

## 🛠️ Technologies

### Frontend

-   React
-   TypeScript
-   Tailwind CSS
-   Vite

### Backend

-   Go 1.23
-   RESTful API
-   PostgreSQL
-   JWT Authentication
-   TMDB API Integration

## 📋 Prerequisites

-   Go 1.23
-   Node.js 20
-   PostgreSQL
-   Docker (optional)
-   TMDB API Key (required for movie data)

## 🔑 TMDB API Key

This application uses the TMDB API to fetch movie data. To use this feature:

1. Create an account at [The Movie Database (TMDB)](https://www.themoviedb.org/)
2. Request an API key from your account settings
3. Add the API key to your `.env` file:
    ```
    TMDB_API_KEY=your_api_key_here
    ```

⚠️ **Important**: Never commit your API key to version control. The `.env` file is already in `.gitignore` to prevent accidental commits.

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/movie-collector.git
cd movie-collector
```

2. Set up the backend:

```bash
cd backend
go mod download
```

3. Set up the frontend:

```bash
cd frontend
npm install
```

4. Configure environment variables:
   Copy the `.env.example` file to `.env` and adjust the values, including your TMDB API key.

## 🏃‍♂️ Development

### Start the backend

```bash
cd backend
go run main.go
```

### Start the frontend

```bash
cd frontend
npm run dev
```

### Start with Docker

```bash
docker-compose up
```

## 🧪 Tests

### Backend Tests

```bash
cd backend
go test -v ./...
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📝 License

This project is licensed under the MIT License. See [LICENSE.txt](LICENSE.txt) for details.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📫 Contact

Feel free to contact us with any questions or suggestions.

## 🙏 Acknowledgments

Thank you to all contributors and the open-source community for their support.
