// Google Calendar Service
// Handles OAuth flow and calendar event fetching

import { google } from "googleapis";
import prisma from "@/lib/db";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// Get OAuth2 client
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

/**
 * Exchange authorization code for tokens and save them
 */
export async function handleCallback(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Save or update tokens in database
  const existingToken = await prisma.calendarToken.findFirst({
    where: { provider: "google" },
  });

  if (existingToken) {
    await prisma.calendarToken.update({
      where: { id: existingToken.id },
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || existingToken.refreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  } else {
    await prisma.calendarToken.create({
      data: {
        provider: "google",
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  }
}

/**
 * Get authenticated OAuth client with stored tokens
 */
async function getAuthenticatedClient() {
  const token = await prisma.calendarToken.findFirst({
    where: { provider: "google" },
  });

  if (!token) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt?.getTime(),
  });

  // Refresh token if expired
  if (token.expiresAt && token.expiresAt < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.calendarToken.update({
        where: { id: token.id },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Delete invalid token
      await prisma.calendarToken.delete({ where: { id: token.id } });
      return null;
    }
  }

  return oauth2Client;
}

/**
 * Check if calendar is connected
 */
export async function isConnected(): Promise<boolean> {
  const token = await prisma.calendarToken.findFirst({
    where: { provider: "google" },
  });
  return !!token;
}

/**
 * Disconnect calendar (remove tokens)
 */
export async function disconnect(): Promise<void> {
  await prisma.calendarToken.deleteMany({
    where: { provider: "google" },
  });
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
}

/**
 * Get today's events from Google Calendar
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id!,
      title: event.summary || "Untitled",
      start: new Date(event.start?.dateTime || event.start?.date || now),
      end: new Date(event.end?.dateTime || event.end?.date || now),
      isAllDay: !event.start?.dateTime,
      location: event.location || undefined,
      description: event.description || undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id!,
      title: event.summary || "Untitled",
      start: new Date(event.start?.dateTime || event.start?.date || now),
      end: new Date(event.end?.dateTime || event.end?.date || now),
      isAllDay: !event.start?.dateTime,
      location: event.location || undefined,
      description: event.description || undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }
}

/**
 * Build calendar context for AI
 */
export async function buildCalendarContext(): Promise<string> {
  const connected = await isConnected();
  if (!connected) {
    return "";
  }

  const todayEvents = await getTodayEvents();
  if (todayEvents.length === 0) {
    return "\nCALENDAR: No events scheduled for today.";
  }

  const eventsList = todayEvents
    .map((e) => {
      const timeStr = e.isAllDay
        ? "All day"
        : `${e.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${e.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
      return `- ${e.title} (${timeStr})${e.location ? ` at ${e.location}` : ""}`;
    })
    .join("\n");

  return `\nTODAY'S CALENDAR (${todayEvents.length} events):
${eventsList}`;
}
