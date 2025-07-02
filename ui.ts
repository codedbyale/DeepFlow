import { ItemView, WorkspaceLeaf } from 'obsidian';
import type DeepFlowPlugin from './main';
import { TimerEngine, TimerState, SessionType, TimerStatus } from './timer';
import { SessionStats } from './sessionManager';

export const VIEW_TYPE_DEEPFLOW = 'deepflow-view';

export class DeepFlowView extends ItemView {
	plugin: DeepFlowPlugin;
	private statusEl: HTMLElement;
	private timerEl: HTMLElement;
	private sessionTypeEl: HTMLElement;
	private controlsEl: HTMLElement;
	private statsEl: HTMLElement;
	private startBtn: HTMLButtonElement;
	private pauseBtn: HTMLButtonElement;
	private resetBtn: HTMLButtonElement;
	private skipBtn: HTMLButtonElement;

	constructor(leaf: WorkspaceLeaf, plugin: DeepFlowPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DEEPFLOW;
	}

	getDisplayText(): string {
		return 'DeepFlow';
	}

	getIcon(): string {
		return 'timer';
	}

	async onOpen(): Promise<void> {
		this.buildUI();
		this.setupEventListeners();
		this.updateUI();
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}

	private buildUI(): void {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('deepflow-container');

		// Header
		const headerEl = container.createEl('div', { cls: 'deepflow-header' });
		headerEl.createEl('h3', { text: '🍅 DeepFlow', cls: 'deepflow-title' });

		// Timer status
		this.statusEl = container.createEl('div', { cls: 'deepflow-status' });
		
		// Session type
		this.sessionTypeEl = this.statusEl.createEl('div', { 
			cls: 'deepflow-session-type',
			text: 'Work Session'
		});

		// Timer display
		this.timerEl = this.statusEl.createEl('div', { 
			cls: 'deepflow-timer',
			text: '25:00'
		});

		// Progress bar
		const progressContainer = this.statusEl.createEl('div', { cls: 'deepflow-progress-container' });
		progressContainer.createEl('div', { cls: 'deepflow-progress-bar' });

		// Controls
		this.controlsEl = container.createEl('div', { cls: 'deepflow-controls' });
		
		this.startBtn = this.controlsEl.createEl('button', { 
			text: 'Start',
			cls: 'deepflow-btn deepflow-btn-primary'
		});

		this.pauseBtn = this.controlsEl.createEl('button', { 
			text: 'Pause',
			cls: 'deepflow-btn deepflow-btn-secondary'
		});

		this.resetBtn = this.controlsEl.createEl('button', { 
			text: 'Reset',
			cls: 'deepflow-btn deepflow-btn-secondary'
		});

		this.skipBtn = this.controlsEl.createEl('button', { 
			text: 'Skip',
			cls: 'deepflow-btn deepflow-btn-secondary'
		});

		// Stats section
		this.statsEl = container.createEl('div', { cls: 'deepflow-stats' });
		this.buildStatsSection();

		// Add custom styles
		this.addCustomStyles();
	}

	private buildStatsSection(): void {
		this.statsEl.empty();
		
		const statsHeader = this.statsEl.createEl('div', { cls: 'deepflow-stats-header' });
		statsHeader.createEl('h4', { text: 'Session Stats', cls: 'deepflow-stats-title' });

		const statsGrid = this.statsEl.createEl('div', { cls: 'deepflow-stats-grid' });

		// Get current stats
		const stats = this.plugin.sessionManager.getSessionStats();
		const timeToday = this.plugin.sessionManager.getTotalTimeSpentToday();
		const streak = this.plugin.sessionManager.getProductivityStreak();

		// Create stat items
		this.createStatItem(statsGrid, 'Today', stats.today.toString());
		this.createStatItem(statsGrid, 'Week', stats.week.toString());
		this.createStatItem(statsGrid, 'Month', stats.month.toString());
		this.createStatItem(statsGrid, 'Total', stats.total.toString());
		this.createStatItem(statsGrid, 'Time Today', this.formatTime(timeToday));
		this.createStatItem(statsGrid, 'Streak', `${streak} days`);
	}

	private createStatItem(parent: HTMLElement, label: string, value: string): void {
		const item = parent.createEl('div', { cls: 'deepflow-stat-item' });
		item.createEl('div', { text: label, cls: 'deepflow-stat-label' });
		item.createEl('div', { text: value, cls: 'deepflow-stat-value' });
	}

	private setupEventListeners(): void {
		// Button event listeners
		this.startBtn.addEventListener('click', () => {
			this.plugin.timerEngine.start();
		});

		this.pauseBtn.addEventListener('click', () => {
			this.plugin.timerEngine.pause();
		});

		this.resetBtn.addEventListener('click', () => {
			this.plugin.timerEngine.reset();
		});

		this.skipBtn.addEventListener('click', () => {
			this.plugin.timerEngine.skip();
		});

		// Listen for timer updates
		this.registerEvent(
			this.app.workspace.on('deepflow:timer-update', (status: TimerStatus) => {
				this.updateUI(status);
			})
		);
	}

