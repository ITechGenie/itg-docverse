# ITG DocVerse Deployment Guide

## Docker Deployment

### Quick Start

1. **Pull the latest image from GitHub Container Registry:**
   ```bash
   docker pull ghcr.io/itechgenie/itg-docverse:latest
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 -v $(pwd)/data:/api/itg_docverse.db ghcr.io/itechgenie/itg-docverse:latest
   ```

3. **Access the application:**
   - Open your browser to `http://localhost:8000`
   - API documentation available at `http://localhost:8000/docs`

### Using Docker Compose

1. **Development mode:**
   ```bash
   docker-compose up --build
   ```

2. **Production mode with nginx:**
   ```bash
   docker-compose --profile production up --build
   ```

### Building Locally

If you want to build the image locally:

```bash
# Build the image
docker build -t itg-docverse:local .

# Run it
docker run -p 8000:8000 itg-docverse:local
```

## GitHub Container Registry

The images are automatically built and pushed to GitHub Container Registry when you push to the main branch.

Available tags:
- `ghcr.io/itechgenie/itg-docverse:latest` - Latest stable version
- `ghcr.io/itechgenie/itg-docverse:main` - Latest from main branch
- `ghcr.io/itechgenie/itg-docverse:v1.0.0` - Specific version tags

## Environment Variables

- `ENVIRONMENT` - Set to `development` or `production`

## Volumes

- Mount `/api/itg_docverse.db` to persist your database

## Features Included

✅ **Favorites System**
- Favorite tags functionality
- Tagged favorites feed showing posts from favorite tags
- Dedicated favorite tags management page
- Clean navigation with intuitive menu names

✅ **Multi-stage Build**
- React frontend built and served by FastAPI
- Optimized Docker image size
- Both AMD64 and ARM64 support

✅ **Production Ready**
- FastAPI with Uvicorn
- SQLite database with proper schema
- Authentication middleware
- Comprehensive logging

## Usage

1. **Create Posts**: Create posts with various types (thoughts, documents, etc.)
2. **Tag Management**: Add and organize tags for better content discovery
3. **Favorites**: Mark tags as favorites and view posts from your favorite tags
4. **Search & Filter**: Find content quickly with powerful filtering options
