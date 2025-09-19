/**
 * Comprehensive Audit Service for Workflow Operations
 * Provides complete audit trail and compliance logging
 */
export class AuditService {
    constructor(options = {}) {
        this.auditLog = [];
        this.persistenceService = options.persistenceService;
        this.retentionPeriod = options.retentionPeriod || (365 * 24 * 60 * 60 * 1000); // 1 year
        this.batchSize = options.batchSize || 100;
        this.autoFlushInterval = options.autoFlushInterval || 60000; // 1 minute
        this.encryptionService = options.encryptionService;
        this.complianceRules = options.complianceRules || [];
        this.isEnabled = options.isEnabled !== false;

        // Auto-flush timer
        if (this.autoFlushInterval > 0) {
            this.flushTimer = setInterval(() => {
                this.flushAuditLog();
            }, this.autoFlushInterval);
        }

        // Setup cleanup timer
        this.setupCleanupTimer();
    }

    /**
     * Log workflow creation
     */
    async logWorkflowCreation(workflow, user, organizationContext) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'WORKFLOW_CREATED',
            workflowId: workflow.id,
            workflowType: workflow.type,
            userId: user.id,
            username: user.username,
            organizationId: organizationContext.organizationId,
            details: {
                initialState: workflow.currentState,
                context: this.sanitizeContext(workflow.context),
                metadata: workflow.metadata
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log workflow state transition
     */
    async logWorkflowTransition(workflow, user, organizationContext, transitionData) {
        if (!this.isEnabled) return;

        const historyEntry = workflow.history[workflow.history.length - 1];

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'WORKFLOW_TRANSITION',
            workflowId: workflow.id,
            workflowType: workflow.type,
            userId: user.id,
            username: user.username,
            organizationId: organizationContext.organizationId,
            details: {
                fromState: historyEntry?.fromState,
                toState: historyEntry?.toState,
                transitionContext: this.sanitizeContext(transitionData.transitionContext),
                targetState: transitionData.targetState,
                previousContext: this.sanitizeContext(workflow.context),
                timeInPreviousState: historyEntry ? new Date() - new Date(historyEntry.timestamp) : null
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log workflow context update
     */
    async logWorkflowContextUpdate(workflow, user, organizationContext, contextUpdates) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'WORKFLOW_CONTEXT_UPDATED',
            workflowId: workflow.id,
            workflowType: workflow.type,
            userId: user.id,
            username: user.username,
            organizationId: organizationContext.organizationId,
            details: {
                currentState: workflow.currentState,
                contextUpdates: this.sanitizeContext(contextUpdates),
                previousContext: this.sanitizeContext(workflow.context)
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log permission check
     */
    async logPermissionCheck(workflowId, userId, permission, result, context = {}) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'PERMISSION_CHECK',
            workflowId: workflowId,
            userId: userId,
            details: {
                permission: permission,
                result: result ? 'GRANTED' : 'DENIED',
                context: this.sanitizeContext(context),
                checkType: 'RBAC_WORKFLOW'
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log workflow validation
     */
    async logWorkflowValidation(workflow, user, validationResults) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'WORKFLOW_VALIDATION',
            workflowId: workflow.id,
            workflowType: workflow.type,
            userId: user.id,
            username: user.username,
            details: {
                currentState: workflow.currentState,
                validationResults: validationResults,
                isValid: validationResults.length === 0,
                context: this.sanitizeContext(workflow.context)
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log notification delivery
     */
    async logNotificationDelivery(notificationId, workflowId, userId, channel, status, error = null) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'NOTIFICATION_DELIVERY',
            workflowId: workflowId,
            userId: userId,
            details: {
                notificationId: notificationId,
                channel: channel,
                status: status,
                error: error,
                deliveryAttempt: 1
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log notification error
     */
    async logNotificationError(workflowId, userId, error) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'NOTIFICATION_ERROR',
            workflowId: workflowId,
            userId: userId,
            details: {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                }
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log user access to workflow
     */
    async logWorkflowAccess(workflowId, user, accessType, organizationContext) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'WORKFLOW_ACCESS',
            workflowId: workflowId,
            userId: user.id,
            username: user.username,
            organizationId: organizationContext.organizationId,
            details: {
                accessType: accessType, // 'VIEW', 'EDIT', 'DELETE'
                userRole: this.getUserRole(user, organizationContext),
                department: this.getUserDepartment(user, organizationContext)
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log data export/download
     */
    async logDataExport(workflowId, user, exportType, organizationContext) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'DATA_EXPORT',
            workflowId: workflowId,
            userId: user.id,
            username: user.username,
            organizationId: organizationContext.organizationId,
            details: {
                exportType: exportType, // 'PDF', 'CSV', 'JSON'
                userRole: this.getUserRole(user, organizationContext),
                department: this.getUserDepartment(user, organizationContext)
            },
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress(),
            sessionId: this.getSessionId()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Log system events
     */
    async logSystemEvent(eventType, details = {}) {
        if (!this.isEnabled) return;

        const entry = {
            id: this.generateAuditId(),
            timestamp: new Date(),
            action: 'SYSTEM_EVENT',
            systemEvent: eventType,
            details: details,
            userAgent: this.getUserAgent(),
            ipAddress: this.getIPAddress()
        };

        await this.addAuditEntry(entry);
    }

    /**
     * Add audit entry to log
     */
    async addAuditEntry(entry) {
        try {
            // Apply compliance rules
            entry = await this.applyComplianceRules(entry);

            // Encrypt sensitive data if encryption service is available
            if (this.encryptionService) {
                entry = await this.encryptSensitiveData(entry);
            }

            // Add to in-memory log
            this.auditLog.push(entry);

            // Auto-flush if batch size reached
            if (this.auditLog.length >= this.batchSize) {
                await this.flushAuditLog();
            }

        } catch (error) {
            console.error('Error adding audit entry:', error);
            // Don't throw - audit failures shouldn't break workflow operations
        }
    }

    /**
     * Apply compliance rules to audit entry
     */
    async applyComplianceRules(entry) {
        for (const rule of this.complianceRules) {
            if (rule.applies && rule.applies(entry)) {
                entry = await rule.apply(entry);
            }
        }
        return entry;
    }

    /**
     * Encrypt sensitive data in audit entry
     */
    async encryptSensitiveData(entry) {
        const sensitiveFields = ['details.context', 'details.contextUpdates', 'details.previousContext'];

        for (const field of sensitiveFields) {
            const value = this.getNestedValue(entry, field);
            if (value && typeof value === 'object') {
                const encrypted = await this.encryptionService.encrypt(JSON.stringify(value));
                this.setNestedValue(entry, field, { encrypted: true, data: encrypted });
            }
        }

        return entry;
    }

    /**
     * Flush audit log to persistence service
     */
    async flushAuditLog() {
        if (!this.persistenceService || this.auditLog.length === 0) {
            return;
        }

        try {
            const entries = [...this.auditLog];
            this.auditLog = [];

            await this.persistenceService.saveAuditEntries(entries);
            console.log(`Flushed ${entries.length} audit entries`);

        } catch (error) {
            console.error('Error flushing audit log:', error);
            // Restore entries to log if persistence failed
            this.auditLog.unshift(...entries);
        }
    }

    /**
     * Search audit log
     */
    async searchAuditLog(criteria = {}) {
        let results = [];

        // Search in-memory log
        results = this.auditLog.filter(entry => this.matchesCriteria(entry, criteria));

        // Search persisted log if persistence service available
        if (this.persistenceService) {
            try {
                const persistedResults = await this.persistenceService.searchAuditEntries(criteria);
                results = [...results, ...persistedResults];
            } catch (error) {
                console.error('Error searching persisted audit log:', error);
            }
        }

        // Sort by timestamp descending
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return results;
    }

    /**
     * Check if audit entry matches search criteria
     */
    matchesCriteria(entry, criteria) {
        // Filter by workflow ID
        if (criteria.workflowId && entry.workflowId !== criteria.workflowId) {
            return false;
        }

        // Filter by user ID
        if (criteria.userId && entry.userId !== criteria.userId) {
            return false;
        }

        // Filter by action
        if (criteria.action && entry.action !== criteria.action) {
            return false;
        }

        // Filter by organization
        if (criteria.organizationId && entry.organizationId !== criteria.organizationId) {
            return false;
        }

        // Filter by date range
        if (criteria.startDate && new Date(entry.timestamp) < new Date(criteria.startDate)) {
            return false;
        }

        if (criteria.endDate && new Date(entry.timestamp) > new Date(criteria.endDate)) {
            return false;
        }

        return true;
    }

    /**
     * Get audit statistics
     */
    getAuditStatistics(organizationId = null) {
        const relevantEntries = organizationId ?
            this.auditLog.filter(entry => entry.organizationId === organizationId) :
            this.auditLog;

        const stats = {
            totalEntries: relevantEntries.length,
            entriesByAction: {},
            entriesByUser: {},
            entriesByWorkflow: {},
            timeRange: {
                earliest: null,
                latest: null
            }
        };

        relevantEntries.forEach(entry => {
            // Count by action
            if (!stats.entriesByAction[entry.action]) {
                stats.entriesByAction[entry.action] = 0;
            }
            stats.entriesByAction[entry.action]++;

            // Count by user
            if (entry.userId) {
                if (!stats.entriesByUser[entry.userId]) {
                    stats.entriesByUser[entry.userId] = 0;
                }
                stats.entriesByUser[entry.userId]++;
            }

            // Count by workflow
            if (entry.workflowId) {
                if (!stats.entriesByWorkflow[entry.workflowId]) {
                    stats.entriesByWorkflow[entry.workflowId] = 0;
                }
                stats.entriesByWorkflow[entry.workflowId]++;
            }

            // Update time range
            const timestamp = new Date(entry.timestamp);
            if (!stats.timeRange.earliest || timestamp < stats.timeRange.earliest) {
                stats.timeRange.earliest = timestamp;
            }
            if (!stats.timeRange.latest || timestamp > stats.timeRange.latest) {
                stats.timeRange.latest = timestamp;
            }
        });

        return stats;
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(organizationId, startDate, endDate) {
        const criteria = {
            organizationId,
            startDate,
            endDate
        };

        const entries = await this.searchAuditLog(criteria);

        const report = {
            organizationId,
            reportPeriod: { startDate, endDate },
            generatedAt: new Date(),
            totalActivities: entries.length,
            workflowActivities: entries.filter(e => e.workflowId).length,
            userActivities: entries.filter(e => e.userId).length,
            securityEvents: entries.filter(e => e.action.includes('PERMISSION')).length,
            dataExports: entries.filter(e => e.action === 'DATA_EXPORT').length,
            uniqueUsers: new Set(entries.map(e => e.userId).filter(Boolean)).size,
            uniqueWorkflows: new Set(entries.map(e => e.workflowId).filter(Boolean)).size,
            activitiesByType: this.groupBy(entries, 'action'),
            activitiesByUser: this.groupBy(entries, 'userId'),
            timeline: this.createTimeline(entries)
        };

        return report;
    }

    /**
     * Setup automatic log cleanup
     */
    setupCleanupTimer() {
        // Run cleanup daily
        setInterval(() => {
            this.cleanupOldEntries();
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * Clean up old audit entries
     */
    async cleanupOldEntries() {
        const cutoffDate = new Date(Date.now() - this.retentionPeriod);

        // Clean in-memory log
        const beforeCount = this.auditLog.length;
        this.auditLog = this.auditLog.filter(entry => new Date(entry.timestamp) > cutoffDate);
        const afterCount = this.auditLog.length;

        // Clean persisted log
        if (this.persistenceService) {
            try {
                await this.persistenceService.cleanupAuditEntries(cutoffDate);
            } catch (error) {
                console.error('Error cleaning up persisted audit entries:', error);
            }
        }

        console.log(`Cleaned up ${beforeCount - afterCount} old audit entries`);
    }

    /**
     * Utility methods
     */
    sanitizeContext(context) {
        if (!context || typeof context !== 'object') return context;

        const sanitized = { ...context };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getUserAgent() {
        return typeof navigator !== 'undefined' ? navigator.userAgent : 'Server';
    }

    getIPAddress() {
        // In a real implementation, this would get the actual IP address
        return '127.0.0.1';
    }

    getSessionId() {
        // In a real implementation, this would get the actual session ID
        return `session_${Date.now()}`;
    }

    getUserRole(user, organizationContext) {
        return organizationContext.positions?.[0]?.designation?.name || 'Unknown';
    }

    getUserDepartment(user, organizationContext) {
        return organizationContext.positions?.[0]?.group?.department?.name || 'Unknown';
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current && current[key] !== undefined ? current[key] : undefined, obj
        );
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'Unknown';
            if (!result[group]) result[group] = 0;
            result[group]++;
            return result;
        }, {});
    }

    createTimeline(entries) {
        const timeline = {};
        entries.forEach(entry => {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!timeline[date]) timeline[date] = 0;
            timeline[date]++;
        });
        return timeline;
    }

    /**
     * Destroy audit service
     */
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        // Final flush
        this.flushAuditLog();
    }
}