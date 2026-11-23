# PaperFlow — A Free, Open-Source Multi-Utility Platform

> **Project status:** Active development · Early-stage release  
> **Current focus:** PDF document utilities, account foundations, reliability, and the wider multi-utility platform.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Backend-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## 1. Introduction

**PaperFlow** is an early-stage PDF document utility project and the first part of a broader **multi-utility website programme**. The long-term programme is intended to bring practical, focused digital tools together in one accessible place, rather than limiting the platform to PDF operations.

The current application concentrates on common document tasks: converting, merging, extracting, editing, annotating, protecting, and signing PDF files. It is being developed with an emphasis on usability, accessibility, and a straightforward experience for people who need useful tools without unnecessary complexity.

The project is intended to remain **free to use and open source**. Its longer-term social mission is to use voluntary donations to help support education and improve schooling conditions for less privileged children living in poor and underserved communities around the world.

> **Branding notice:** PaperFlow is the working name currently used in this repository. The project is expected to be rebranded in a future version. The future brand name has intentionally not been made public in this repository yet.

## 2. Vision and objectives

The wider programme aims to:

- Build a collection of useful, reliable, easy-to-use online utilities.
- Keep the core tools free and make the source code openly available.
- Make practical digital tools more accessible to students, educators, freelancers, small businesses, and everyday users.
- Develop the platform in modular stages so additional utilities can be introduced over time.
- Build a transparent, sustainable donation model that supports education initiatives for children in underserved communities.
- Encourage learning, collaboration, responsible contributions, and community-led improvement.

## 3. Current features

The following tools and account features have been implemented in the application. Their presence does not mean every edge case has been fully tested or that every feature is production-ready; further validation and refinement remain part of the roadmap.

| Feature | Route | Current purpose |
|---|---|---|
| Word to PDF | `/` | Convert Word documents to PDF using a LibreOffice-based conversion route. |
| Merge PDF | `/merge` | Combine multiple PDF documents into one file. |
| Extract PDF pages | `/extract` | Select and extract pages from a PDF. |
| PDF Editor | `/editor` | Access the current PDF editing workflow. |
| PDF to Word | `/pdf-to-word` | Convert PDF documents into editable Word documents. |
| Highlight PDF | `/highlight` | Highlight selected content in a PDF. |
| PDF Comments | `/comments` | Add comments and annotations to a PDF. |
| Lock PDF | `/lock-pdf` | Apply password protection to a PDF. |
| Watermark PDF | `/watermark` | Add a watermark to a PDF. |
| Sign PDF | `/sign-pdf` | Add a signature to a PDF. |
| User registration | `/signup` | Create an account. |
| User login | `/login` | Sign in to an account. |
| Password recovery | `/forgot-password`, `/reset-password` | Request and complete password recovery. |
| User dashboard | `/dashboard` | Access the signed-in user dashboard. |

### Important implementation notes

- Word-to-PDF currently depends on LibreOffice being installed and available to the server-side conversion process.
- PDF processing uses a combination of libraries and server-side routes. Individual tools may have different technical requirements.
- Authentication is integrated with Supabase.
- The application is still under active development. Always keep copies of important original documents before processing them with an early-stage tool.

## 4. Technology stack

