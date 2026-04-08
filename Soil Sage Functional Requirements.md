# Project Title

**Soil Sage: AI-Based Farming Intelligence Hub**

## Project Overview

**Soil Sage** is an AI-powered smart farming web platform designed to empower farmers with intelligent decision-making tools, land management facilities, and community collaboration features. The system connects Farmers, Land Owners, Specialists, and Admins in a unified ecosystem where soil analysis, crop diagnosis, consultation, and agricultural resource discovery become accessible through a user-friendly interface.

The platform integrates advanced technologies such as AI-based image analysis, interactive maps, multilingual support, and chatbot assistance to reduce the burden on farmers in diagnosing soil and crop problems. Soil Sage ensures efficient land rental management, community networking, inventory management, and real-time notifications, making modern agricultural intelligence available at every farmer's fingertips.

## Tech Stack

- Language: JavaScript
- Frontend Library: React.js
- Framework: React
- Styling: Tailwind CSS
- Backend Runtime: Node.js
- Database: MongoDB
- ORM: Mongoose
- Deployment: Vercel
- External APIs:
  - OpenAI API: AI chatbot and smart farming assistant
  - Google Maps API: location and land mapping services
  - Image-to-Text API: soil and crop image recognition
  - Text-to-Speech API: voice-based system guidance

## User Roles

1. **Farmer:** Primary user who manages land, crops, inventory, community interactions, and AI diagnosis.
2. **Land Owner:** A farmer who owns land and can rent or lend land to other farmers.
3. **Specialist:** Agricultural expert who provides professional consultation and appointment-based services.
4. **Admin:** System controller responsible for approval, monitoring, and content management.

## Functional Requirements

### Common Workflows

| SL | Workflow |
| --- | --- |
| 1 | Users can register using name, email, phone number, password, and role selection (Farmer, Land Owner, Specialist). Each registered user receives a unique system-generated ID. Secure authentication is implemented. Admin approval is required for Land Owners and Specialists before activation. |
| 2 | The system restricts features based on user roles. Farmers access farming tools and community features, Specialists access consultation tools, Land Owners manage rental requests, and Admin controls system management panels. |

### Module 1

| Feature | Description |
| --- | --- |
| Registration and Login System | Users can register using name, email, phone number, password, and role selection (Farmer, Land Owner, Specialist). Each registered user receives a unique system-generated ID. Secure authentication is implemented. Admin approval is required for Land Owners and Specialists before activation. |
| Role-Based Access Control | The system restricts features based on user roles. Farmers access farming tools and community features, Specialists access consultation tools, Land Owners manage rental requests, and Admin controls system management panels. |
| Profile Management System | All users can update personal details, profile photos, language preference (Bangla/English), contact information, and password. Farmers can additionally update farm-related information such as land size, soil type, and crop category. |
| Land Management and Location Setup | Farmers must register land details including size, soil condition, crop type, and GPS location using Google Maps integration. Land Owners can mark land as available for rent. Farmers can view nearby farmers and lands based on geolocation. |
| Land Borrowing and Rental Request System | Farmers can send land rental requests to Land Owners. Land Owners can approve or deny requests. Upon approval, both parties receive system notifications. Rental agreements are digitally recorded in the system. Farmers can see on Land Owners profile if their land is available for renting. |
| Soil and Crop AI Diagnosis (Image Upload System) | Farmers can upload real-time images of soil or crops. The system processes images using Image-to-Text API and AI analysis to identify soil deficiencies, diseases, or crop issues. The AI provides recommended solutions, fertilizers, and treatment steps. |

### Module 2

| Feature | Description |
| --- | --- |
| Nearby Solution Provider Locator | After diagnosis, the system uses Google Maps API to display nearby agricultural stores or product providers where recommended fertilizers or treatments are available. |
| Community Forum System | Farmers can join farming communities to post questions, share updates, and discuss agricultural practices. Users can like, comment, reply, edit, save, or delete posts. Community engagement builds peer support. |
| Follow and Networking System | Farmers can follow other Farmers or Land Owners. A personalized feed displays updates from followed users. |
| Discovery Page (Scientific Updates) | Admin regularly posts agricultural discoveries, soil research findings, climate alerts, and government policies. Users can like, dislike, comment, and reply to posts. |
| AI Smart Chatbot Assistant | Farmers can interact with an AI-powered chatbot for farming advice, crop suggestions, seasonal guidance, and agricultural business ideas. Farmers may also share inventory details with the chatbot to receive customized recommendations. |
| Inventory Management System | Farmers can add crops, seeds, fertilizers, pesticides, and tools to their personal inventory. The system tracks quantities and usage history. AI can analyze inventory to suggest missing tools or better crop management strategies. |

### Module 3

| Feature | Description |
| --- | --- |
| Crop Planning and Recommendation Engine | Based on soil diagnosis, weather conditions, and location, the system recommends suitable crops for cultivation. It provides estimated yield prediction and best farming practices. |
| Appointment Scheduling with Specialists | Farmers can book consultation appointments with Specialists by selecting available time slots. Specialists can approve, reject, or reschedule appointments. Notifications are automatically sent. |
| Notification System | Real-time notifications alert users about rental approvals, appointment updates, community interactions, AI diagnosis results, and system announcements. |
| Multilingual Support | Users can switch between Bangla and English. Text-to-Speech API provides voice guidance in selected languages for accessibility and ease of use. |
| Admin Verification and Monitoring System | Admin reviews and approves Land Owner and Specialist registrations. Admin monitors reports, removes inappropriate community content, and manages user permissions. |
| User Review | Farmers can leave reviews on Specialists' profiles about their experience or anything memorable. Farmers can also recommend Specialists to other farmers they follow. |
| Reporting and Analytics Dashboard | Farmers receive productivity analytics such as crop growth tracking, land usage statistics, soil health trends, and AI diagnosis history. Specialists receive appointment statistics and consultation performance insights. |
| Emergency Alert and Climate Notification System | The system provides weather alerts and climate warnings based on location data. Farmers receive precautionary farming advice during floods, droughts, or storms. |
| bKash Payment | Farmers can receive or pay through the bKash online banking system for rent money or specialist consultation fees. |
| Data Backup and Security Management | All user data is securely stored with encrypted authentication. Regular backups are maintained to prevent data loss. Role-based permissions prevent unauthorized access. |

