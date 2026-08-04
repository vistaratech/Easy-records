# EasyRecords AI Data Analysis Chatbot Implementation Plan

Add a dedicated AI Chatbot ("EasyRecords AI Assistant") to EasyRecords that analyzes the user's registers, folders, records, numbers, and activity logs to deliver instant data insights, summaries, total metrics, and custom query answers in Tamil, Tanglish, and English.

## User Review Required

> [!IMPORTANT]
> The chatbot will perform smart multi-register data analysis (totals, counts, averages, pending items, summaries) and answer questions about your app data.
> You will also be able to provide a **Gemini API Key** (optional) in settings or environment for advanced natural language reasoning, or use the built-in instant **Smart Data Analytics Engine**.

## Open Questions

> [!NOTE]
> None at present. Default options provide full offline Smart Data Analysis + full Gemini AI model integration.

## Proposed Changes

---

### Backend / API Services

#### [MODIFY] [api/index.js](file:///c:/Users/yoges/Desktop/Easy-records-live-last-month/api/index.js)
- Add `/api/chat` route to handle AI prompt requests.
- Gathers user's business metadata, folders, registers, column definitions, and records.
- Constructs an analytical prompt context and calls Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) or returns structured statistical analysis.

---

### Frontend Services & Data Aggregation

#### [NEW] [src/lib/aiChatService.ts](file:///c:/Users/yoges/Desktop/Easy-records-live-last-month/src/lib/aiChatService.ts)
- Helper service to aggregate live app data (businesses, folders, registers, entries, column values, numerical totals).
- Formats app data context into structured JSON/text representation.
- Provides fallback client-side AI analysis engine for fast response when backend API key is optional.

---

### UI Components & Navigation

#### [NEW] [src/components/chat/AIChatbotModal.tsx](file:///c:/Users/yoges/Desktop/Easy-records-live-last-month/src/components/chat/AIChatbotModal.tsx)
- Modern floating Chatbot UI (fixed at bottom-right corner).
- Features:
  - Smooth open/close drawer & floating button with badge.
  - Interactive quick quick-action chips ("📊 Overall Summary", "💰 Total Amounts & Expenses", "📁 List Registers", "❓ Find Pending Items").
  - Rich chat message renderer supporting Markdown tables, bold text, lists, and stats badges.
  - Custom API Key setup option in header menu.
  - Auto-scrolling, typing animations, error handling, and clear conversation history.

#### [NEW] [src/components/chat/AIChatbotModal.css](file:///c:/Users/yoges/Desktop/Easy-records-live-last-month/src/components/chat/AIChatbotModal.css)
- Sleek glassmorphism design system matching EasyRecords brand theme (dark blue gradients, smooth shadow, responsive layout for mobile and desktop).

#### [MODIFY] [src/pages/HomePage.tsx](file:///c:/Users/yoges/Desktop/Easy-records-live-last-month/src/pages/HomePage.tsx)
- Embed `AIChatbotModal` into the main application layout so it is available across all register, folder, and dashboard views.

---

## Verification Plan

### Automated Tests
- Build verification: Run `npm run build` to confirm TypeScript compilation with zero errors.

### Manual Verification
1. Launch app with `npm run dev`.
2. Open the AI Chatbot floating icon at the bottom right.
3. Click "📊 Overall Summary" chip and verify it summarizes registers, entries, and total values accurately.
4. Ask custom questions in Tamil/Tanglish (e.g. "total sales yenna?", "show registers list") and verify responses.
