# Task Manager Web App

## Project Overview
A comprehensive task management system designed for organizations, featuring role-based access control, task lifecycle management, notifications, user authentication, and performance gamification. This web application consists of a Node.js backend and a React frontend.

## Features

### 1. User Management & Authentication
- **User Roles:**
  - **Admin:** Can manage users, approve signups, create and assign tasks to anyone
  - **Normal User:** Can create personal tasks and claim unassigned tasks
- **Authentication:**
  - Secure signup system with email verification
  - JWT-based authentication
  - Password hashing for security
  - Admin approval workflow for new user registrations
- **User Profile:**
  - Personalized dashboard
  - Profile management with name updates
  - Secure password change functionality

### 2. Task Management
- **Task Creation:**
  - Admins can create tasks for anyone or leave them unassigned
  - Users can create tasks for themselves or leave them unassigned
- **Task Assignment:**
  - Users can assign themselves to unassigned tasks
  - Admins can reassign tasks as needed
- **Visibility Controls:**
  - Tasks can be public or private
  - Visibility can be modified by task owners or admins
- **Excel Export:**
  - Export tasks to Excel spreadsheets with comprehensive filtering options
  - Download options include "All Tasks", "My Tasks", "Available Tasks", "In Progress Tasks", "Completed Tasks", "Cancelled Tasks", and "Behind Schedule Tasks"
  - Admins can export any task regardless of visibility settings
  - Regular users can only export tasks they have permission to view
  - Exports include task name, description, status, assignee, and due date

### 3. Task Properties & Workflow
- **Task Attributes:**
  - Title, description, due date, priority
  - Assignee information
  - Visibility settings
- **Status Tracking:**
  - Available: No user assigned yet
  - In Progress: Currently being worked on
  - Behind Schedule: Past due date but still active
  - Cancelled: Terminated before completion
  - Completed: Successfully finished
- **Due Date Notifications:**
  - Email notifications at various intervals before deadlines
  - Customizable notification schedule

### 4. Business Credit System
- **Performance Gamification:**
  - Users earn credits for completing tasks on time
  - More credits awarded for early completion (up to 2 credits)
  - Credits deducted for missing deadlines
  - Higher penalties for admin-assigned tasks that are missed
- **Leaderboard:**
  - Organization-wide ranking system
  - Visual distinctions for top performers (gold, silver, bronze)
  - Motivates timely task completion and healthy competition

### 5. Technical Implementation
- **Backend:**
  - Node.js/Express RESTful API
  - MongoDB database with Mongoose ODM
  - JWT-based authentication middleware
  - Scheduled tasks for notifications and deadline tracking
  - Excel generation for task data export
- **Frontend:**
  - React-based single-page application
  - Modern UI with Material-UI components
  - Responsive design for all devices
  - API integration for real-time updates
  - Interactive dashboards with data visualization
  - Export functionality for downloading task data

## Getting Started

### Prerequisites
- Node.js (v14.x or higher) and npm
- MongoDB (v4.x or higher)
- Git

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/ExQueueSee/task-manager-web-app.git
   cd task-manager-web-app
   ```

2. Install backend dependencies:
   ```bash
   cd task-manager-backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../task-manager-frontend
   npm install
   ```

### Database Setup
1. **Local MongoDB:**
   ```bash
   # Install MongoDB (Ubuntu)
   sudo apt-get install mongodb

   # Install MongoDB (macOS with Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community

   # Start MongoDB service
   sudo systemctl start mongod    # Linux
   brew services start mongodb-community    # macOS
   ```

2. **Using MongoDB Atlas (Cloud):**
   - Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster
   - Configure network access (whitelist your IP)
   - Create a database user
   - Get your connection string from the Connect dialog
   - Use this connection string in your `.env` file instead of the local MongoDB URI

3. **Using Docker:**
   ```bash
   # Pull and run MongoDB container
   docker pull mongo
   docker run -d -p 27017:27017 --name task-manager-mongo mongo
   
   # Use mongodb://localhost:27017/taskmanager in your .env file
   ```

### Configuration
1. Create a `.env` file in the backend directory:
   ```bash
   cd ../task-manager-backend
   touch .env
   ```

2. Add the following environment variables to the `.env` file:
   ```
   PORT=your_choice_of_PORT
   MONGODB_URI=mongodb://localhost:27017/taskmanager
   JWT_SECRET=your_jwt_secret_key
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_email_password
   FRONTEND_URL=http://localhost:3000
   ```

3. Configure email settings for notifications (if using Gmail, you may need to allow less secure apps or use app passwords)

### Running the Application
1. Start MongoDB (if running locally):
   ```bash
   mongod
   ```

2. Start the backend server:
   ```bash
   cd task-manager-backend
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. Start the frontend development server:
   ```bash
   cd ../task-manager-frontend
   npm start
   ```

4. Access the application at: http://localhost:3000

### Running Tests
1. Backend tests:
   ```bash
   cd task-manager-backend
   npm test
   ```

2. Frontend tests:
   ```bash
   cd task-manager-frontend
   npm test
   ```

## API Documentation
API documentation is available through Swagger at the `/api-docs` endpoint when running the backend server (http://localhost:5000/api-docs).

## Deployment
- The backend can be deployed to services like Heroku, AWS, or DigitalOcean
- The frontend can be deployed to services like Netlify, Vercel, or GitHub Pages
- Ensure to update environment variables for production deployment

## Demo Screenshots
### Login Page
![Image](https://github.com/user-attachments/assets/717b76e6-6a54-4285-a214-5d055dca7ca0)

### Dashboard
![Image](https://github.com/user-attachments/assets/46b9f99a-2d0a-47ce-a586-d601c1aada3c)

### Profile Page
![Image](https://github.com/user-attachments/assets/8b37ff57-adf6-4490-ba60-e903cb97f450)

### User Management Page (admin)
![Image](https://github.com/user-attachments/assets/7ed3d841-4602-45cf-9e1f-77fa46786a29)

### Task Management Page (admin)
![Image](https://github.com/user-attachments/assets/669817f5-5b99-454b-8aa6-44dc052d9133)

### Leaderboard Page (admin)
![Image](https://github.com/user-attachments/assets/676fd817-014a-4b23-8268-95ae697b6e99)

### Tasks Page (regular user)
![Image](https://github.com/user-attachments/assets/04bf2550-6c09-42db-a008-4e2e3704480d)
````
