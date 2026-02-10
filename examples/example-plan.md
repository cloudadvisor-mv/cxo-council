# Example: Add User Authentication Feature

## Overview

We need to add user authentication to our application to allow users to create accounts, log in, and manage their profiles.

## Requirements

- Users can register with email/password
- Email verification required
- Password reset functionality
- Session management
- Role-based access control (admin, user)

## Technical Approach

- Use JWT tokens for authentication
- Store hashed passwords with bcrypt
- Implement refresh token rotation
- Add middleware for protected routes

## Timeline

Target completion: 2 weeks

## Open Questions

- Should we support OAuth (Google, GitHub)?
- What's our password complexity policy?
- Do we need 2FA for admin accounts?
