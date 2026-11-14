# Development Assistance Disclosure

The 2026 NASA Space Apps Challenge asks participants to state where and how Super Intelligence (SI) tools were used, including assistance with code and data. This is EarthBeat's disclosure.

## Statement

SI-assisted tools supported project planning, code generation, debugging, testing and documentation under the registered participant's direction and review. The participant selected the challenge, set the product goals and accessibility priorities, chose the NASA visualization, evaluated sources, made final decisions, tested the application and accepts responsibility for the submission.

EarthBeat contains **no SI-generated scientific data, imagery, video, narration, voice or music**. Its sound is produced deterministically, in the listener's browser, from NASA visual frames through the documented code in this repository.

## Where assistance was used

| Area | Assistance | Not assisted / not generated |
|---|---|---|
| Planning | Structuring the build plan and checklists from the creator's written brief | Choice of challenge, concept, audience and priorities (creator) |
| Code | Drafting and revising application, analysis, audio and test code | — |
| Data processing | Drafting the FFmpeg re-encode command and the offline analysis scripts | The input data itself (NASA SVS video) |
| Debugging and testing | Diagnosing failures, writing automated tests, running checks | Test results are real outputs of the tools listed in the test report |
| Documentation | Drafting README, methodology, accessibility and submission text | Factual claims were checked against the NASA source page, the video frames and the test output |

## What is not SI-generated

- The NASA visualization (NASA's Scientific Visualization Studio).
- All analysis values and audio: computed by deterministic code from the video frames.
- Screenshots: captures of the running application.
- Icons and diagrams: simple original SVG/CSS shapes written as code.

This disclosure also appears in the application's Sources section and in the page metadata (`<meta name="earthbeat:assistance">`).
