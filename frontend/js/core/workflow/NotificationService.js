/**
 * Multi-channel Notification Service for Workflow Events
 */
export class NotificationService {
    constructor(options = {}) {
        this.channels = new Map();
        this.templates = new Map();
        this.deliveryQueue = [];
        this.isProcessing = false;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 5000; // 5 seconds
        this.batchSize = options.batchSize || 10;
        this.preferences = new Map(); // User notification preferences
        this.auditService = options.auditService;
        this.metricsCollector = options.metricsCollector;

        // Initialize default channels
        this.initializeDefaultChannels();
        this.initializeDefaultTemplates();

        // Start processing queue
        this.startQueueProcessor();
    }

    /**
     * Initialize default notification channels
     */
    initializeDefaultChannels() {
        // Email channel
        this.registerChannel('email', {
            send: async (recipient, message) => {
                return await this.sendEmail(recipient, message);
            },
            validate: (recipient) => {
                return recipient.email && this.isValidEmail(recipient.email);
            }
        });

        // In-app notification channel
        this.registerChannel('in_app', {
            send: async (recipient, message) => {
                return await this.sendInAppNotification(recipient, message);
            },
            validate: (recipient) => {
                return recipient.id !== undefined;
            }
        });

        // SMS channel (placeholder - requires external service)
        this.registerChannel('sms', {
            send: async (recipient, message) => {
                return await this.sendSMS(recipient, message);
            },
            validate: (recipient) => {
                return recipient.phone && this.isValidPhone(recipient.phone);
            }
        });

        // Push notification channel (placeholder)
        this.registerChannel('push', {
            send: async (recipient, message) => {
                return await this.sendPushNotification(recipient, message);
            },
            validate: (recipient) => {
                return recipient.pushToken !== undefined;
            }
        });
    }

    /**
     * Initialize default message templates
     */
    initializeDefaultTemplates() {
        // Workflow state change template
        this.registerTemplate('workflow_state_changed', {
            subject: 'Workflow Update: {{workflowType}} - {{currentState}}',
            body: `
                <h3>Workflow Update</h3>
                <p>The {{workflowType}} workflow <strong>{{workflowId}}</strong> has been updated.</p>
                <ul>
                    <li><strong>Current State:</strong> {{currentState}}</li>
                    <li><strong>Updated By:</strong> {{actorName}}</li>
                    <li><strong>Updated At:</strong> {{timestamp}}</li>
                    {{#if nextActions}}
                    <li><strong>Available Actions:</strong>
                        <ul>
                            {{#each nextActions}}
                            <li>{{this.label}}</li>
                            {{/each}}
                        </ul>
                    </li>
                    {{/if}}
                </ul>
                {{#if workflowUrl}}
                <p><a href="{{workflowUrl}}">View Workflow</a></p>
                {{/if}}
            `,
            priority: 'normal',
            channels: ['email', 'in_app']
        });

        // Action required template
        this.registerTemplate('action_required', {
            subject: 'Action Required: {{workflowType}} - {{currentState}}',
            body: `
                <h3>Action Required</h3>
                <p>A {{workflowType}} workflow requires your attention.</p>
                <ul>
                    <li><strong>Workflow ID:</strong> {{workflowId}}</li>
                    <li><strong>Current State:</strong> {{currentState}}</li>
                    <li><strong>Priority:</strong> {{priority}}</li>
                    <li><strong>Due Date:</strong> {{dueDate}}</li>
                </ul>
                <h4>Available Actions:</h4>
                <ul>
                    {{#each availableActions}}
                    <li><strong>{{this.label}}</strong> - {{this.description}}</li>
                    {{/each}}
                </ul>
                {{#if workflowUrl}}
                <p><a href="{{workflowUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Take Action</a></p>
                {{/if}}
            `,
            priority: 'high',
            channels: ['email', 'in_app', 'push']
        });

        // Workflow completed template
        this.registerTemplate('workflow_completed', {
            subject: 'Completed: {{workflowType}} - {{workflowId}}',
            body: `
                <h3>Workflow Completed</h3>
                <p>The {{workflowType}} workflow has been completed successfully.</p>
                <ul>
                    <li><strong>Workflow ID:</strong> {{workflowId}}</li>
                    <li><strong>Completed By:</strong> {{actorName}}</li>
                    <li><strong>Completed At:</strong> {{timestamp}}</li>
                    <li><strong>Total Duration:</strong> {{duration}}</li>
                </ul>
                {{#if summary}}
                <h4>Summary:</h4>
                <p>{{summary}}</p>
                {{/if}}
                {{#if workflowUrl}}
                <p><a href="{{workflowUrl}}">View Details</a></p>
                {{/if}}
            `,
            priority: 'normal',
            channels: ['email', 'in_app']
        });

        // Workflow rejected template
        this.registerTemplate('workflow_rejected', {
            subject: 'Rejected: {{workflowType}} - {{workflowId}}',
            body: `
                <h3>Workflow Rejected</h3>
                <p>Your {{workflowType}} workflow has been rejected.</p>
                <ul>
                    <li><strong>Workflow ID:</strong> {{workflowId}}</li>
                    <li><strong>Rejected By:</strong> {{actorName}}</li>
                    <li><strong>Rejected At:</strong> {{timestamp}}</li>
                    <li><strong>Reason:</strong> {{rejectionReason}}</li>
                </ul>
                {{#if nextSteps}}
                <h4>Next Steps:</h4>
                <p>{{nextSteps}}</p>
                {{/if}}
                {{#if workflowUrl}}
                <p><a href="{{workflowUrl}}">Review and Revise</a></p>
                {{/if}}
            `,
            priority: 'high',
            channels: ['email', 'in_app']
        });

        // Escalation template
        this.registerTemplate('workflow_escalation', {
            subject: 'ESCALATION: {{workflowType}} - {{workflowId}}',
            body: `
                <h3>Workflow Escalation</h3>
                <p>A {{workflowType}} workflow has been escalated due to timeout or other conditions.</p>
                <ul>
                    <li><strong>Workflow ID:</strong> {{workflowId}}</li>
                    <li><strong>Current State:</strong> {{currentState}}</li>
                    <li><strong>Escalation Reason:</strong> {{escalationReason}}</li>
                    <li><strong>Original Assignee:</strong> {{originalAssignee}}</li>
                    <li><strong>Time in State:</strong> {{timeInState}}</li>
                </ul>
                <p style="color: red; font-weight: bold;">Immediate attention required!</p>
                {{#if workflowUrl}}
                <p><a href="{{workflowUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Take Immediate Action</a></p>
                {{/if}}
            `,
            priority: 'urgent',
            channels: ['email', 'in_app', 'sms', 'push']
        });
    }

