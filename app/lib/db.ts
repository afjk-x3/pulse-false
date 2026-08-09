// Unified client database layer with LocalStorage fallback.

export interface UserAccount {
  username: string;
  name: string;
  role: 'employee' | 'manager' | 'admin';
  roleName: string;
  avatar: string;
  title: string;
  email: string;
  timezone?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  password?: string;
}

export interface CalendarOverrideRecord {
  id: string;
  actorHash: string;
  timestamp: number;
  inviteeCount: number;
}

export interface SecurityConfig {
  ssoProvider: 'none' | 'okta' | 'entra_id';
  scimEnabled: boolean;
  dataResidency: 'US' | 'EU' | 'APAC';
  kmsKeyUrl: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: number;
}

export interface BRIShiftRecord {
  id: string;
  fromBand: string;
  toBand: string;
  timestamp: number;
  factors: { name: string; weight: number; details: string }[];
}

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    username: 'alex',
    name: 'Alex Rivera',
    role: 'employee',
    roleName: 'Employee',
    avatar: 'AR',
    title: 'Marketing Lead',
    email: 'alex.rivera@axionhr.com',
    timezone: 'America/New_York',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00'
  },
  {
    username: 'derek',
    name: 'Derek Vance',
    role: 'manager',
    roleName: 'HR Manager',
    avatar: 'DV',
    title: 'Director of Employee Experience',
    email: 'derek.vance@axionhr.com',
    timezone: 'America/Chicago',
    workingHoursStart: '08:30',
    workingHoursEnd: '17:30'
  },
  {
    username: 'priya',
    name: 'Priya Sharma',
    role: 'admin',
    roleName: 'System Administrator',
    avatar: 'PS',
    title: 'Chief Information Security Officer',
    email: 'priya.sharma@axionhr.com',
    timezone: 'Europe/London',
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00'
  }
];

export interface AdminConfig {
  workingHoursStart: string;
  workingHoursEnd: string;
  holidayCalendar: string;
  kanonymityFloor: number;
  eapLink: string;
  systemPaused: boolean;
  webcamCVGlobalDisabled: boolean;
}

export interface CoffeeRouletteState {
  pairedName: string;
  pairedRole: string;
  pairedAvatar: string;
  conversationStarters: string[];
  schedulingLink: string;
  paused: boolean;
}

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  holidayCalendar: 'US Federal',
  kanonymityFloor: 5,
  eapLink: 'https://axionhr.com/eap-counseling',
  systemPaused: false,
  webcamCVGlobalDisabled: false
};

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  ssoProvider: 'none',
  scimEnabled: false,
  dataResidency: 'US',
  kmsKeyUrl: ''
};

const DEFAULT_OPT_IN_ANALYTICS = {
  webcamCV: 34,
  messagingSync: 72,
  supportCircles: 58
};

const DEFAULT_COFFEE_ROULETTE: CoffeeRouletteState = {
  pairedName: 'Sophia Chen',
  pairedRole: 'Senior UX Designer',
  pairedAvatar: 'SC',
  conversationStarters: [
    'How are you finding the focus dimming feature in WBG?',
    'What is your go-to routine for screen breaks?',
    'What was the most inspiring Kudos note you read this week?'
  ],
  schedulingLink: 'https://calendly.com/axionhr-coffee-roulette/sophia',
  paused: false
};

export interface SentimentRecord {
  id: string;
  date: string;
  score: number; // 1 to 5
  emoji: string;
  timestamp: number;
}

export interface OutboxMessage {
  id: string;
  recipient: string;
  subject: string;
  scheduledTime: string;
  content: string;
  status: 'scheduled' | 'sent' | 'cancelled';
}

export interface KudosRecord {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  date: string;
  category: string;
  likes: number;
  likedBy?: string[];
}

export interface SupportMessage {
  id: string;
  circleId: string;
  author: string;
  content: string;
  timestamp: number;
  isAnonymous: boolean;
}

const DEFAULT_BURN_OUT_RISK = [
  { date: 'Mon', score: 1 }, // sage
  { date: 'Tue', score: 2 }, // cerulean
  { date: 'Wed', score: 1 }, // sage
  { date: 'Thu', score: 3 }, // terracotta
  { date: 'Fri', score: 2 }, // cerulean
  { date: 'Sat', score: 1 }, // sage
  { date: 'Sun', score: 1 }, // sage
];