| Technology | Role |
|---|---|
| [Next.js](https://nextjs.org/) 16 | Application framework and server-side routes |
| [React](https://react.dev/) 19 | User interface |
| [TypeScript](https://www.typescriptlang.org/) 5 | Type-safe application development |
| [Tailwind CSS](https://tailwindcss.com/) 4 | Styling and responsive interface |
| [Supabase](https://supabase.com/) | Authentication and backend services |
| `@supabase/ssr` | Supabase session handling in server-rendered applications |
| [pdf-lib](https://pdf-lib.js.org/) | PDF creation and manipulation |
| [PDF.js](https://mozilla.github.io/pdf.js/) | PDF rendering and preview |
| [LibreOffice](https://www.libreoffice.org/) | Word document conversion |
| [ESLint](https://eslint.org/) | Code linting |

## 5. Project structure

The application uses the Next.js App Router. The main source areas include:

```text
.
├── public/
│   └── pdf.worker.min.mjs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── comments/
│   │   │   ├── convert/
│   │   │   ├── editor/
│   │   │   ├── extract/
│   │   │   ├── highlight/
│   │   │   ├── lock-pdf/
│   │   │   ├── merge/
│   │   │   ├── pdf-to-word/
│   │   │   └── watermark/
│   │   ├── auth/
│   │   │   └── callback/
│   │   ├── comments/
│   │   ├── dashboard/
│   │   ├── editor/
│   │   ├── extract/
│   │   ├── forgot-password/
│   │   ├── highlight/
│   │   ├── lock-pdf/
│   │   ├── login/
│   │   ├── merge/
│   │   ├── pdf-to-word/
│   │   ├── reset-password/
│   │   ├── sign-pdf/
│   │   ├── signup/
│   │   ├── watermark/
│   │   └── page.tsx
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── proxy.ts
│   │       └── server.ts
│   └── proxy.ts
├── .gitignore
├── next.config.ts
├── package.json
└── tsconfig.json
```

This is a simplified guide to the main application structure; supporting components and configuration files may be added as development continues.

## 6. Getting started

### Prerequisites

Install the following before running the project locally:

- [Node.js](https://nodejs.org/) (use a current supported LTS release).
- npm (included with Node.js).
- [Git](https://git-scm.com/).
- [LibreOffice](https://www.libreoffice.org/) for the current Word-to-PDF conversion workflow.
- A [Supabase](https://supabase.com/) project for authentication features.

### Clone the repository

```bash
git clone https://github.com/aniekeme101/pdf-tools-platform.git
cd pdf-tools-platform
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a file named `.env.local` in the project root. Add your own Supabase project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Replace the placeholder values with the corresponding values from your Supabase project settings.

**Security:** Never commit `.env.local`, database passwords, Supabase secret or service-role keys, Paystack secret keys, or other private credentials. Only values specifically intended to be public should use a `NEXT_PUBLIC_` prefix.

### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server. |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Start the production server after a successful build. |
| `npm run lint` | Run ESLint checks. |

### LibreOffice requirement

The Word-to-PDF route currently invokes LibreOffice on the machine running the server. Confirm that LibreOffice is installed and that its executable is accessible to the application environment. A deployment environment must explicitly support this dependency; a successful local setup does not guarantee that every serverless hosting provider can run it.

## 7. Development milestones and roadmap

The project is being developed in stages. The status labels below distinguish work already present in the codebase from planned work; they are not a claim that every feature has passed comprehensive production testing.

### Milestone 1 — Application foundation
**Status: Implemented**

- Set up the Next.js App Router project.
- Establish the initial application structure and shared styling.
- Configure TypeScript, Tailwind CSS, and linting.
- Create the initial public repository and development workflow.

### Milestone 2 — Core PDF utilities
**Status: Implemented; ongoing refinement**

- Build the initial Word-to-PDF conversion workflow.
- Add PDF merging and page extraction.
- Introduce PDF preview and editing capabilities.
- Add PDF-to-Word conversion.
- Implement highlighting, comments, password protection, watermarking, and signing workflows.
- Improve document handling, page navigation, and user feedback.
- Continue testing file compatibility, output quality, and error handling.

### Milestone 3 — User accounts and dashboard
**Status: Implemented; ongoing refinement**

- Integrate Supabase authentication.
- Add registration and login pages.
- Add authentication callback and session handling.
- Implement password recovery and reset flows.
- Add a protected user dashboard.
- Continue improving account management and session reliability.

### Milestone 4 — Quality assurance and reliability
**Status: In progress**

- Test with a wider range of PDF and Word documents.
- Improve validation for unsupported, malformed, and unusually large files.
- Review API routes for safe input handling and useful error responses.
- Verify that generated files open correctly in common PDF and office applications.
- Improve accessibility, responsive layouts, and browser compatibility.
- Add repeatable automated tests and regression coverage.

### Milestone 5 — Donation system and social-impact support
**Status: Planned**

- Build an optional donation experience.
- Support one-time and monthly contributions.
- Integrate Paystack with server-side payment verification and secure webhook handling.
- Keep donor identities and messages private.
- Make clear that donations are voluntary and are not required to use the free tools.
- Establish transparent reporting for funds received and education-support activities as the programme becomes operational.

The intended social-impact objective is to use donations to help support education and improve schooling conditions for less privileged children in poor and underserved communities around the world. This is a project intention; this repository does not claim that a donation programme or distributions are already operational.

### Milestone 6 — Expansion into a multi-utility platform
**Status: Planned**

- Introduce additional utility categories beyond PDF processing.
- Keep each utility modular and maintainable.
- Establish shared navigation and consistent user experience.
- Evaluate each new tool for security, accessibility, and practical value.
- Keep the core platform easy to use without requiring an account unless a feature genuinely needs one.

### Milestone 7 — Brand identity and product evolution
**Status: Planned**

- Complete the future brand transition.
- Update application identity, interface assets, and documentation at the appropriate release.
- Preserve project continuity and communicate breaking changes clearly.
- Keep the future brand undisclosed until it is officially announced.

### Milestone 8 — Open-source community and long-term sustainability
**Status: Long-term goal**

- Publish clear contribution and governance guidance.
- Welcome bug reports, feature proposals, documentation improvements, and code contributions.
- Maintain transparent release notes and roadmap updates.
- Explore sustainable support without making essential tools dependent on donations.

## 8. Testing strategy and sample test documents

Testing is essential because PDF and Word files can vary significantly in structure, fonts, page dimensions, embedded images, and security settings.

**Important:** The test-document identifiers below are a proposed test plan. They describe the documents and cases that should be created or collected; they do not mean that these fixture files are already included in the repository or that every test has passed.

### 8.1 Suggested test-document catalogue

| ID | Suggested sample document | What it helps test |
|---|---|---|
| PDF-001 | One-page text PDF | Basic loading, preview, and export |
| PDF-002 | Multi-page text PDF | Page navigation, merging, and extraction |
| PDF-003 | Image-heavy PDF | Rendering and file-size handling |
| PDF-004 | PDF with selectable text | Text selection and annotation workflows |
| PDF-005 | Scanned/image-only PDF | Handling of pages without a text layer |
| PDF-006 | Password-protected PDF | Encrypted-file handling and clear error messages |
| PDF-007 | Corrupted or truncated PDF | Invalid-file validation and graceful failure |
| PDF-008 | PDF with mixed page dimensions | Page sizing and output consistency |
| PDF-009 | PDF with embedded fonts | Font preservation and rendering |
| DOCX-001 | Simple one-page Word document | Basic Word-to-PDF conversion |
| DOCX-002 | Word document with tables and images | Layout and object preservation |
| DOCX-003 | Multi-page Word document | Pagination and page breaks |
| DOCX-004 | Word document with headers and footers | Header/footer conversion |
| DOCX-005 | Word document with uncommon fonts | Font substitution and layout changes |

Use synthetic or appropriately licensed documents. Do not add private, confidential, copyrighted, or personally identifiable documents to the public test fixtures.

### 8.2 Suggested functional test cases

| Test ID | Area | Test | Expected result |
|---|---|---|---|
| PDF-T001 | Upload | Upload a valid PDF | File is accepted and previewed. |
| PDF-T002 | Validation | Upload a non-PDF file to a PDF-only tool | A clear validation message is shown. |
| PDF-T003 | Merge | Merge two valid PDFs | One output PDF contains pages from both inputs in the expected order. |
| PDF-T004 | Extract | Select specific pages | Output contains only the selected pages in the expected order. |
| PDF-T005 | Highlight | Add a highlight and export | Highlight appears in the exported document. |
| PDF-T006 | Comments | Add and export a comment | Comment is retained in the expected location and appearance. |
| PDF-T007 | Watermark | Apply a watermark | Watermark appears on the intended pages. |
| PDF-T008 | Lock | Apply password protection | Output requires the configured password in a compatible reader. |
| PDF-T009 | Sign | Add a signature | Signature appears at the selected position and page. |
| PDF-T010 | Regression | Open and process a multi-page file after another operation | No unexpected loss of pages or content occurs. |
| AUTH-T001 | Registration | Submit valid registration details | Account creation follows the configured Supabase flow. |
| AUTH-T002 | Login | Sign in with valid credentials | User reaches the protected application area. |
| AUTH-T003 | Login | Submit invalid credentials | Access is denied with a safe, useful message. |
| AUTH-T004 | Recovery | Request password recovery | Recovery flow responds without exposing account secrets. |
| AUTH-T005 | Access control | Open dashboard while signed out | User is redirected to the login flow. |

### 8.3 Suggested future test-fixture layout

As the test suite grows, the following structure may be introduced:

```text
tests/
├── fixtures/
│   ├── pdf/
│   │   ├── single-page.pdf
│   │   ├── multi-page.pdf
│   │   ├── image-heavy.pdf
│   │   └── password-protected.pdf
│   └── docx/
│       ├── simple.docx
│       ├── tables-and-images.docx
│       └── multi-page.docx
├── functional/
└── regression/
```

Test files should be intentionally selected, safely licensed, and small enough for contributors to use. Large or sensitive fixtures should not be committed.

## 9. Open-source commitment and licence

This repository is licensed under the **MIT License**. The complete licence terms are available in the [LICENSE](./LICENSE) file in the repository root.

The MIT License permits use, copying, modification, merging, publishing, distribution, sublicensing, and sale of copies of the software, subject to retaining the copyright and permission notice. The software is provided "as is", without warranty. See the LICENSE file for the complete legal terms.

The project is intended to remain free and open source, making the code available for learning, inspection, collaboration, and improvement while keeping the core utilities accessible.

Contributors and users should review the complete licence before reusing or submitting code.

## 10. Donations and education mission

The long-term programme intends to accept voluntary donations to help support education and improve schooling conditions for less privileged children living in poor and underserved areas around the world.

Potential areas of support may include:

- Learning materials, books, and basic school supplies.
- Resources that help improve the quality of learning environments.
- Support for children facing barriers to school attendance.
- Practical education initiatives in underserved communities.

Donations are intended to be **optional**. Users should be able to access the free utilities without donating.

The donation system is planned, not yet represented as an active fundraising or distribution programme. As it is developed, the project intends to communicate how contributions are received, allocated, and reported. Payment processing and any future public reporting will be designed with appropriate privacy and security safeguards.

## 11. Contributing

Contributions are welcome as the project matures. Useful ways to help include:

- Reporting reproducible bugs.
- Suggesting practical new utilities or improvements.
- Improving documentation and setup instructions.
- Adding tests using safe, appropriately licensed sample documents.
- Reviewing accessibility, usability, and browser compatibility.
- Submitting focused code improvements.

Before submitting a contribution:

1. Check existing issues to avoid duplicating work.
2. Describe the problem or proposed change clearly.
3. Keep changes focused and explain how they were tested.
4. Never include credentials, private documents, or other sensitive information.
5. Include screenshots or sample output when they help explain a user-interface change, ensuring the samples contain no private data.

Contribution guidelines and issue templates may be expanded as the project develops.

## 12. Security and responsible use

Security is especially important for an application that processes user documents and account information.

- Never commit secrets, access tokens, private keys, database passwords, or production credentials.
- Keep server-only credentials on the server; do not expose them through client-side code or public environment variables.
- Validate uploaded files and enforce sensible size and type limits.
- Treat user-supplied documents as untrusted input.
- Apply appropriate authentication and authorization checks to protected resources.
- Do not assume that a file is safe simply because it has a PDF or DOCX extension.
- Report suspected vulnerabilities privately to the repository maintainer rather than publishing exploit details in an issue.

This project is under active development and should not be treated as a certified secure document-processing service. Avoid uploading highly sensitive documents until the relevant production safeguards have been independently reviewed.

## 13. Current limitations and transparency

Known development considerations include:

- Some tools need broader compatibility and regression testing.
- Word-to-PDF currently relies on LibreOffice being available in the execution environment.
- Hosting and deployment requirements for server-side document conversion still need to be validated against the selected provider.
- The donation workflow is planned and is not described as operational.
- The test-document catalogue is a proposed plan; the listed sample files are not currently supplied by this repository.
- The future brand transition has not yet been announced.

The project will evolve as these limitations are addressed. Please check the repository's issues and release history for the latest implementation status.

## 14. Project links

- **GitHub repository:** https://github.com/aniekeme101/pdf-tools-platform
- **Issue tracker:** https://github.com/aniekeme101/pdf-tools-platform/issues
- **Next.js documentation:** https://nextjs.org/docs
- **Supabase documentation:** https://supabase.com/docs
- **PDF.js documentation:** https://mozilla.github.io/pdf.js/
- **pdf-lib documentation:** https://pdf-lib.js.org/

## 15. Closing note

PaperFlow is the first step in a broader effort to build a useful, free, and open-source multi-utility platform. The ambition is not only to make everyday digital tasks easier, but also to develop a sustainable project whose community support can contribute to better educational opportunities for children who need them most.

Thank you for taking the time to explore the project, test it, report issues, and help it improve.

## 16. Supporter programme implementation status

The voluntary supporter programme now has an initial database and application foundation. This is not yet a live payment or fundraising system.

### Implemented foundation

- Separate donor and sponsor records and workflows; sponsorship is not treated as an ordinary donation.
- Guest donor support is represented in the database model so a future checkout does not require an application account.
- Donors can choose private or public recognition. Public recognition requires explicit consent, moderation approval, and at least one successful donation recorded with public recognition selected.
- Sponsor applications can be submitted independently and remain pending until reviewed.
- Protected administrator registry and moderation audit log.
- Row Level Security and server-only access for private supporter and payment records.
- Private Supabase Storage bucket named `recognition-assets` for future donor and sponsor logo assets.
- Supabase Edge Function `supporter-workflows` handles supporter-board retrieval, sponsor applications, donor recognition preferences, and administrator moderation.
- Application routes: `/donate`, `/donor-recognition`, `/sponsor-application`, `/thank-you`, and `/admin/supporters`.

### Important limitations

- Online donation checkout is not active. No payment provider has been confirmed or integrated.
- Payment initialization, server-side payment verification, recurring billing, refunds, and webhook reconciliation remain outstanding.
- Logo upload and validation are not yet available in the application.
- Sponsor approval and donor recognition moderation are implemented as separate queues. Sponsor placements and public activation still require additional workflow and testing.
- The optional download-time donation prompt has not been implemented.
- Public recognition should not be treated as evidence of payment unless the verified donation record exists.
- The supporter programme must be tested with controlled test records before public launch.

All PDF utilities remain free regardless of whether a visitor donates, becomes a sponsor, or creates an account. Donor and sponsor recognition does not unlock paid or preferential features.