    /**
     * Register a notification channel
     */
    registerChannel(name, channel) {
        if (!channel.send || typeof channel.send !== 'function') {
            throw new Error('Channel must have a send function');
        }
        if (!channel.validate || typeof channel.validate !== 'function') {
            throw new Error('Channel must have a validate function');
        }

        this.channels.set(name, channel);
    }

    /**
     * Register a message template
     */
    registerTemplate(name, template) {
        if (!template.subject || !template.body) {
            throw new Error('Template must have subject and body');
        }

        this.templates.set(name, {
            ...template,
            channels: template.channels || ['email'],
            priority: template.priority || 'normal'
        });
    }

    /**
     * Send workflow notification
     */
    async sendWorkflowNotification(options) {
        const {
            recipient,
            workflow,
            currentState,
            actor,
            organizationContext,
            templateName = 'workflow_state_changed',
            additionalData = {}
        } = options;

        try {
            // Get template
            const template = this.templates.get(templateName);
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            // Prepare template data
            const templateData = {
                workflowId: workflow.id,
                workflowType: workflow.type,
                currentState: currentState,
                actorName: actor.firstName && actor.lastName ?
                    `${actor.firstName} ${actor.lastName}` : actor.username,
                timestamp: new Date().toLocaleString(),
                priority: template.priority,
                workflowUrl: this.generateWorkflowUrl(workflow.id, organizationContext),
                ...additionalData
            };

            // Get user notification preferences
            const userPreferences = await this.getUserNotificationPreferences(recipient.id);

            // Determine which channels to use
            const channels = this.determineChannels(template.channels, userPreferences, template.priority);

            // Queue notifications for each channel
            for (const channelName of channels) {
                if (this.channels.has(channelName)) {
                    const channel = this.channels.get(channelName);

                    // Validate recipient for this channel
                    if (channel.validate(recipient)) {
                        const notification = {
                            id: this.generateNotificationId(),
                            recipient,
                            channel: channelName,
                            template: templateName,
                            data: templateData,
                            priority: template.priority,
                            attempts: 0,
                            createdAt: new Date(),
                            workflowId: workflow.id
                        };

                        this.deliveryQueue.push(notification);
                    }
                }
            }

            // Start processing if not already running
            if (!this.isProcessing) {
                this.processDeliveryQueue();
            }

        } catch (error) {
            console.error('Error sending workflow notification:', error);

            if (this.auditService) {
                await this.auditService.logNotificationError(workflow.id, recipient.id, error);
            }
        }
    }

