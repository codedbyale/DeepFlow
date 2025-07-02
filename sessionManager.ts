import type DeepFlowPlugin from './main';
import { SessionType } from './timer';

export interface Session {
	type: SessionType;
	timestamp: number; // Unix timestamp
	duration: number; // in seconds (actual time spent)
	name?: string; // optional session name
}

export interface SessionStats {
	today: number;
	week: number;
	month: number;
	year: number;
	total: number;
}

export class SessionManager {
	private plugin: DeepFlowPlugin;
	private sessions: Session[] = [];

	constructor(plugin: DeepFlowPlugin) {
		this.plugin = plugin;
		this.loadSessions();
	}

	async saveSession(session: Session): Promise<void> {
		this.sessions.push(session);
		await this.saveSessions();
	}

	getSessionStats(): SessionStats {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(today);
		weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const yearStart = new Date(now.getFullYear(), 0, 1);

		const workSessions = this.sessions.filter(s => s.type === SessionType.WORK);

		return {
			today: workSessions.filter(s => s.timestamp >= today.getTime()).length,
			week: workSessions.filter(s => s.timestamp >= weekStart.getTime()).length,
			month: workSessions.filter(s => s.timestamp >= monthStart.getTime()).length,
			year: workSessions.filter(s => s.timestamp >= yearStart.getTime()).length,
			total: workSessions.length
		};
	}

	getRecentSessions(limit: number = 10): Session[] {
		return this.sessions
			.slice(-limit)
			.reverse(); // Most recent first
	}

	getTodaySessions(): Session[] {
		const today = new Date();
		const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		
		return this.sessions.filter(s => s.timestamp >= todayStart.getTime());
	}

	getSessionsByDateRange(startDate: Date, endDate: Date): Session[] {
		return this.sessions.filter(s => 
			s.timestamp >= startDate.getTime() && 
			s.timestamp <= endDate.getTime()
		);
	}

	getTotalTimeSpent(): number {
		return this.sessions.reduce((total, session) => total + session.duration, 0);
	}

	getTotalTimeSpentToday(): number {
		const todaySessions = this.getTodaySessions();
		return todaySessions.reduce((total, session) => total + session.duration, 0);
	}

	// Get productivity streak (consecutive days with at least one work session)
	getProductivityStreak(): number {
		const workSessions = this.sessions.filter(s => s.type === SessionType.WORK);
		if (workSessions.length === 0) return 0;

		// Group sessions by date
		const sessionsByDate = new Map<string, Session[]>();
		workSessions.forEach(session => {
			const date = new Date(session.timestamp);
			const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
			
			if (!sessionsByDate.has(dateKey)) {
				sessionsByDate.set(dateKey, []);
			}
			sessionsByDate.get(dateKey)!.push(session);
		});

		// Count consecutive days from today backwards
		let streak = 0;
		const today = new Date();
		
		for (let i = 0; i < 365; i++) { // Max 365 days to prevent infinite loop
			const checkDate = new Date(today);
			checkDate.setDate(today.getDate() - i);
			const dateKey = checkDate.toISOString().split('T')[0];
			
			if (sessionsByDate.has(dateKey)) {
				streak++;
			} else if (i > 0) { // Don't break on first day (today) if no sessions
				break;
			}
		}

		return streak;
	}

	async clearAllSessions(): Promise<void> {
		this.sessions = [];
		await this.saveSessions();
	}

	async exportSessions(): Promise<string> {
		// Export as CSV format
		const headers = ['Type', 'Date', 'Time', 'Duration (min)', 'Name'];
		const rows = this.sessions.map(session => {
			const date = new Date(session.timestamp);
			return [
				session.type,
				date.toISOString().split('T')[0],
				date.toTimeString().split(' ')[0],
				Math.round(session.duration / 60),
				session.name || ''
			];
		});

		const csv = [headers, ...rows]
			.map(row => row.map(cell => `"${cell}"`).join(','))
			.join('\n');

		return csv;
	}

	private async loadSessions(): Promise<void> {
		try {
			const data = await this.plugin.loadData();
			this.sessions = data?.sessions || [];
		} catch (error) {
			console.error('Failed to load sessions:', error);
			this.sessions = [];
		}
	}

	private async saveSessions(): Promise<void> {
		try {
			const currentData = await this.plugin.loadData() || {};
			currentData.sessions = this.sessions;
			await this.plugin.saveData(currentData);
		} catch (error) {
			console.error('Failed to save sessions:', error);
		}
	}

	// Helper method to format duration
	static formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}
} 