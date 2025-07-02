import { Notice } from 'obsidian';
import type DeepFlowPlugin from './main';
import type { SessionManager } from './sessionManager';

export enum SessionType {
	WORK = 'work',
	SHORT_BREAK = 'short-break',
	LONG_BREAK = 'long-break'
}

export enum TimerState {
	IDLE = 'idle',
	RUNNING = 'running',
	PAUSED = 'paused'
}

export interface TimerStatus {
	state: TimerState;
	sessionType: SessionType;
	timeLeft: number; // in seconds
	totalTime: number; // in seconds
	sessionCount: number; // work sessions completed
}

export class TimerEngine {
	private plugin: DeepFlowPlugin;
	private sessionManager: SessionManager;
	private intervalId: number | null = null;
	private state: TimerState = TimerState.IDLE;
	private sessionType: SessionType = SessionType.WORK;
	private timeLeft: number = 0;
	private totalTime: number = 0;
	private sessionCount: number = 0;
	private sessionStartTime: number = 0;

	constructor(plugin: DeepFlowPlugin, sessionManager: SessionManager) {
		this.plugin = plugin;
		this.sessionManager = sessionManager;
		this.reset();
	}

	getStatus(): TimerStatus {
		return {
			state: this.state,
			sessionType: this.sessionType,
			timeLeft: this.timeLeft,
			totalTime: this.totalTime,
			sessionCount: this.sessionCount
		};
	}

	start(): void {
		if (this.state === TimerState.RUNNING) return;

		this.state = TimerState.RUNNING;
		this.sessionStartTime = Date.now();

		this.intervalId = window.setInterval(() => {
			this.timeLeft--;

			if (this.timeLeft <= 0) {
				this.onSessionComplete();
			}

			this.notifyStatusUpdate();
		}, 1000);

		this.notifyStatusUpdate();
	}

	pause(): void {
		if (this.state !== TimerState.RUNNING) return;

		this.state = TimerState.PAUSED;
		
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.notifyStatusUpdate();
	}

	reset(): void {
		this.pause();
		this.state = TimerState.IDLE;
		this.sessionType = SessionType.WORK;
		this.updateTimeForCurrentSession();
		this.notifyStatusUpdate();
	}

	skip(): void {
		this.onSessionComplete();
	}

	private onSessionComplete(): void {
		this.pause();

		// Save the session
		this.sessionManager.saveSession({
			type: this.sessionType,
			timestamp: this.sessionStartTime,
			duration: this.totalTime - this.timeLeft, // actual time spent
			name: '' // TODO: Allow naming sessions
		});

		// Show notifications
		this.showNotifications();

		// Move to next session type
		this.moveToNextSession();

		// Auto-start if enabled
		if (this.plugin.settings.autoStartNextSession) {
			setTimeout(() => this.start(), 2000); // 2 second delay
		}
	}

	private moveToNextSession(): void {
		if (this.sessionType === SessionType.WORK) {
			this.sessionCount++;
			
			// Check if it's time for a long break
			if (this.sessionCount % this.plugin.settings.longBreakInterval === 0) {
				this.sessionType = SessionType.LONG_BREAK;
			} else {
				this.sessionType = SessionType.SHORT_BREAK;
			}
		} else {
			// After any break, go back to work
			this.sessionType = SessionType.WORK;
		}

		this.updateTimeForCurrentSession();
		this.state = TimerState.IDLE;
		this.notifyStatusUpdate();
	}

	private updateTimeForCurrentSession(): void {
		const settings = this.plugin.settings;
		
		switch (this.sessionType) {
			case SessionType.WORK:
				this.totalTime = settings.workDuration * 60;
				break;
			case SessionType.SHORT_BREAK:
				this.totalTime = settings.shortBreakDuration * 60;
				break;
			case SessionType.LONG_BREAK:
				this.totalTime = settings.longBreakDuration * 60;
				break;
		}
		
		this.timeLeft = this.totalTime;
	}

	private showNotifications(): void {
		const sessionName = this.getSessionDisplayName();
		const nextSessionName = this.getNextSessionDisplayName();
		const message = `${sessionName} completed! ${nextSessionName} is ready.`;

		// Obsidian notification
		if (this.plugin.settings.enableObsidianNotifications) {
			new Notice(message, 5000);
		}

		// System notification
		if (this.plugin.settings.enableSystemNotifications) {
			this.showSystemNotification(message);
		}
	}

	private showSystemNotification(message: string): void {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('DeepFlow', {
				body: message,
				icon: '🍅' // Tomato emoji for Pomodoro
			});
		} else if ('Notification' in window && Notification.permission !== 'denied') {
			Notification.requestPermission().then(permission => {
				if (permission === 'granted') {
					new Notification('DeepFlow', {
						body: message,
						icon: '🍅'
					});
				}
			});
		}
	}

	private getSessionDisplayName(): string {
		switch (this.sessionType) {
			case SessionType.WORK:
				return 'Work session';
			case SessionType.SHORT_BREAK:
				return 'Short break';
			case SessionType.LONG_BREAK:
				return 'Long break';
			default:
				return 'Session';
		}
	}

	private getNextSessionDisplayName(): string {
		if (this.sessionType === SessionType.WORK) {
			const isLongBreak = (this.sessionCount + 1) % this.plugin.settings.longBreakInterval === 0;
			return isLongBreak ? 'Long break' : 'Short break';
		} else {
			return 'Work session';
		}
	}

	private notifyStatusUpdate(): void {
		const status = this.getStatus();
		
		// Emit event for UI updates
		this.plugin.app.workspace.trigger('deepflow:timer-update', status);
		
		// Update status bar directly
		if (this.plugin.updateStatusBar) {
			this.plugin.updateStatusBar(status);
		}
	}

	cleanup(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	// Utility method to format time
	static formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
} 