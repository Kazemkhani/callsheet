import type { RunState } from "@/lib/types";

// Fixture used ONLY when GET /api/state is unreachable or non-200. The console
// shows an explicit offline banner whenever this is on screen: never a silent
// fallback. Numbers mirror a real mid-run state: 60 placed, 12 waitlisted.

export const demoState: RunState = {
  "runId": "run-demo-001",
  "stage": "collecting_replies",
  "request": "60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory. AED 297 per 8.5h. No meals. Transport allowance.",
  "brief": {
    "id": "evt-aies-2026",
    "name": "AI Everything Summit 2026",
    "venue": "ADNOC Centre, Abu Dhabi",
    "verifiedVenue": "ADNEC, Abu Dhabi",
    "city": "Abu Dhabi",
    "dates": [
      "2026-10-06",
      "2026-10-07"
    ],
    "hoursPerDay": 8.5,
    "shiftStart": "08:30",
    "shiftEnd": "18:00",
    "rateAedPerHour": 34.94,
    "training": {
      "date": "2026-10-05",
      "durationHours": 2,
      "mandatory": true,
      "onSite": true
    },
    "transport": "allowance",
    "meals": "none",
    "positions": [
      {
        "area": "Stage",
        "needed": 10
      },
      {
        "area": "Kids Zone",
        "needed": 10
      },
      {
        "area": "F&B",
        "needed": 10
      },
      {
        "area": "Traditional Games",
        "needed": 10
      },
      {
        "area": "Registration & Scanning",
        "needed": 10
      },
      {
        "area": "Info Desk",
        "needed": 10
      }
    ],
    "organiser": "inD FZE",
    "expectedAttendance": 45000,
    "sources": [
      "https://www.aieverythingsummit.com/",
      "https://www.adnec.ae/en/eventlisting/ai-everything-2026",
      "https://www.wam.ae/en/article/ai-everything-summit-2026-abu-dhabi"
    ]
  },
  "offers": [
    {
      "id": "off-001",
      "eventId": "evt-aies-2026",
      "usherId": "usher-01",
      "area": "Stage",
      "status": "sent",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.926,
      "reason": "matched to your Mubadala Tennis experience",
      "sentAt": "2026-09-12T09:10:00.000Z",
    },
    {
      "id": "off-002",
      "eventId": "evt-aies-2026",
      "usherId": "usher-56",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.904,
      "reason": "3 verified stage calls at ADNEC",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-003",
      "eventId": "evt-aies-2026",
      "usherId": "usher-71",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.867,
      "reason": "stage skill, verified Six Flags opening",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-004",
      "eventId": "evt-aies-2026",
      "usherId": "usher-02",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.836,
      "reason": "verified GISEC main stage crew",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-005",
      "eventId": "evt-aies-2026",
      "usherId": "usher-40",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.798,
      "reason": "run-of-show experience, rated 4.7",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-006",
      "eventId": "evt-aies-2026",
      "usherId": "usher-18",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.77,
      "reason": "matched to your Mubadala Tennis experience",
      "sentAt": "2026-09-12T09:15:00.000Z",
      "respondedAt": "2026-09-12T09:25:00.000Z"
    },
    {
      "id": "off-007",
      "eventId": "evt-aies-2026",
      "usherId": "usher-62",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.748,
      "reason": "3 verified stage calls at ADNEC",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-008",
      "eventId": "evt-aies-2026",
      "usherId": "usher-57",
      "area": "Stage",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.703,
      "reason": "stage skill, verified Six Flags opening",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-009",
      "eventId": "evt-aies-2026",
      "usherId": "usher-67",
      "area": "Stage",
      "status": "sent",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.69,
      "reason": "verified GISEC main stage crew",
      "sentAt": "2026-09-12T09:12:00.000Z"
    },
    {
      "id": "off-010",
      "eventId": "evt-aies-2026",
      "usherId": "usher-47",
      "area": "Stage",
      "status": "declined",
      "channel": [
        "telegram"
      ],
      "score": 0.653,
      "reason": "run-of-show experience, rated 4.7",
      "firstTimerSlot": true,
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-011",
      "eventId": "evt-aies-2026",
      "usherId": "usher-53",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.925,
      "reason": "verified kids activation at Global Village",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-012",
      "eventId": "evt-aies-2026",
      "usherId": "usher-44",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.906,
      "reason": "child-facing work, 2 verified events",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-013",
      "eventId": "evt-aies-2026",
      "usherId": "usher-12",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.868,
      "reason": "Arabic and English, kids zone rated 4.8",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-014",
      "eventId": "evt-aies-2026",
      "usherId": "usher-33",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.846,
      "reason": "verified Sharjah Children's Festival",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-015",
      "eventId": "evt-aies-2026",
      "usherId": "usher-24",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.803,
      "reason": "verified kids activation at Global Village",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-016",
      "eventId": "evt-aies-2026",
      "usherId": "usher-31",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.77,
      "reason": "child-facing work, 2 verified events",
      "sentAt": "2026-09-12T09:15:00.000Z",
      "respondedAt": "2026-09-12T09:25:00.000Z"
    },
    {
      "id": "off-017",
      "eventId": "evt-aies-2026",
      "usherId": "usher-03",
      "area": "Kids Zone",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.743,
      "reason": "Arabic and English, kids zone rated 4.8",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-018",
      "eventId": "evt-aies-2026",
      "usherId": "usher-72",
      "area": "Kids Zone",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.705,
      "reason": "verified Sharjah Children's Festival",
      "sentAt": "2026-09-12T09:11:00.000Z"
    },
    {
      "id": "off-019",
      "eventId": "evt-aies-2026",
      "usherId": "usher-30",
      "area": "Kids Zone",
      "status": "sent",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.686,
      "reason": "verified kids activation at Global Village",
      "sentAt": "2026-09-12T09:12:00.000Z"
    },
    {
      "id": "off-020",
      "eventId": "evt-aies-2026",
      "usherId": "usher-26",
      "area": "Kids Zone",
      "status": "proposed",
      "channel": [
        "telegram"
      ],
      "score": 0.647,
      "reason": "first shift, reserved newcomer slot",
      "firstTimerSlot": true
    },
    {
      "id": "off-021",
      "eventId": "evt-aies-2026",
      "usherId": "usher-13",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.928,
      "reason": "verified hospitality shift at Yas Marina",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-022",
      "eventId": "evt-aies-2026",
      "usherId": "usher-69",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.897,
      "reason": "F&B skill, food handler card on file",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-023",
      "eventId": "evt-aies-2026",
      "usherId": "usher-22",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.869,
      "reason": "verified Etihad lounge service",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-024",
      "eventId": "evt-aies-2026",
      "usherId": "usher-25",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.83,
      "reason": "rated 4.6 on F&B, 11 shifts",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-025",
      "eventId": "evt-aies-2026",
      "usherId": "usher-32",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.797,
      "reason": "verified hospitality shift at Yas Marina",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-026",
      "eventId": "evt-aies-2026",
      "usherId": "usher-41",
      "area": "F&B",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.776,
      "reason": "F&B skill, food handler card on file",
      "sentAt": "2026-09-12T09:15:00.000Z",
      "respondedAt": "2026-09-12T09:25:00.000Z"
    },
    {
      "id": "off-027",
      "eventId": "evt-aies-2026",
      "usherId": "usher-55",
      "area": "F&B",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.741,
      "reason": "verified Etihad lounge service",
      "sentAt": "2026-09-12T09:10:00.000Z"
    },
    {
      "id": "off-028",
      "eventId": "evt-aies-2026",
      "usherId": "usher-23",
      "area": "F&B",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.722,
      "reason": "rated 4.6 on F&B, 11 shifts",
      "sentAt": "2026-09-12T09:11:00.000Z"
    },
    {
      "id": "off-029",
      "eventId": "evt-aies-2026",
      "usherId": "usher-35",
      "area": "F&B",
      "status": "sent",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.678,
      "reason": "first shift, reserved newcomer slot",
      "firstTimerSlot": true,
      "sentAt": "2026-09-12T09:12:00.000Z"
    },
    {
      "id": "off-030",
      "eventId": "evt-aies-2026",
      "usherId": "usher-19",
      "area": "F&B",
      "status": "declined",
      "channel": [
        "telegram"
      ],
      "score": 0.648,
      "reason": "F&B skill, food handler card on file",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-031",
      "eventId": "evt-aies-2026",
      "usherId": "usher-63",
      "area": "Traditional Games",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.92,
      "reason": "verified heritage village crew, Qasr Al Hosn",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-032",
      "eventId": "evt-aies-2026",
      "usherId": "usher-36",
      "area": "Traditional Games",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.893,
      "reason": "Arabic first language, games host",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-033",
      "eventId": "evt-aies-2026",
      "usherId": "usher-50",
      "area": "Traditional Games",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.872,
      "reason": "verified Sheikh Zayed Festival games",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-034",
      "eventId": "evt-aies-2026",
      "usherId": "usher-68",
      "area": "Traditional Games",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.839,
      "reason": "first shift, reserved newcomer slot",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-035",
      "eventId": "evt-aies-2026",
      "usherId": "usher-58",
      "area": "Traditional Games",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.803,
      "reason": "verified heritage village crew, Qasr Al Hosn",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-036",
      "eventId": "evt-aies-2026",
      "usherId": "usher-20",
      "area": "Traditional Games",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.785,
      "reason": "Arabic first language, games host",
      "sentAt": "2026-09-12T09:15:00.000Z"
    },
    {
      "id": "off-037",
      "eventId": "evt-aies-2026",
      "usherId": "usher-10",
      "area": "Traditional Games",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.745,
      "reason": "verified Sheikh Zayed Festival games",
      "sentAt": "2026-09-12T09:10:00.000Z"
    },
    {
      "id": "off-038",
      "eventId": "evt-aies-2026",
      "usherId": "usher-54",
      "area": "Traditional Games",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.72,
      "reason": "first shift, reserved newcomer slot",
      "sentAt": "2026-09-12T09:11:00.000Z"
    },
    {
      "id": "off-039",
      "eventId": "evt-aies-2026",
      "usherId": "usher-61",
      "area": "Traditional Games",
      "status": "proposed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.69,
      "reason": "verified heritage village crew, Qasr Al Hosn"
    },
    {
      "id": "off-040",
      "eventId": "evt-aies-2026",
      "usherId": "usher-49",
      "area": "Traditional Games",
      "status": "proposed",
      "channel": [
        "telegram"
      ],
      "score": 0.66,
      "reason": "first shift, reserved newcomer slot",
      "firstTimerSlot": true
    },
    {
      "id": "off-041",
      "eventId": "evt-aies-2026",
      "usherId": "usher-45",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.925,
      "reason": "verified scanning at GITEX Global",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-042",
      "eventId": "evt-aies-2026",
      "usherId": "usher-27",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.906,
      "reason": "registration skill, 4 verified events",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-043",
      "eventId": "evt-aies-2026",
      "usherId": "usher-46",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.873,
      "reason": "verified accreditation desk, WETEX",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-044",
      "eventId": "evt-aies-2026",
      "usherId": "usher-51",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.839,
      "reason": "rated 4.4, scanner trained",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-045",
      "eventId": "evt-aies-2026",
      "usherId": "usher-70",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.799,
      "reason": "verified scanning at GITEX Global",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-046",
      "eventId": "evt-aies-2026",
      "usherId": "usher-39",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.783,
      "reason": "registration skill, 4 verified events",
      "sentAt": "2026-09-12T09:15:00.000Z",
      "respondedAt": "2026-09-12T09:25:00.000Z"
    },
    {
      "id": "off-047",
      "eventId": "evt-aies-2026",
      "usherId": "usher-66",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.745,
      "reason": "verified accreditation desk, WETEX",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-048",
      "eventId": "evt-aies-2026",
      "usherId": "usher-42",
      "area": "Registration & Scanning",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.712,
      "reason": "rated 4.4, scanner trained",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-049",
      "eventId": "evt-aies-2026",
      "usherId": "usher-16",
      "area": "Registration & Scanning",
      "status": "sent",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.674,
      "reason": "verified scanning at GITEX Global",
      "sentAt": "2026-09-12T09:12:00.000Z"
    },
    {
      "id": "off-050",
      "eventId": "evt-aies-2026",
      "usherId": "usher-65",
      "area": "Registration & Scanning",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.645,
      "reason": "registration skill, 4 verified events",
      "firstTimerSlot": true,
      "sentAt": "2026-09-12T09:13:00.000Z"
    },
    {
      "id": "off-051",
      "eventId": "evt-aies-2026",
      "usherId": "usher-38",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.923,
      "reason": "verified info desk at Abu Dhabi Art",
      "sentAt": "2026-09-12T09:10:00.000Z",
      "respondedAt": "2026-09-12T09:20:00.000Z"
    },
    {
      "id": "off-052",
      "eventId": "evt-aies-2026",
      "usherId": "usher-05",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.903,
      "reason": "trilingual, info desk rated 4.9",
      "sentAt": "2026-09-12T09:11:00.000Z",
      "respondedAt": "2026-09-12T09:21:00.000Z"
    },
    {
      "id": "off-053",
      "eventId": "evt-aies-2026",
      "usherId": "usher-59",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.87,
      "reason": "verified concierge work, Louvre Abu Dhabi",
      "sentAt": "2026-09-12T09:12:00.000Z",
      "respondedAt": "2026-09-12T09:22:00.000Z"
    },
    {
      "id": "off-054",
      "eventId": "evt-aies-2026",
      "usherId": "usher-37",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.84,
      "reason": "info desk skill, 3 verified events",
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-055",
      "eventId": "evt-aies-2026",
      "usherId": "usher-64",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.798,
      "reason": "verified info desk at Abu Dhabi Art",
      "sentAt": "2026-09-12T09:14:00.000Z",
      "respondedAt": "2026-09-12T09:24:00.000Z"
    },
    {
      "id": "off-056",
      "eventId": "evt-aies-2026",
      "usherId": "usher-17",
      "area": "Info Desk",
      "status": "confirmed",
      "channel": [
        "telegram"
      ],
      "score": 0.766,
      "reason": "trilingual, info desk rated 4.9",
      "sentAt": "2026-09-12T09:15:00.000Z",
      "respondedAt": "2026-09-12T09:25:00.000Z"
    },
    {
      "id": "off-057",
      "eventId": "evt-aies-2026",
      "usherId": "usher-06",
      "area": "Info Desk",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.751,
      "reason": "verified concierge work, Louvre Abu Dhabi",
      "sentAt": "2026-09-12T09:10:00.000Z"
    },
    {
      "id": "off-058",
      "eventId": "evt-aies-2026",
      "usherId": "usher-28",
      "area": "Info Desk",
      "status": "sent",
      "channel": [
        "telegram"
      ],
      "score": 0.719,
      "reason": "info desk skill, 3 verified events",
      "sentAt": "2026-09-12T09:11:00.000Z"
    },
    {
      "id": "off-059",
      "eventId": "evt-aies-2026",
      "usherId": "usher-29",
      "area": "Info Desk",
      "status": "proposed",
      "channel": [
        "telegram",
        "email"
      ],
      "score": 0.687,
      "reason": "verified info desk at Abu Dhabi Art"
    },
    {
      "id": "off-060",
      "eventId": "evt-aies-2026",
      "usherId": "usher-07",
      "area": "Info Desk",
      "status": "declined",
      "channel": [
        "telegram"
      ],
      "score": 0.656,
      "reason": "trilingual, info desk rated 4.9",
      "firstTimerSlot": true,
      "sentAt": "2026-09-12T09:13:00.000Z",
      "respondedAt": "2026-09-12T09:23:00.000Z"
    },
    {
      "id": "off-061",
      "eventId": "evt-aies-2026",
      "usherId": "usher-04",
      "area": "Stage",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.61,
      "reason": "matched to your Mubadala Tennis experience"
    },
    {
      "id": "off-062",
      "eventId": "evt-aies-2026",
      "usherId": "usher-15",
      "area": "Kids Zone",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.603,
      "reason": "child-facing work, 2 verified events"
    },
    {
      "id": "off-063",
      "eventId": "evt-aies-2026",
      "usherId": "usher-34",
      "area": "F&B",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.596,
      "reason": "verified Etihad lounge service"
    },
    {
      "id": "off-064",
      "eventId": "evt-aies-2026",
      "usherId": "usher-60",
      "area": "Traditional Games",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.589,
      "reason": "first shift, reserved newcomer slot"
    },
    {
      "id": "off-065",
      "eventId": "evt-aies-2026",
      "usherId": "usher-09",
      "area": "Registration & Scanning",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.582,
      "reason": "verified scanning at GITEX Global"
    },
    {
      "id": "off-066",
      "eventId": "evt-aies-2026",
      "usherId": "usher-48",
      "area": "Info Desk",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.575,
      "reason": "trilingual, info desk rated 4.9"
    },
    {
      "id": "off-067",
      "eventId": "evt-aies-2026",
      "usherId": "usher-14",
      "area": "Stage",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.568,
      "reason": "3 verified stage calls at ADNEC"
    },
    {
      "id": "off-068",
      "eventId": "evt-aies-2026",
      "usherId": "usher-11",
      "area": "Kids Zone",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.561,
      "reason": "verified Sharjah Children's Festival"
    },
    {
      "id": "off-069",
      "eventId": "evt-aies-2026",
      "usherId": "usher-08",
      "area": "F&B",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.554,
      "reason": "verified hospitality shift at Yas Marina"
    },
    {
      "id": "off-070",
      "eventId": "evt-aies-2026",
      "usherId": "usher-52",
      "area": "Traditional Games",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.547,
      "reason": "Arabic first language, games host"
    },
    {
      "id": "off-071",
      "eventId": "evt-aies-2026",
      "usherId": "usher-21",
      "area": "Registration & Scanning",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.54,
      "reason": "verified accreditation desk, WETEX"
    },
    {
      "id": "off-072",
      "eventId": "evt-aies-2026",
      "usherId": "usher-43",
      "area": "Info Desk",
      "status": "waitlisted",
      "channel": [
        "telegram"
      ],
      "score": 0.533,
      "reason": "info desk skill, 3 verified events"
    }
  ],
  "events": [
    {
      "id": "ev-01",
      "at": "2026-09-12T09:02:00.000Z",
      "tool": "research_event",
      "level": "info",
      "message": "Exa: 3 sources, venue resolved ADNOC Centre -> ADNEC, Abu Dhabi"
    },
    {
      "id": "ev-02",
      "at": "2026-09-12T09:04:00.000Z",
      "tool": "research_event",
      "level": "info",
      "message": "Brief written: 2 days, 08:30-18:00, 8.5h, AED 34.94/h, organiser inD FZE"
    },
    {
      "id": "ev-03",
      "at": "2026-09-12T09:06:00.000Z",
      "tool": "search_crew",
      "level": "info",
      "message": "CRM: 24 contacts matched on area skill, city and availability"
    },
    {
      "id": "ev-04",
      "at": "2026-09-12T09:08:00.000Z",
      "tool": "verify_experience",
      "level": "info",
      "message": "Exa: 61 claimed events checked, 48 verified, 13 unconfirmed"
    },
    {
      "id": "ev-05",
      "at": "2026-09-12T09:10:00.000Z",
      "tool": "verify_experience",
      "level": "warn",
      "message": "Exa: 2 claims unverifiable (no public record), scored without credit"
    },
    {
      "id": "ev-06",
      "at": "2026-09-12T09:12:00.000Z",
      "tool": "build_roster",
      "level": "info",
      "message": "Roster built: 60 placed, 12 waitlisted, 6 first-timer slots reserved"
    },
    {
      "id": "ev-07",
      "at": "2026-09-12T09:14:00.000Z",
      "tool": "approve_roster",
      "level": "info",
      "message": "Coordinator approved roster at 09:08"
    },
    {
      "id": "ev-08",
      "at": "2026-09-12T09:16:00.000Z",
      "tool": "send_offers",
      "level": "info",
      "message": "Telegram: 60 offers sent, 48 with email copy"
    },
    {
      "id": "ev-09",
      "at": "2026-09-12T09:18:00.000Z",
      "tool": "sync_workspace",
      "level": "warn",
      "message": "Ambiguous: tasks project created, 1 task retried after 429"
    },
    {
      "id": "ev-10",
      "at": "2026-09-12T09:20:00.000Z",
      "tool": "record_reply",
      "level": "info",
      "message": "Omar Tageldin: offer delivered, awaiting reply"
    },
    {
      "id": "ev-11",
      "at": "2026-09-12T09:22:00.000Z",
      "tool": "record_reply",
      "level": "info",
      "message": "Dana Sabbagh: no -> waitlist promoted, Kids Zone slot 8 re-offered"
    },
    {
      "id": "ev-12",
      "at": "2026-09-12T09:24:00.000Z",
      "tool": "record_reply",
      "level": "error",
      "message": "Telegram 400 for usher-37, offer queued for retry"
    },
    {
      "id": "ev-13",
      "at": "2026-09-12T09:26:00.000Z",
      "tool": "write_callsheet",
      "level": "info",
      "message": "Ambiguous document updated: call sheet, 39 confirmed of 60"
    }
  ],
  "workspace": {
    "connected": true,
    "agentEmail": "callsheet@callsheet-workspace.ambi.cc",
    "callsheetDocUrl": "https://app.ambiguous.ai/documents/callsheet-aies-2026",
    "projectId": "prj_aies_2026_staffing"
  },
  "updatedAt": "2026-09-12T09:30:00.000Z"
};