    /**
     * Process notification delivery queue
     */
    async processDeliveryQueue() {
        if (this.isProcessing || this.deliveryQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.deliveryQueue.length > 0) {
                const batch = this.deliveryQueue.splice(0, this.batchSize);
                await Promise.all(batch.map(notification => this.deliverNotification(notification)));
            }
        } catch (error) {
            console.error('Error processing delivery queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start queue processor (runs periodically)
     */
    startQueueProcessor() {
        setInterval(() => {
            if (!this.isProcessing && this.deliveryQueue.length > 0) {
                this.processDeliveryQueue();
            }
        }, 5000); // Process every 5 seconds
    }

    /**
     * Deliver individual notification
     */
    async deliverNotification(notification) {
        try {
            const channel = this.channels.get(notification.channel);
            const template = this.templates.get(notification.template);

            // Render message
            const message = this.renderMessage(template, notification.data);

            // Send notification
            const result = await channel.send(notification.recipient, message);

            // Log success
            if (this.auditService) {
                await this.auditService.logNotificationDelivery(
                    notification.id,
                    notification.workflowId,
                    notification.recipient.id,
                    notification.channel,
                    'success'
                );
            }

            // Collect metrics
            if (this.metricsCollector) {
                this.metricsCollector.recordNotificationDelivery(
                    notification.channel,
                    notification.template,
                    'success'
                );
            }

            return result;

        } catch (error) {
            notification.attempts++;

            // Log failure
            if (this.auditService) {
                await this.auditService.logNotificationDelivery(
                    notification.id,
                    notification.workflowId,
                    notification.recipient.id,
                    notification.channel,
                    'failed',
                    error.message
                );
            }

            // Retry if under limit
            if (notification.attempts < this.retryAttempts) {
                setTimeout(() => {
                    this.deliveryQueue.push(notification);
                }, this.retryDelay * notification.attempts);
            } else {
                console.error(`Failed to deliver notification ${notification.id} after ${this.retryAttempts} attempts:`, error);

                if (this.metricsCollector) {
                    this.metricsCollector.recordNotificationDelivery(
                        notification.channel,
                        notification.template,
                        'failed'
                    );
                }
            }
        }
    }

    /**
     * Render message from template
     */
    renderMessage(template, data) {
        const subject = this.renderTemplate(template.subject, data);
        const body = this.renderTemplate(template.body, data);

        return {
            subject,
            body,
            priority: template.priority
        };
    }

    /**
     * Simple template rendering (supports {{variable}} and {{#if}}{{/if}})
     */
    renderTemplate(templateString, data) {
        let rendered = templateString;

        // Replace simple variables
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });

        // Handle nested properties
        rendered = rendered.replace(/\{\{(\w+\.\w+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path);
            return value !== undefined ? value : match;
        });

        // Handle simple conditionals
        rendered = rendered.replace(/\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
            return data[condition] ? content : '';
        });

        // Handle each loops (basic implementation)
        rendered = rendered.replace(/\{\{#each (\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, itemTemplate) => {
            const array = data[arrayName];
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                return itemTemplate.replace(/\{\{this\.(\w+)\}\}/g, (match, prop) => {
                    return item[prop] !== undefined ? item[prop] : match;
                });
            }).join('');
        });

        return rendered;
    }

    /**
     * Get user notification preferences
     */
    async getUserNotificationPreferences(userId) {
        if (this.preferences.has(userId)) {
            return this.preferences.get(userId);
        }

        // Default preferences
        const defaultPreferences = {
            email: { enabled: true, priority: ['high', 'urgent'] },
            in_app: { enabled: true, priority: ['normal', 'high', 'urgent'] },
            sms: { enabled: false, priority: ['urgent'] },
            push: { enabled: true, priority: ['high', 'urgent'] }
        };

        // In a real implementation, load from database
        this.preferences.set(userId, defaultPreferences);
        return defaultPreferences;
    }

    /**
     * Determine which channels to use based on preferences and priority
     */
    determineChannels(templateChannels, userPreferences, priority) {
        const channels = [];

        for (const channelName of templateChannels) {
            const pref = userPreferences[channelName];
            if (pref && pref.enabled && pref.priority.includes(priority)) {
                channels.push(channelName);
            }
        }

        return channels;
    }

    /**
     * Channel implementations
     */
    async sendEmail(recipient, message) {
        // Placeholder for email sending
        console.log(`Email sent to ${recipient.email}:`, message.subject);
        return { messageId: this.generateMessageId(), status: 'sent' };
    }

    async sendInAppNotification(recipient, message) {
        // Placeholder for in-app notification
        console.log(`In-app notification sent to user ${recipient.id}:`, message.subject);
        return { notificationId: this.generateMessageId(), status: 'delivered' };
    }

    async sendSMS(recipient, message) {
        // Placeholder for SMS sending
        console.log(`SMS sent to ${recipient.phone}:`, message.subject);
        return { messageId: this.generateMessageId(), status: 'sent' };
    }

    async sendPushNotification(recipient, message) {
        // Placeholder for push notification
        console.log(`Push notification sent to ${recipient.pushToken}:`, message.subject);
        return { notificationId: this.generateMessageId(), status: 'delivered' };
    }

    /**
     * Validation helpers
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone);
    }

    /**
     * Utility methods
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateWorkflowUrl(workflowId, organizationContext) {
        // Generate URL to workflow view
        return `#workflows/${workflowId}?org=${organizationContext.organizationId}`;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current && current[key] !== undefined ? current[key] : undefined, obj
        );
    }

    /**
     * Get delivery statistics
     */
    getDeliveryStatistics() {
        return {
            queueSize: this.deliveryQueue.length,
            isProcessing: this.isProcessing,
            registeredChannels: Array.from(this.channels.keys()),
            registeredTemplates: Array.from(this.templates.keys()),
            userPreferencesCount: this.preferences.size
        };
    }
}