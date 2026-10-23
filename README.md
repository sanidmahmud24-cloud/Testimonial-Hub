# TestimonialHub

TestimonialHub is a testimonial collection and management platform built with Next.js. It helps users collect customer feedback, manage testimonials, and display them through public testimonial walls.

## Features and Implementation Status

The following features are part of the project scope. Update each status after verifying the feature in the running application.

| Feature | Status |
|---|---|
| User authentication and sign-up | Verify |
| Workspace management | Verify |
| Public testimonial collection forms | In Progress / Verify |
| Testimonial inbox and management | Verify |
| Public Wall of Love pages | Verify |
| Embeddable testimonial pages | Verify |
| Input validation and submission rate limiting | In Progress / Verify |

**Status meanings:**
- **Completed:** Implemented and tested successfully.
- **In Progress:** Partially implemented or currently being debugged.
- **Planned:** Not implemented yet.

## Technology Stack

- Next.js (App Router)
- React
- TypeScript
- Prisma ORM
- PostgreSQL
- Auth.js
- Tailwind CSS
- Vitest

## Getting Started

### Prerequisites

- Node.js and npm
- A PostgreSQL database, such as Neon
- Git

### Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/sanidmahmud24-cloud/Testimonial-Hub.git
cd Testimonial-Hub
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root and configure the environment variables required by the application.

Example:

```env
DATABASE_URL="your_postgresql_connection_string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Add any additional authentication or application variables required by the project configuration. Never commit real passwords, API keys, or authentication secrets.

### Database Setup

Generate the Prisma Client:

```bash
npx prisma generate
```

If the project uses Prisma migrations, apply the existing migrations:

```bash
npx prisma migrate deploy
```

For local development, use the migration workflow configured for the project. If the database schema already exists and migrations have not been created, review the Prisma schema and database setup before running migration commands.

### Run the Development Server

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:3000
```

If port 3000 is already occupied, Next.js may start on another port. Use the URL printed in the terminal.

### Available Scripts

Check `package.json` for the exact scripts configured in the current project. Common commands include:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test
```

Some commands may not be configured in every project version. Run only the scripts that exist in `package.json`.

## Project Structure

The project follows the Next.js App Router structure. Important directories may include:

- `app/` — application routes, layouts, and pages
- `components/` — reusable UI components
- `lib/` — application services and shared utilities
- `prisma/` — Prisma schema and database-related files
- `public/` — static assets
- `.env` — local environment configuration; must not be committed

The exact directory structure may evolve during development.

## Agentic Engineering Tools

Puku CLI was used as an AI-assisted development tool during project setup and development.

| Tool or technique | Purpose |
|---|---|
| Puku CLI | Assisted with project setup, development tasks, and debugging workflows |
| AI-assisted coding prompts | Used to request implementation, error diagnosis, and code review |
| Git and GitHub | Version control, feature branches, commits, and remote repository hosting |

**Additional agentic capabilities:** List subagents, skills, hooks, MCP servers, or other tools here only if you actually used them. If a skill or configuration file exists in the repository, that alone does not prove it was actively used.

## Git Workflow

The project uses a feature-branch workflow:

1. Create a branch for an individual feature.
2. Implement and test the feature.
3. Commit the changes with a descriptive message.
4. Push the branch to GitHub.
5. Open a pull request and merge it into the target branch after review.

Example:

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Implement your feature"
git push -u origin feature/your-feature
```

## Testing and Verification

Test the relevant application flows before marking a feature as completed. Verify authentication, workspace operations, public testimonial submission, testimonial management, and public display pages where implemented.

Use the test scripts available in `package.json`. Record known errors and incomplete features honestly.

## Security Considerations

- Keep `.env` and other secret files out of Git.
- Never publish database passwords, API keys, or authentication secrets.
- Validate public form submissions on the server.
- Apply appropriate rate limiting and input validation.
- Use secure authentication and authorization checks for workspace data.

## Current Limitations and Future Improvements

- Complete and verify all planned features.
- Resolve any remaining public testimonial submission errors.
- Expand automated tests for critical workflows.
- Improve error handling and user-facing feedback.
- Add screenshots and a demonstration recording.
- Document the exact agentic tools and workflows used during development.

## Repository

GitHub: https://github.com/sanidmahmud24-cloud/Testimonial-Hub