const DEFAULT_KUDOS: KudosRecord[] = [
  {
    id: 'k1',
    sender: 'Jane Doe',
    recipient: 'Alex Rivera',
    text: 'A huge thank you to Alex for helping resolve the client server outage yesterday night! Superb team player.',
    date: '2026-08-09',
    category: 'Collaboration',
    likes: 4,
  },
  {
    id: 'k2',
    sender: 'Marcus Chen',
    recipient: 'Sarah Jenkins',
    text: 'Sarah delivered an exceptionally clean design spec for our well-being toolbar. Truly inspiring work!',
    date: '2026-08-08',
    category: 'Inspiration',
    likes: 8,
  },
  {
    id: 'k3',
    sender: 'Anonymous',
    recipient: 'Taylor Smith',
    text: 'Taylor volunteered to cover my on-call duty so I could attend my childs graduation. Beyond grateful!',
    date: '2026-08-07',
    category: 'Gratitude',
    likes: 12,
  }
];

const DEFAULT_OUTBOX: OutboxMessage[] = [
  {
    id: 'o1',
    recipient: 'marketing-team@axionhr.com',
    subject: 'Feedback: Q3 Campaign Proposal Review',
    scheduledTime: 'Tomorrow at 09:00 AM (Disconnection Safety Guard active)',
    content: 'Hi Team, I reviewed the Q3 campaign proposal. It looks solid. We should focus on clarifying the accessibility guidelines mentioned in slides 8-10. See you in the morning!',
    status: 'scheduled',
  },
  {
    id: 'o2',
    recipient: 'richard.hr@axionhr.com',
    subject: 'Monthly Performance Log - July',
    scheduledTime: 'Monday at 08:30 AM (Disconnection Safety Guard active)',
    content: 'Hello Richard, attaching the July well-being indicators check-in. The team average is looking solid, and we are within the desired k-anonymity compliance safety margins.',
    status: 'scheduled',
  }
];

const DEFAULT_SUPPORT_MESSAGES: SupportMessage[] = [
  // Parenting Support Circle
  { id: 'sm1', circleId: 'parenting', author: 'Parent-A', content: 'Anyone else struggling to balance school pick-up times with core development meeting hours?', timestamp: Date.now() - 3600000 * 4, isAnonymous: true },
  { id: 'sm2', circleId: 'parenting', author: 'Parent-B', content: 'Absolutely. We set a core block on our team calendar so no meetings happen between 3 PM and 4 PM. Highly recommend suggesting it!', timestamp: Date.now() - 3600000 * 2, isAnonymous: true },

  // Stress Reduction Circle
  { id: 'sm3', circleId: 'stress', author: 'SlightlyStressed', content: 'Do you guys actually take the 5-minute break reminders? Or just snooze them?', timestamp: Date.now() - 3600000 * 5, isAnonymous: true },
  { id: 'sm4', circleId: 'stress', author: 'MindfulCoder', content: 'I started forcing myself to stand up and walk to the window. It actually helps reset focus.', timestamp: Date.now() - 3600000 * 3, isAnonymous: true },

  // Neurodiversity Circle
  { id: 'sm5', circleId: 'neurodiversity', author: 'FocusFinder', content: 'The open-plan office can be sensory overload. Does anyone have recommendations for noise-canceling headphones that are comfortable for 6+ hours?', timestamp: Date.now() - 3600000 * 8, isAnonymous: true }
];

export class PulseDB {
  static getSentimentLogs(): SentimentRecord[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('pulse-sentiment-logs');
    if (!data) return [];
    return JSON.parse(data);
  }

  static addSentimentLog(score: number, emoji: string): SentimentRecord {
    const logs = this.getSentimentLogs();
    const newLog: SentimentRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short' }),
      score,
      emoji,
      timestamp: Date.now()
    };
    logs.push(newLog);
    localStorage.setItem('pulse-sentiment-logs', JSON.stringify(logs));