// usherId -> display name. The live API carries names through the CRM; the
// fixture needs its own directory so the grid and the phone view read as real.

export const demoDirectory: Record<string, string> = {
  "usher-01": "Omar Tageldin",
  "usher-02": "Fatima Al Mazrouei",
  "usher-03": "Mariam Al Shamsi",
  "usher-04": "Youssef El-Sayed",
  "usher-05": "Nourhan Abdelrahman",
  "usher-06": "Karim Haddad",
  "usher-07": "Layla Khoury",
  "usher-08": "Ahmad Qassem",
  "usher-09": "Rana Al-Bitar",
  "usher-10": "Priya Nair",
  "usher-11": "Arjun Menon",
  "usher-12": "Sneha Reddy",
  "usher-13": "Maria Santos",
  "usher-14": "Jerome Cruz",
  "usher-15": "Angelica Reyes",
  "usher-16": "Bilal Ahmed",
  "usher-17": "Ayesha Khan",
  "usher-18": "Hamza Malik",
  "usher-19": "Sara Al Nuaimi",
  "usher-20": "Khalid Al Falasi",
  "usher-21": "Rami Nassar",
  "usher-22": "Dana Sabbagh",
  "usher-23": "Tarek Fawzy",
  "usher-24": "Farah Zahran",
  "usher-25": "Noor Al Habsi",
  "usher-26": "Ibrahim Saleh",
  "usher-27": "Hala Darwish",
  "usher-28": "Marwan Tabbara",
  "usher-29": "Zainab Hussein",
  "usher-30": "Elias Moussa",
  "usher-31": "Reem Al Kaabi",
  "usher-32": "Daniel Fernandes",
  "usher-33": "Aisha Balooshi",
  "usher-34": "Salem Al Dhaheri",
  "usher-35": "Joanna Mercado",
  "usher-36": "Faisal Rahim",
  "usher-37": "Lina Haddadin",
  "usher-38": "Vikram Shetty",
  "usher-39": "Amina Sow",
  "usher-40": "Hussein Karaki",
  "usher-41": "Grace Okonkwo",
  "usher-42": "Talal Bin Saeed",
  "usher-43": "Yara Mansour",
  "usher-44": "Nikhil Prabhu",
  "usher-45": "Shaikha Al Ali",
  "usher-46": "Peter Mwangi",
  "usher-47": "Roula Chami",
  "usher-48": "Adnan Yusuf",
  "usher-49": "Mona Tawfik",
  "usher-50": "Rashid Al Marri",
  "usher-51": "Camille Dizon",
  "usher-52": "Basel Othman",
  "usher-53": "Nadia Farouk",
  "usher-54": "Omar Belhoul",
  "usher-55": "Sofia Ruiz",
  "usher-56": "Zaid Alami",
  "usher-57": "Hind Al Suwaidi",
  "usher-58": "Kevin Rodrigues",
  "usher-59": "Dalia Nassif",
  "usher-60": "Ammar Sheikh",
  "usher-61": "Leen Barakat",
  "usher-62": "Tomas Alvarez",
  "usher-63": "Huda Al Zaabi",
  "usher-64": "Samir Qureshi",
  "usher-65": "Nour Chalhoub",
  "usher-66": "Ethan Baptista",
  "usher-67": "Maya Srour",
  "usher-68": "Rakesh Iyer",
  "usher-69": "Alia Al Jaberi",
  "usher-70": "Joseph Kimani",
  "usher-71": "Rawan Attieh",
  "usher-72": "Saif Al Hammadi"
};
