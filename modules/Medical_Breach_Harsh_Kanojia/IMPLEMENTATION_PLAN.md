# Medical Data Breach Exposure Detection Module Plan

**Module Owner:** Harsh Kanojia (Junior Cyber Security Lead)

## Overview
This module is designed to help users understand whether their email address has appeared in any publicly reported data breaches that may involve healthcare-related information.

## Goal
Implement a module to check if a user's email has appeared in data breaches, filtering for medically relevant breaches.

## Data Source
Integrates the Have I Been Pwned (HIBP) breach intelligence API.

## Privacy
- The system checks publicly reported data breaches only and does not access hospital, clinical, or private medical databases.
- Emails are handled securely.

## Implementation Details

### Backend
- **Directory:** `Nutrihelp-api/modules/Medical_Breach_Harsh_Kanojia/`
- **Endpoints:** `POST /api/security/breach-check`
- **Logic:**
    - Proxy request to HIBP API.
    - Filter results for keywords: "Health", "Medical", "Insurance", "Hospital".
    - Calculate Risk Level (Low/Medium/High).

### Frontend
- **Directory:** `Nutrihelp-web/src/modules/Medical_Breach_Harsh_Kanojia/`
- **Route:** `/security/breach-detection`
- **Components:**
    - `BreachCheckForm`: Input email.
    - `BreachResultCard`: Display filtered results.
