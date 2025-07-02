import { App, PluginSettingTab, Setting } from 'obsidian';
import type DeepFlowPlugin from './main';

export class DeepFlowSettingTab extends PluginSettingTab {
	plugin: DeepFlowPlugin;

	constructor(app: App, plugin: DeepFlowPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Header
		containerEl.createEl('h2', { text: 'DeepFlow Settings' });

		// Timer durations section
		containerEl.createEl('h3', { text: 'Timer Durations' });

		new Setting(containerEl)
			.setName('Work session duration')
			.setDesc('Duration of work sessions in minutes')
			.addText(text => text
				.setPlaceholder('25')
				.setValue(this.plugin.settings.workDuration.toString())
				.onChange(async (value) => {
					const duration = parseInt(value);
					if (!isNaN(duration) && duration > 0) {
						this.plugin.settings.workDuration = duration;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Short break duration')
			.setDesc('Duration of short breaks in minutes')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(this.plugin.settings.shortBreakDuration.toString())
				.onChange(async (value) => {
					const duration = parseInt(value);
					if (!isNaN(duration) && duration > 0) {
						this.plugin.settings.shortBreakDuration = duration;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Long break duration')
			.setDesc('Duration of long breaks in minutes')
			.addText(text => text
				.setPlaceholder('15')
				.setValue(this.plugin.settings.longBreakDuration.toString())
				.onChange(async (value) => {
					const duration = parseInt(value);
					if (!isNaN(duration) && duration > 0) {
						this.plugin.settings.longBreakDuration = duration;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Long break interval')
			.setDesc('Number of work sessions before a long break')
			.addText(text => text
				.setPlaceholder('4')
				.setValue(this.plugin.settings.longBreakInterval.toString())
				.onChange(async (value) => {
					const interval = parseInt(value);
					if (!isNaN(interval) && interval > 0) {
						this.plugin.settings.longBreakInterval = interval;
						await this.plugin.saveSettings();
					}
				}));

		// Behavior section
		containerEl.createEl('h3', { text: 'Behavior' });

		new Setting(containerEl)
			.setName('Auto-start next session')
			.setDesc('Automatically start the next session after completion')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoStartNextSession)
				.onChange(async (value) => {
					this.plugin.settings.autoStartNextSession = value;
					await this.plugin.saveSettings();
				}));

		// Notifications section
		containerEl.createEl('h3', { text: 'Notifications' });

		new Setting(containerEl)
			.setName('Obsidian notifications')
			.setDesc('Show notifications within Obsidian when sessions complete')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableObsidianNotifications)
				.onChange(async (value) => {
					this.plugin.settings.enableObsidianNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('System notifications')
			.setDesc('Show system notifications when sessions complete')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSystemNotifications)
				.onChange(async (value) => {
					this.plugin.settings.enableSystemNotifications = value;
					await this.plugin.saveSettings();
				}));

		// Data management section
		containerEl.createEl('h3', { text: 'Data Management' });

		new Setting(containerEl)
			.setName('Export sessions')
			.setDesc('Export all session data as CSV')
			.addButton(button => button
				.setButtonText('Export CSV')
				.setCta()
				.onClick(async () => {
					try {
						const csv = await this.plugin.sessionManager.exportSessions();
						const blob = new Blob([csv], { type: 'text/csv' });
						const url = URL.createObjectURL(blob);
						
						const link = document.createElement('a');
						link.href = url;
						link.download = `deepflow-sessions-${new Date().toISOString().split('T')[0]}.csv`;
						link.click();
						
						URL.revokeObjectURL(url);
					} catch (error) {
						console.error('Failed to export sessions:', error);
					}
				}));

		new Setting(containerEl)
			.setName('Clear all data')
			.setDesc('Permanently delete all session data (cannot be undone)')
			.addButton(button => button
				.setButtonText('Clear Data')
				.setWarning()
				.onClick(async () => {
					const confirmed = confirm(
						'Are you sure you want to delete all session data? This cannot be undone.'
					);
					if (confirmed) {
						await this.plugin.sessionManager.clearAllSessions();
						// Refresh the stats display
						this.app.workspace.trigger('deepflow:timer-update');
					}
				}));

		// Statistics section
		containerEl.createEl('h3', { text: 'Statistics' });
		
		this.displayStats(containerEl);
	}

	private displayStats(containerEl: HTMLElement): void {
		const stats = this.plugin.sessionManager.getSessionStats();
		const totalTime = this.plugin.sessionManager.getTotalTimeSpent();
		const streak = this.plugin.sessionManager.getProductivityStreak();

		const statsContainer = containerEl.createEl('div', { cls: 'deepflow-settings-stats' });

		// Create a grid layout for stats
		const statsGrid = statsContainer.createEl('div', { 
			cls: 'deepflow-stats-grid',
			attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;' }
		});

		this.createStatDisplay(statsGrid, 'Total Sessions', stats.total.toString());
		this.createStatDisplay(statsGrid, 'This Year', stats.year.toString());
		this.createStatDisplay(statsGrid, 'This Month', stats.month.toString());
		this.createStatDisplay(statsGrid, 'This Week', stats.week.toString());
		this.createStatDisplay(statsGrid, 'Today', stats.today.toString());
		this.createStatDisplay(statsGrid, 'Current Streak', `${streak} days`);
		this.createStatDisplay(statsGrid, 'Total Time', this.formatDuration(totalTime));
		this.createStatDisplay(statsGrid, 'Time Today', this.formatDuration(this.plugin.sessionManager.getTotalTimeSpentToday()));
	}

	private createStatDisplay(parent: HTMLElement, label: string, value: string): void {
		const statEl = parent.createEl('div', { 
			cls: 'deepflow-stat-display',
			attr: { style: 'text-align: center; padding: 10px; background: var(--background-secondary); border-radius: 6px;' }
		});
		
		statEl.createEl('div', { 
			text: value,
			attr: { style: 'font-size: 1.2em; font-weight: 600; color: var(--text-normal); margin-bottom: 4px;' }
		});
		
		statEl.createEl('div', { 
			text: label,
			attr: { style: 'font-size: 0.85em; color: var(--text-muted);' }
		});
	}

	private formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}
} 