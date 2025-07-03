import { Plugin, setIcon } from 'obsidian';
import { TimerEngine } from './timer';
import { SessionManager } from './sessionManager';
import { DeepFlowSettingTab } from './settings';
import { DeepFlowView, VIEW_TYPE_DEEPFLOW } from './ui';

export interface DeepFlowSettings {
	workDuration: number; // in minutes
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakInterval: number; // after how many work sessions
	autoStartNextSession: boolean;
	enableSystemNotifications: boolean;
	enableObsidianNotifications: boolean;
}

const DEFAULT_SETTINGS: DeepFlowSettings = {
	workDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakInterval: 4,
	autoStartNextSession: false,
	enableSystemNotifications: true,
	enableObsidianNotifications: true,
};

export default class DeepFlowPlugin extends Plugin {
	settings: DeepFlowSettings;
	timerEngine: TimerEngine;
	sessionManager: SessionManager;
	statusBarItem: HTMLElement;
	ribbonIcon: HTMLElement;

	async onload() {
		await this.loadSettings();

		// Add custom icon for ribbon
		this.addCustomIcon();

		// Initialize managers
		this.sessionManager = new SessionManager(this);
		this.timerEngine = new TimerEngine(this, this.sessionManager);

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('deepflow-status-bar');
		this.statusBarItem.addEventListener('click', () => {
			this.activateView();
		});
		
		// Initialize status bar with ready state
		this.updateStatusBar({ state: 'idle', sessionType: 'work', timeLeft: 0 });

		// Add ribbon icon using Obsidian's built-in timer icon
		this.ribbonIcon = this.addRibbonIcon('timer', 'DeepFlow Timer', () => {
			this.activateView();
		});

		// Register view
		this.registerView(
			VIEW_TYPE_DEEPFLOW,
			(leaf) => new DeepFlowView(leaf, this)
		);

		// Add commands
		this.addCommand({
			id: 'start-timer',
			name: 'Start timer',
			callback: () => this.timerEngine.start(),
		});

		this.addCommand({
			id: 'pause-timer',
			name: 'Pause timer',
			callback: () => this.timerEngine.pause(),
		});

		this.addCommand({
			id: 'reset-timer',
			name: 'Reset timer',
			callback: () => this.timerEngine.reset(),
		});

		this.addCommand({
			id: 'open-deepflow-view',
			name: 'Open Timer',
			callback: () => this.activateView(),
		});

		// Add settings tab
		this.addSettingTab(new DeepFlowSettingTab(this.app, this));

		// Initialize view on startup
		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});

		// Timer engine will call updateStatusBar directly
	}

	onunload() {
		this.timerEngine?.cleanup();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_DEEPFLOW)[0];

		if (!leaf) {
			// Create new leaf in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({ type: VIEW_TYPE_DEEPFLOW, active: true });
			}
		}

		// Reveal the leaf in case it's in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	addCustomIcon() {
		// We don't need custom icons anymore - we'll use Obsidian's built-in Lucide icons
		// Just leaving this method empty for now in case we need it later
	}

	updateStatusBar(status: any) {
		if (!this.statusBarItem) return;

		const { state, sessionType, timeLeft } = status;
		const timeString = this.formatTime(timeLeft);
		
		// Clear existing content
		this.statusBarItem.empty();
		
		// Create icon element
		const iconEl = this.statusBarItem.createEl('span', { cls: 'deepflow-status-icon' });
		
		if (state === 'running') {
			if (sessionType === 'work') {
				// Use Obsidian's setIcon function with Lucide icons
				setIcon(iconEl, 'play');
			} else {
				// Use coffee icon for breaks
				setIcon(iconEl, 'coffee');
			}
			this.statusBarItem.createEl('span', { text: ` ${timeString}`, cls: 'deepflow-status-text' });
		} else if (state === 'paused') {
			setIcon(iconEl, 'pause');
			this.statusBarItem.createEl('span', { text: ` ${timeString}`, cls: 'deepflow-status-text' });
		} else {
			setIcon(iconEl, 'circle-check');
			this.statusBarItem.createEl('span', { text: ' Ready', cls: 'deepflow-status-text' });
		}
	}



	formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
} 