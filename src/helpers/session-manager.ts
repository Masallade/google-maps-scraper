import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Place from '../interfaces/types/Place';

interface ScraperSession {
  id: string;
  startTime: number;
  query: string;
  lastPageUrl?: string;
  processedItems: number;
  results: Place[];
  status: 'running' | 'paused' | 'completed' | 'failed';
  errorReason?: string;
  filters?: any;
  cookies?: any[];
  userAgent?: string;
}

export default class SessionManager {
  private sessions: Map<string, ScraperSession> = new Map();
  private sessionDirectory: string;

  constructor() {
    // Create a sessions directory in app data
    this.sessionDirectory = path.join(app.getPath('userData'), 'sessions');
    this.ensureDirectoryExists();
    this.loadSessions();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.sessionDirectory)) {
      fs.mkdirSync(this.sessionDirectory, { recursive: true });
    }
  }

  private loadSessions(): void {
    try {
      const sessionFiles = fs.readdirSync(this.sessionDirectory);
      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          try {
            const sessionPath = path.join(this.sessionDirectory, file);
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            this.sessions.set(sessionData.id, sessionData);
          } catch (error) {
            console.error(`Error loading session file ${file}:`, error);
          }
        }
      }
      console.log(`Loaded ${this.sessions.size} scraper sessions`);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  public createSession(query: string, filters?: any): string {
    const sessionId = this.generateSessionId();
    const session: ScraperSession = {
      id: sessionId,
      startTime: Date.now(),
      query,
      processedItems: 0,
      results: [],
      status: 'running',
      filters
    };
    
    this.sessions.set(sessionId, session);
    this.saveSession(sessionId);
    return sessionId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public saveSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const sessionPath = path.join(this.sessionDirectory, `${sessionId}.json`);
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error(`Error saving session ${sessionId}:`, error);
    }
  }

  public getSession(sessionId: string): ScraperSession | undefined {
    return this.sessions.get(sessionId);
  }

  public updateSessionStatus(sessionId: string, status: ScraperSession['status'], errorReason?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = status;
    if (errorReason) session.errorReason = errorReason;
    this.saveSession(sessionId);
  }

  public updateSessionProgress(
    sessionId: string, 
    processedItems: number, 
    newResults: Place[] = [], 
    lastPageUrl?: string,
    cookies?: any[]
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.processedItems = processedItems;
    session.results = [...session.results, ...newResults];
    if (lastPageUrl) session.lastPageUrl = lastPageUrl;
    if (cookies) session.cookies = cookies;
    this.saveSession(sessionId);
  }

  public getActiveSessions(): ScraperSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.status === 'running' || session.status === 'paused');
  }

  public setUserAgent(sessionId: string, userAgent: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.userAgent = userAgent;
    this.saveSession(sessionId);
  }

  public saveBrowserCookies(sessionId: string, cookies: any[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.cookies = cookies;
    this.saveSession(sessionId);
  }
} 