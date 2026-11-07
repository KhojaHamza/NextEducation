# NextEducation — School Management System

> A modern, full-stack school management platform designed to simplify academic, administrative, and financial operations through a unified digital environment.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Table of Contents

- [Overview](#overview)
- [Project Objectives](#project-objectives)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Security and Access Control](#security-and-access-control)
- [Getting Started](#getting-started)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Overview

**NextEducation** is a full-stack School Management System developed to centralize and digitalize the daily operations of a primary school.

The platform provides a unified environment where administrators, teachers, parents, students, and accountants can interact with school data through dedicated interfaces and role-specific functionalities.

The application aims to replace fragmented administrative processes with a structured, accessible, and organized digital solution.

It covers several aspects of school management, including student administration, academic activities, attendance tracking, evaluations, financial operations, and communication.

## Project Objectives

The main objectives of NextEducation are:

- Centralize school information and administrative operations.
- Improve communication between school staff, teachers, parents, and students.
- Simplify academic management and student monitoring.
- Provide a clear and intuitive user experience.
- Implement a structured and maintainable full-stack architecture.
- Ensure that users can only access information relevant to their roles and permissions.

## Key Features

### 1. School Structure Management

Complete CRUD management for the school's main entities.

- Student management.
- Teacher management.
- Class management.
- Subject management.
- School year management.
- Student enrollment and class assignments.
- Parent-student relationships.

### 2. Academic Management

Tools for managing students' academic progress.

- Evaluation management.
- Grade entry and management.
- Student results.
- Report card management.
- Academic performance tracking.

### 3. Attendance Management

- Student attendance tracking.
- Absence management.
- Teacher attendance workflows.
- Dedicated attendance interfaces.

### 4. Timetable Management

- Class timetable management.
- Teacher timetable views.
- Student timetable views.
- Organized schedule visualization.

### 5. Financial Management

- School payment management.
- Payment tracking.
- Dedicated accountant interface.
- Financial information management.

### 6. Communication System

A centralized communication environment.

- Internal messaging.
- School announcements.
- Notifications.
- Role-based communication access.

### 7. Role-Specific Dashboards

Dedicated dashboards designed around each user's responsibilities.

- Administrative dashboard.
- Teacher dashboard.
- Parent dashboard.
- Student dashboard.
- Accountant dashboard.

## User Roles

NextEducation supports five main user roles.

| Role | Main Responsibilities |
|---|---|
| Administrator | Manage school structure, users, academic data, and system operations. |
| Teacher | Manage classes, attendance, evaluations, and student results. |
| Parent | Follow children's academic progress and school information. |
| Student | Access personal academic information, attendance, and timetable. |
| Accountant | Manage school payments and financial operations. |

Each role has a dedicated interface and navigation structure.

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface development |
| Vite | Development environment and build tool |
| Tailwind CSS v4 | Styling and responsive design |
| TanStack Query | Server-state management and data fetching |
| React Hook Form | Form management |
| Zod | Data validation |
| Lucide React | Interface icons |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API development |
| Prisma ORM | Database access and management |
| PostgreSQL | Relational database |
| JWT | Authentication |
| Zod | Request validation |
| Multer | File upload handling |

### Additional Technologies

- Progressive Web Application (PWA).
- Service Workers.
- Web Push API.
- VAPID for push notification configuration.

## System Architecture

NextEducation follows a full-stack client-server architecture.

**Frontend Layer**
- React-based application.
- Feature-oriented organization.
- Reusable UI components.
- Role-specific dashboards and navigation.
- Centralized API communication.

**Backend Layer**
- RESTful API architecture.
- Modular business logic.
- Controllers, services, and routes.
- Authentication and authorization.
- Request validation and error handling.

**Database Layer**
- PostgreSQL relational database.
- Prisma ORM.
- Structured data relationships.
- Database migrations and schema management.

## Project Structure

The project follows a modular organization to improve maintainability and scalability.

```text
NextEducation/
│
├── backend/
│   │
│   ├── prisma/
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── core/
│   │   ├── jobs/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   └── prisma.config.ts
│
├── docs/
│
├── frontend/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── api/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   │   └── ui/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
│
├── .editorconfig
├── .gitignore
├── LICENSE
├── README.md
├── docker-compose.yml
├── package-lock.json
└── package.json
```

## Security and Access Control

Security and data protection are important considerations in the application.

The system includes:

- JWT-based authentication.
- Role-based access control (RBAC).
- Protected application routes.
- Backend authorization checks.
- Input validation using Zod.
- Secure HTTP headers with Helmet.
- Controlled access to user-specific information.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/NextEducation.git
cd NextEducation
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file using the environment configuration required by the backend.

Configure your database connection and authentication settings.

Generate the Prisma client and apply the database migrations according to the project's Prisma configuration.

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

The backend API runs locally at:

`http://localhost:4000`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend development server runs at:

`http://localhost:5173`

## Screenshots

> Application screenshots will be added in a future update.

| Administrator Dashboard | Teacher Dashboard |
|---|---|
| Coming soon | Coming soon |

| Student Portal | Parent Portal |
|---|---|
| Coming soon | Coming soon |

## Future Improvements

Planned improvements include:

- Public online deployment.
- Application screenshots and live preview.
- Additional testing and quality assurance.
- Performance optimization.
- Enhanced documentation.
- Continuous Integration and Continuous Deployment (CI/CD).

## Author

**Hamza Khouja**

Individually developed as an academic software engineering project.

- GitHub: [Your GitHub Profile](https://github.com/YOUR_USERNAME)
- LinkedIn: [Your LinkedIn Profile](YOUR_LINKEDIN_URL)

---

*NextEducation — Bringing school management into a more organized digital future.*