	private updateUI(status?: TimerStatus): void {
		if (!status) {
			status = this.plugin.timerEngine.getStatus();
		}

		// Update session type
		this.sessionTypeEl.textContent = this.getSessionTypeDisplayName(status.sessionType);

		// Update timer display
		this.timerEl.textContent = TimerEngine.formatTime(status.timeLeft);

		// Update progress bar
		const progressBar = this.statusEl.querySelector('.deepflow-progress-bar') as HTMLElement;
		if (progressBar) {
			const progress = ((status.totalTime - status.timeLeft) / status.totalTime) * 100;
			progressBar.style.width = `${Math.min(progress, 100)}%`;
		}

		// Update button states
		this.updateButtonStates(status.state);

		// Update session counter display
		const sessionCounter = this.statusEl.querySelector('.deepflow-session-counter');
		if (sessionCounter) {
			sessionCounter.textContent = `Session ${status.sessionCount + 1}`;
		} else if (status.sessionType === SessionType.WORK) {
			const counter = this.sessionTypeEl.createEl('span', {
				cls: 'deepflow-session-counter',
				text: ` (Session ${status.sessionCount + 1})`
			});
		}

		// Update stats
		this.buildStatsSection();
	}

	private updateButtonStates(state: TimerState): void {
		switch (state) {
			case TimerState.IDLE:
				this.startBtn.style.display = 'inline-block';
				this.pauseBtn.style.display = 'none';
				this.resetBtn.disabled = false;
				this.skipBtn.disabled = false;
				break;
			case TimerState.RUNNING:
				this.startBtn.style.display = 'none';
				this.pauseBtn.style.display = 'inline-block';
				this.resetBtn.disabled = false;
				this.skipBtn.disabled = false;
				break;
			case TimerState.PAUSED:
				this.startBtn.style.display = 'inline-block';
				this.pauseBtn.style.display = 'none';
				this.resetBtn.disabled = false;
				this.skipBtn.disabled = false;
				break;
		}
	}

	private getSessionTypeDisplayName(type: SessionType): string {
		switch (type) {
			case SessionType.WORK:
				return 'Work Session';
			case SessionType.SHORT_BREAK:
				return 'Short Break';
			case SessionType.LONG_BREAK:
				return 'Long Break';
			default:
				return 'Session';
		}
	}

	private formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	private addCustomStyles(): void {
		// Add CSS styles for the component
		const styleEl = document.createElement('style');
		styleEl.textContent = `
			.deepflow-container {
				padding: 20px;
				font-family: var(--font-interface);
			}

			.deepflow-header {
				text-align: center;
				margin-bottom: 20px;
			}

			.deepflow-title {
				margin: 0;
				color: var(--text-normal);
				font-size: 1.5em;
			}

			.deepflow-status {
				text-align: center;
				margin-bottom: 20px;
			}

			.deepflow-session-type {
				font-size: 1.1em;
				color: var(--text-muted);
				margin-bottom: 10px;
			}

			.deepflow-timer {
				font-size: 3em;
				font-weight: bold;
				color: var(--text-normal);
				margin-bottom: 10px;
				font-family: var(--font-monospace);
			}

			.deepflow-progress-container {
				width: 100%;
				height: 4px;
				background-color: var(--background-modifier-border);
				border-radius: 2px;
				overflow: hidden;
			}

			.deepflow-progress-bar {
				height: 100%;
				background-color: var(--interactive-accent);
				width: 0%;
				transition: width 0.3s ease;
			}

			.deepflow-controls {
				display: flex;
				gap: 10px;
				justify-content: center;
				margin-bottom: 30px;
				flex-wrap: wrap;
			}

			.deepflow-btn {
				padding: 8px 16px;
				border: none;
				border-radius: 6px;
				cursor: pointer;
				font-size: 14px;
				font-weight: 500;
				transition: all 0.2s ease;
			}

			.deepflow-btn-primary {
				background-color: var(--interactive-accent);
				color: var(--text-on-accent);
			}

			.deepflow-btn-primary:hover {
				background-color: var(--interactive-accent-hover);
			}

			.deepflow-btn-secondary {
				background-color: var(--background-modifier-form-field);
				color: var(--text-normal);
				border: 1px solid var(--background-modifier-border);
			}

			.deepflow-btn-secondary:hover {
				background-color: var(--background-modifier-hover);
			}

			.deepflow-btn:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.deepflow-stats {
				border-top: 1px solid var(--background-modifier-border);
				padding-top: 20px;
			}

			.deepflow-stats-title {
				margin: 0 0 15px 0;
				font-size: 1.1em;
				color: var(--text-normal);
			}

			.deepflow-stats-grid {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 15px;
			}

			.deepflow-stat-item {
				text-align: center;
			}

			.deepflow-stat-label {
				font-size: 0.85em;
				color: var(--text-muted);
				margin-bottom: 4px;
			}

			.deepflow-stat-value {
				font-size: 1.1em;
				font-weight: 600;
				color: var(--text-normal);
			}

			.deepflow-session-counter {
				font-size: 0.9em;
				opacity: 0.7;
			}

			/* Status bar styling */
			.deepflow-status-bar {
				cursor: pointer;
				padding: 0 8px;
				border-radius: 4px;
				transition: background-color 0.2s ease;
				display: flex;
				align-items: center;
				gap: 4px;
			}

			.deepflow-status-bar:hover {
				background-color: var(--background-modifier-hover);
			}

			.deepflow-status-icon {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 16px;
				height: 16px;
			}

			.deepflow-status-icon svg {
				width: 16px;
				height: 16px;
				color: var(--text-muted);
			}

			.deepflow-status-text {
				font-size: 13px;
				color: var(--text-muted);
				font-weight: 400;
			}
		`;

		document.head.appendChild(styleEl);
	}
} 