    // Capture old risk band before updating
    const oldRisks = this.getBurnoutRiskIndex();
    const oldScore = oldRisks.length > 0 ? oldRisks[oldRisks.length - 1].score : 1;
    const oldBand = this.getRiskBandName(oldScore);

    // Dynamically adjust today's risk index value based on sentiment log
    // Map score 1-2 -> High Risk (3), 3 -> Moderate Risk (2), 4-5 -> Low Risk (1)
    const riskScore = score <= 2 ? 3 : score === 3 ? 2 : 1;
    this.updateTodayRiskIndex(riskScore);

    // Auto-detect BRI category shift
    const newBand = this.getRiskBandName(riskScore);
    if (oldBand !== newBand) {
      const factors = [
        { name: 'Meeting Overhang', weight: 42, details: '6.2 hours of back-to-back calendar appointments.' },
        { name: 'Off-Hours Activity Drift', weight: 35, details: 'Composing communications 1.5h past configured working hours.' },
        { name: 'Focus Interruption Cadence', weight: 23, details: 'High DOM tab-shifting rates (18 shifts/hr) in focus domains.' }
      ];
      this.addBRIShift(oldBand, newBand, factors);
    }

    return newLog;
  }

  static getRiskBandName(score: number): string {
    if (score === 1) return 'Low';
    if (score === 2) return 'Moderate';
    return 'Elevated';
  }

  static getBurnoutRiskIndex() {
    if (typeof window === 'undefined') return DEFAULT_BURN_OUT_RISK;
    const data = localStorage.getItem('pulse-burnout-risk');
    if (!data) {
      localStorage.setItem('pulse-burnout-risk', JSON.stringify(DEFAULT_BURN_OUT_RISK));
      return DEFAULT_BURN_OUT_RISK;
    }
    return JSON.parse(data);
  }

  static updateTodayRiskIndex(score: number) {
    const risks = [...this.getBurnoutRiskIndex()];
    // Update the last element (representing today, e.g. "Sun" or current day)
    if (risks.length > 0) {
      risks[risks.length - 1].score = score;
    }
    localStorage.setItem('pulse-burnout-risk', JSON.stringify(risks));
  }

  static getOutboxMessages(): OutboxMessage[] {
    if (typeof window === 'undefined') return DEFAULT_OUTBOX;
    const data = localStorage.getItem('pulse-outbox');
    if (!data) {
      localStorage.setItem('pulse-outbox', JSON.stringify(DEFAULT_OUTBOX));
      return DEFAULT_OUTBOX;
    }
    return JSON.parse(data);
  }

  static addOutboxMessage(recipient: string, subject: string, content: string): OutboxMessage {
    const messages = this.getOutboxMessages();
    const newMessage: OutboxMessage = {
      id: Math.random().toString(36).substring(2, 9),
      recipient,
      subject,
      scheduledTime: 'Scheduled for next business hours (Disconnection Safety Guard active)',
      content,
      status: 'scheduled',
    };
    messages.push(newMessage);
    localStorage.setItem('pulse-outbox', JSON.stringify(messages));
    return newMessage;
  }

  static updateOutboxMessage(id: string, updatedFields: Partial<OutboxMessage>): OutboxMessage[] {
    const messages = this.getOutboxMessages().map(msg => {
      if (msg.id === id) {
        return { ...msg, ...updatedFields };
      }
      return msg;
    });
    localStorage.setItem('pulse-outbox', JSON.stringify(messages));
    return messages;
  }

  static getKudos(): KudosRecord[] {
    if (typeof window === 'undefined') return DEFAULT_KUDOS;
    const data = localStorage.getItem('pulse-kudos');
    if (!data) {
      localStorage.setItem('pulse-kudos', JSON.stringify(DEFAULT_KUDOS));
      return DEFAULT_KUDOS;
    }
    return JSON.parse(data);
  }

  static addKudos(recipient: string, text: string, category: KudosRecord['category'], sender = 'Anonymous'): KudosRecord {
    const kudos = this.getKudos();
    const newKudos: KudosRecord = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      recipient,
      text,
      date: new Date().toISOString().split('T')[0],
      category,
      likes: 0,
    };
    kudos.unshift(newKudos);
    localStorage.setItem('pulse-kudos', JSON.stringify(kudos));
    return newKudos;
  }

  static likeKudos(id: string, username: string): KudosRecord[] {
    const kudos = this.getKudos().map(item => {
      if (item.id === id) {
        const likedBy = item.likedBy || [];
        if (likedBy.includes(username)) {
          return {
            ...item,
            likes: Math.max(0, item.likes - 1),
            likedBy: likedBy.filter(u => u !== username)
          };
        } else {
          return {
            ...item,
            likes: item.likes + 1,
            likedBy: [...likedBy, username]
          };
        }
      }
      return item;
    });
    localStorage.setItem('pulse-kudos', JSON.stringify(kudos));
    return kudos;
  }

  static getSupportMessages(): SupportMessage[] {
    if (typeof window === 'undefined') return DEFAULT_SUPPORT_MESSAGES;
    const data = localStorage.getItem('pulse-support-messages');
    if (!data) {
      localStorage.setItem('pulse-support-messages', JSON.stringify(DEFAULT_SUPPORT_MESSAGES));
      return DEFAULT_SUPPORT_MESSAGES;
    }
    return JSON.parse(data);
  }

  static addSupportMessage(circleId: string, content: string, author = 'Anonymous', isAnonymous = true): SupportMessage {
    const messages = this.getSupportMessages();
    const newMessage: SupportMessage = {
      id: Math.random().toString(36).substring(2, 9),
      circleId,
      author: isAnonymous ? 'Anonymous' : author,
      content,
      timestamp: Date.now(),
      isAnonymous,
    };
    messages.push(newMessage);
    localStorage.setItem('pulse-support-messages', JSON.stringify(messages));
    return newMessage;
  }

  static getAdminConfig(): AdminConfig {
    if (typeof window === 'undefined') return DEFAULT_ADMIN_CONFIG;
    const data = localStorage.getItem('pulse-admin-config');
    if (!data) {
      localStorage.setItem('pulse-admin-config', JSON.stringify(DEFAULT_ADMIN_CONFIG));
      return DEFAULT_ADMIN_CONFIG;
    }
    return JSON.parse(data);
  }

  static updateAdminConfig(fields: Partial<AdminConfig>): AdminConfig {
    const config = { ...this.getAdminConfig(), ...fields };
    localStorage.setItem('pulse-admin-config', JSON.stringify(config));
    
    // Sync systemPaused value to pulse-cv-active
    if (fields.systemPaused !== undefined) {
      localStorage.setItem('pulse-cv-active', String(!fields.systemPaused));
    }
    return config;
  }

  static getCoffeeRoulette(): CoffeeRouletteState {
    if (typeof window === 'undefined') return DEFAULT_COFFEE_ROULETTE;
    const data = localStorage.getItem('pulse-coffee-roulette');
    if (!data) {
      localStorage.setItem('pulse-coffee-roulette', JSON.stringify(DEFAULT_COFFEE_ROULETTE));
      return DEFAULT_COFFEE_ROULETTE;
    }
    return JSON.parse(data);
  }

  static updateCoffeeRoulette(fields: Partial<CoffeeRouletteState>): CoffeeRouletteState {
    const state = { ...this.getCoffeeRoulette(), ...fields };
    localStorage.setItem('pulse-coffee-roulette', JSON.stringify(state));
    return state;
  }

  static getUserAccounts(): UserAccount[] {
    if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
    const data = localStorage.getItem('pulse-user-accounts');
    if (!data) {
      localStorage.setItem('pulse-user-accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    return JSON.parse(data);
  }

  static addUserAccount(account: UserAccount): UserAccount | null {
    const accounts = this.getUserAccounts();
    if (accounts.some(a => a.username.toLowerCase() === account.username.toLowerCase())) {
      return null;
    }
    accounts.push(account);
    localStorage.setItem('pulse-user-accounts', JSON.stringify(accounts));
    return account;
  }

  static purgeUserData() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('pulse-sentiment-logs');
    localStorage.removeItem('pulse-burnout-risk');
    localStorage.removeItem('pulse-outbox');
    localStorage.removeItem('pulse-kudos');
    localStorage.removeItem('pulse-support-messages');
    localStorage.removeItem('pulse-dyslexic');
    localStorage.removeItem('pulse-ruler');
    localStorage.removeItem('pulse-contrast');
    localStorage.removeItem('pulse-font-scale');
    localStorage.removeItem('pulse-admin-config');
    localStorage.removeItem('pulse-coffee-roulette');
    localStorage.removeItem('pulse-cv-consent');
    localStorage.removeItem('pulse-cv-active');
    localStorage.removeItem('pulse-user-accounts');
    localStorage.removeItem('pulse-morning-checkin-triggered-date');
    localStorage.removeItem('pulse-exit-checkin-triggered-date');
    localStorage.removeItem('pulse-calendar-overrides');
    localStorage.removeItem('pulse-security-config');
    localStorage.removeItem('pulse-audit-log');
    localStorage.removeItem('pulse-opt-in-analytics');
    localStorage.removeItem('pulse-bri-shifts');
    localStorage.removeItem('pulse-bri-share-manager');

    // Reloading
    window.location.reload();
  }

  // === Calendar Guard ===

  static getCalendarOverrides(): CalendarOverrideRecord[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('pulse-calendar-overrides');
    if (!data) return [];
    return JSON.parse(data);
  }

  static addCalendarOverride(actorHash: string, inviteeCount: number): CalendarOverrideRecord {
    const overrides = this.getCalendarOverrides();
    const record: CalendarOverrideRecord = {
      id: Math.random().toString(36).substring(2, 9),
      actorHash,
      timestamp: Date.now(),
      inviteeCount
    };
    overrides.push(record);
    localStorage.setItem('pulse-calendar-overrides', JSON.stringify(overrides));
    this.addAuditLogEntry('System', `Calendar Guard override: scheduled meeting with ${inviteeCount} invitee(s) outside working hours.`);
    return record;
  }

  // === Security Config ===

  static getSecurityConfig(): SecurityConfig {
    if (typeof window === 'undefined') return DEFAULT_SECURITY_CONFIG;
    const data = localStorage.getItem('pulse-security-config');
    if (!data) {
      localStorage.setItem('pulse-security-config', JSON.stringify(DEFAULT_SECURITY_CONFIG));
      return DEFAULT_SECURITY_CONFIG;
    }
    return JSON.parse(data);
  }

  static updateSecurityConfig(fields: Partial<SecurityConfig>): SecurityConfig {
    const config = { ...this.getSecurityConfig(), ...fields };
    localStorage.setItem('pulse-security-config', JSON.stringify(config));
    return config;
  }

  // === Audit Log ===

  static getAuditLog(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('pulse-audit-log');
    if (!data) return [];
    return JSON.parse(data);
  }

  static addAuditLogEntry(actor: string, action: string): AuditLogEntry {
    const log = this.getAuditLog();
    const entry: AuditLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      actor,
      action,
      timestamp: Date.now()
    };
    log.push(entry);
    localStorage.setItem('pulse-audit-log', JSON.stringify(log));
    return entry;
  }

  // === Opt-in Analytics ===

  static getOptInAnalytics(): { webcamCV: number; messagingSync: number; supportCircles: number } {
    if (typeof window === 'undefined') return DEFAULT_OPT_IN_ANALYTICS;
    const data = localStorage.getItem('pulse-opt-in-analytics');
    if (!data) {
      localStorage.setItem('pulse-opt-in-analytics', JSON.stringify(DEFAULT_OPT_IN_ANALYTICS));
      return DEFAULT_OPT_IN_ANALYTICS;
    }
    return JSON.parse(data);
  }

  // === BRI Shift Log ===

  static getBRIShifts(): BRIShiftRecord[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('pulse-bri-shifts');
    if (!data) return [];
    return JSON.parse(data);
  }

  static addBRIShift(fromBand: string, toBand: string, factors: { name: string; weight: number; details: string }[]): BRIShiftRecord {
    const shifts = this.getBRIShifts();
    const record: BRIShiftRecord = {
      id: Math.random().toString(36).substring(2, 9),
      fromBand,
      toBand,
      timestamp: Date.now(),
      factors
    };
    shifts.push(record);
    localStorage.setItem('pulse-bri-shifts', JSON.stringify(shifts));
    return record;
  }
}
