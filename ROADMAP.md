# Project Roadmap

> **Project:** PaperFlow (working repository name)  
> **Status:** Active development · Early-stage  
> **Scope:** The first application in a broader free and open-source multi-utility website programme.

This roadmap describes the project's intended direction. It is a planning document, not a guarantee of delivery dates. Priorities and scope may change as development, testing, community feedback, and available resources evolve.

## Guiding principles

- **Free and accessible:** Keep the core utilities free to use.
- **Open source:** Develop in public and encourage learning, review, and community contributions.
- **Useful before expansive:** Prioritise reliability and a good user experience over adding tools simply to increase the tool count.
- **Privacy and security:** Treat uploaded documents and account information carefully; never expose secrets or private user data.
- **Modular growth:** Build the PDF application as one part of a wider multi-utility platform, with room for additional categories.
- **Social impact:** Voluntary donations are intended to help support education and improve schooling conditions for less privileged children in poor and underserved communities around the world. The donation and distribution programme is planned, not yet represented as operational.

## Status key

- **Implemented:** Functionality is present in the application; this does not imply exhaustive testing or production readiness.
- **In progress:** Work is underway or needs further refinement.
- **Planned:** Intended future work; not yet complete.
- **Long-term:** A broader objective without a committed delivery date.

---

## 1. Application foundation

**Status: Implemented; ongoing maintenance**

- [x] Establish the Next.js App Router application.
- [x] Set up TypeScript and Tailwind CSS.
- [x] Establish the initial GitHub repository and development workflow.
- [x] Create the initial shared application structure and navigation.
- [ ] Continue improving developer documentation and onboarding.
- [ ] Establish repeatable checks for builds, linting, and tests.

## 2. Core PDF utilities

**Status: Implemented; ongoing refinement and testing**

The current application includes the following workflows:

- [x] Word-to-PDF conversion.
- [x] PDF merging.
- [x] PDF page extraction.
- [x] PDF editing workflow.
- [x] PDF-to-Word conversion.
- [x] PDF highlighting.
- [x] PDF comments and annotations.
- [x] PDF password protection.
- [x] PDF watermarking.
- [x] PDF signing.

Further work:

- [ ] Expand testing across different PDF structures, page sizes, fonts, and image types.
- [ ] Improve handling of malformed, encrypted, unusually large, and unsupported files.
- [ ] Refine page selection, navigation, previews, and export behaviour.
- [ ] Improve consistency of generated documents across common PDF readers.
- [ ] Review upload validation, file-size limits, temporary-file handling, and cleanup.
- [ ] Document the runtime requirements of every server-side conversion tool.

**Important dependency:** The current Word-to-PDF workflow uses LibreOffice. Deployment environments must be checked for compatibility with this server-side dependency; a successful local setup does not guarantee that a serverless host supports it.

## 3. Accounts and dashboard

**Status: Implemented; ongoing refinement**

- [x] Supabase authentication integration.
- [x] User registration.
- [x] User login.
- [x] Authentication callback and session handling.
- [x] Password recovery and reset flows.
- [x] Protected user dashboard.
- [ ] Continue testing session expiry, logout, and recovery edge cases.
- [ ] Review access control and account-related security policies.
- [ ] Define which future features genuinely require an account.

## 4. Quality assurance, security, and accessibility

**Status: In progress**

- [ ] Build a repeatable test suite for the core PDF workflows.
- [ ] Create safe, synthetic PDF and DOCX test fixtures.
- [ ] Add automated regression tests for critical operations.
- [ ] Test invalid uploads and failure paths.
- [ ] Verify that exported files open and retain expected content.
- [ ] Review API routes for validation, error handling, and resource limits.
- [ ] Review authentication, authorization, and data access policies.
- [ ] Improve keyboard navigation, accessible labels, contrast, and screen-reader support.
- [ ] Test responsive layouts and supported browsers.
- [ ] Add a documented security reporting process.

The test catalogue in the README is a proposed test plan. Its identifiers are not evidence that all cases have been executed or passed. Test fixtures should be synthetic or appropriately licensed and must not contain private or confidential information.

## 5. Donation system and education-support mission

**Status: Planned**

The project intends to support an optional donation system. Donations will not be a requirement for using the free utilities.

- [ ] Design the donation experience and explain the intended social-impact mission.
- [ ] Support one-time contributions.
- [ ] Support monthly recurring contributions.
- [ ] Integrate Paystack using server-side payment verification.
- [ ] Verify webhook signatures and make payment-event processing idempotent.
- [ ] Keep donor identities and messages private; do not create a public donor wall.
- [ ] Allow a donation without requiring the donor to create an application account, subject to the final payment design.
- [ ] Provide appropriate private records and administrative reconciliation.
- [ ] Establish transparent reporting on funds received and education-support activities as the programme becomes operational.

**Intended impact:** Voluntary donations are intended to help support education and improve schooling conditions for less privileged children in poor and underserved communities around the world. Potential areas include learning materials, school supplies, improved learning environments, and support for children facing barriers to school attendance.

This is an intended mission. The repository does not claim that fundraising, grant-making, or distributions are currently operational. Details of administration, accountability, and reporting should be published before the programme begins accepting donations.

## 6. Expansion into a multi-utility website

**Status: Planned**

The current PDF application is only one part of a wider multi-utility website programme.

- [ ] Define the next utility categories based on practical user needs.
- [ ] Establish a modular structure for adding independent tools.
- [ ] Build shared navigation and consistent interface patterns.
- [ ] Reuse common components where doing so improves maintainability.
- [ ] Evaluate each utility for privacy, security, accessibility, and operating cost.
- [ ] Keep the core experience free and avoid unnecessary account requirements.

New utilities should be introduced in manageable stages, with testing and documentation included in each release.

## 7. Branding and product evolution

**Status: Planned**

- [ ] Complete the planned brand transition at an appropriate future release.
- [ ] Update product identity, interface assets, repository documentation, and related references together.
- [ ] Communicate the change clearly when the new identity is officially announced.
- [ ] Preserve project history and explain any relevant naming or repository changes.

The name currently used in this repository is a working name. The future brand name is intentionally not disclosed here until it is ready to be made public.

## 8. Open-source community and sustainability

**Status: Long-term**

- [ ] Publish and maintain a clear open-source licence.
- [ ] Expand contribution guidelines and issue templates.
- [ ] Maintain release notes and communicate important changes.
- [ ] Welcome useful bug reports, documentation improvements, testing contributions, and code reviews.
- [ ] Establish transparent project governance appropriate to the project's size.
- [ ] Explore sustainable support while keeping essential utilities free.

## How to follow progress

- Browse the [open issues](https://github.com/aniekeme101/pdf-tools-platform/issues) for reported bugs and proposed improvements.
- Review the repository's commit history for implementation activity.
- Open an issue to report a reproducible problem or propose a focused improvement.
- Before starting substantial work, check existing issues and discuss the proposal with the maintainer.

## Contributing to the roadmap

This roadmap is expected to evolve. Suggestions are welcome, especially when they include:

1. The problem or user need being addressed.
2. The proposed outcome and why it matters.
3. Any security, privacy, accessibility, or maintenance considerations.
4. A practical way to test whether the work is complete.

Thank you for helping make the project more useful, reliable, accessible, and sustainable.
