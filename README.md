# TaskMaster - Vanilla JS Full-Stack SPA Simulation 🚀

**Academic Full-Stack Project #3** A complete Single Page Application (SPA) built entirely from scratch using **Vanilla JavaScript, HTML5, and CSS3**, without any external libraries or frameworks. 

This project demonstrates a deep understanding of web architecture by simulating a full client-server ecosystem directly inside the browser. It includes a custom routing system, a simulated network layer with latency/packet-drop, and a mock backend server with a database.

---

## 🎯 Project Objectives
The main goal of this academic project is to understand the "magic" behind modern web frameworks by implementing core mechanisms manually:
* Building a **SPA** without React/Angular.
* Implementing **Client-Side Routing** using the URL Hash and HTML `<template>` tags.
* Understanding asynchronous data fetching by building a custom wrapper for `XMLHttpRequest` (FAJAX).
* Managing **Global State** and Session Authentication (Bearer Tokens) securely.
* Structuring code using the **Module Pattern (IIFE)** to ensure encapsulation and prevent global namespace pollution.

---

## 🏗️ Architecture & Flow

The application is divided into 4 distinct layers, strictly adhering to the **Separation of Concerns** principle:

### 1. Client-Side (Frontend)
* **UI & Routing:** Uses HTML `<template>` tags combined with `cloneNode()` to dynamically render views (`login`, `register`, `tasks`) based on the `hashchange` event.
* **State Management (`state.js`):** Manages the current user and authentication token, backing it up to `sessionStorage` to survive page reloads.
* **FAJAX (`fajax.js`):** A custom HTTP client module that mimics Axios/Fetch. It automatically intercepts requests to inject the `Authorization: Bearer <token>` header and handles automatic retries (up to 3 times) on network failures.

### 2. Network Simulation Layer (`network.js`)
* Acts as the "Internet" bridge between the client and the simulated server.
* Introduces an artificial delay (1 to 3 seconds) using `setTimeout` to mimic real-world latency.
* Implements a **20% packet drop rate**, forcing the client-side `FAJAX` module to handle network errors gracefully.

### 3. Server-Side Simulation (Backend)
* **Dispatcher (`dispatcher.js`):** Acts as a load balancer/router, directing `/api/auth/*` traffic to the Auth Server and `/api/tasks/*` to the App Server.
* **Auth Server (`authServer.js`):** Handles user registration, login, logout, and token validation. Returns standard HTTP status codes (200, 201, 400, 401, 404).
* **App Server (`appServer.js`):** A RESTful API handling CRUD operations for tasks. It strictly validates the Bearer token before allowing access to private data.

### 4. Database Layer (`localStorage`)
* **User DB (`userDb.js`):** Stores registered users and active session tokens.
* **App DB (`appDb.js`):** Stores tasks. Data is persisted in the browser's `localStorage` to simulate a persistent database.

---

## ✨ Features
* **User Authentication:** Register, Login, and Logout functionality with secure password validation.
* **Task Management (CRUD):**
    * Create new tasks.
    * Read/View tasks specific to the logged-in user.
    * Update task status (To Do, In Progress, Done) and edit content inline.
    * Delete tasks.
* **Robust Error Handling:** Custom console logger displaying formatted network traffic (Outgoing, Incoming, Drops, and Server Crashes).
* **Responsive Design:** Fully responsive custom CSS layout for mobile and desktop.

---

## 🛠️ How to Run
Since the entire backend and database are simulated within the browser environment, running the project requires absolutely no setup:
1. Clone the repository.
2. Open `index.html` in any modern web browser.
3. Open the Developer Tools (F12) -> **Console** to watch the simulated network traffic logs in real-time!

---
*Developed as part of Full-Stack Web Development Academic Course.*
