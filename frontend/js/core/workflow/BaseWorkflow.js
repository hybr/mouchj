import { StateNode } from './StateNode.js';

/**
 * Abstract base class for all workflows with integrated RBAC
 */
export class BaseWorkflow {
    constructor(id, options = {}) {
        if (this.constructor === BaseWorkflow) {
            throw new Error('BaseWorkflow is abstract and cannot be instantiated directly');
        }

        this.id = id;
        this.type = options.type || this.constructor.name;
        this.currentState = null;
        this.states = new Map();
        this.context = options.context || {};
        this.history = [];
        this.listeners = new Map();
        this.metadata = options.metadata || {};
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.createdBy = options.createdBy;
        this.organizationId = options.organizationId;
        this.rbacResolver = options.rbacResolver;
        this.isLocked = false;
        this.lockOwner = null;
        this.lockAcquiredAt = null;
    }

    /**
     * Add a state to the workflow
     */
    addState(stateName, stateNode) {
        if (!(stateNode instanceof StateNode)) {
            throw new Error('State must be an instance of StateNode');
        }

        this.states.set(stateName, stateNode);
        this.emit('stateAdded', { stateName, stateNode });
    }

    /**
     * Set current state with permission validation
     */
    async setState(stateName, user, organizationContext, transitionContext = {}) {
        if (!this.states.has(stateName)) {
            throw new Error(`State '${stateName}' not found`);
        }

        const newState = this.states.get(stateName);
        const oldState = this.currentState;

        // Validate transition if not initial state
        if (oldState && !this.states.get(oldState).canTransitionTo(stateName, transitionContext)) {
            throw new Error(`Invalid transition from '${oldState}' to '${stateName}'`);
        }

        // Check permissions
        if (!newState.hasPermission(user, organizationContext, this.context)) {
            throw new Error(`User does not have permission to access state '${stateName}'`);
        }

        // Execute exit actions for old state
        if (oldState) {
            await this.states.get(oldState).executeOnExit(this.context, user, organizationContext);
        }

        // Record history
        this.history.push({
            fromState: oldState,
            toState: stateName,
            timestamp: new Date(),
            user: {
                id: user.id,
                username: user.username,
                name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username
            },
            context: { ...transitionContext },
            metadata: this.metadata
        });

        // Update state
        this.currentState = stateName;
        this.updatedAt = new Date();

        // Execute entry actions for new state
        await newState.executeOnEnter(this.context, user, organizationContext);

        // Emit state change event
        this.emit('stateChanged', {
            workflow: this,
            fromState: oldState,
            toState: stateName,
            user,
            organizationContext,
            context: transitionContext
        });

        return this;
    }

    /**
     * Transition to new state with permission check
     */
    async transitionWithPermissionCheck(targetState, user, organizationContext, transitionContext = {}) {
        // Acquire lock for state transition
        await this.acquireLock(user);

        try {
            await this.setState(targetState, user, organizationContext, transitionContext);
        } finally {
            this.releaseLock();
        }
    }

    /**
     * Get available actions for a specific user
     */
    getAvailableActionsForUser(user, organizationContext) {
        if (!this.currentState || !this.states.has(this.currentState)) {
            return [];
        }

        const currentStateNode = this.states.get(this.currentState);
        const availableTransitions = currentStateNode.getAvailableTransitions(this.context);

        return availableTransitions.filter(transition => {
            const targetState = this.states.get(transition.target);
            return targetState && targetState.hasPermission(user, organizationContext, this.context);
        }).map(transition => ({
            action: transition.action || `transition_to_${transition.target}`,
            target: transition.target,
            label: transition.label || `Move to ${transition.target}`,
            requiresConfirmation: transition.requiresConfirmation || false,
            metadata: transition.metadata || {}
        }));
    }

    /**
     * Get current state information
     */
    getCurrentState() {
        if (!this.currentState) return null;

        return {
            name: this.currentState,
            node: this.states.get(this.currentState),
            enteredAt: this.getStateEntryTime(this.currentState),
            timeInState: this.getTimeInCurrentState()
        };
    }

    /**
     * Get time when current state was entered
     */
    getStateEntryTime(stateName) {
        const historyEntry = [...this.history].reverse().find(entry => entry.toState === stateName);
        return historyEntry ? historyEntry.timestamp : this.createdAt;
    }

    /**
     * Get time spent in current state
     */
    getTimeInCurrentState() {
        const entryTime = this.getStateEntryTime(this.currentState);
        return new Date() - entryTime;
    }

    /**
     * Validate current state data
     */
    async validate() {
        if (!this.currentState) {
            return ['Workflow has no current state'];
        }

        const currentStateNode = this.states.get(this.currentState);
        return await currentStateNode.validate(this.context);
    }

    /**
     * Reset workflow to initial state
     */
    async reset(user, organizationContext, resetContext = {}) {
        const initialState = this.getInitialState();
        if (!initialState) {
            throw new Error('No initial state defined');
        }

        // Clear history but keep audit trail
        const resetRecord = {
            type: 'reset',
            timestamp: new Date(),
            user: {
                id: user.id,
                username: user.username,
                name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username
            },
            context: resetContext,
            previousHistory: [...this.history]
        };

        this.history = [resetRecord];
        this.currentState = null;
        this.context = { ...this.context, ...resetContext };

        await this.setState(initialState, user, organizationContext);

        this.emit('workflowReset', {
            workflow: this,
            user,
            organizationContext,
            resetContext
        });
    }

    /**
     * Update workflow context
     */
    updateContext(newContext, user) {
        const oldContext = { ...this.context };
        this.context = { ...this.context, ...newContext };
        this.updatedAt = new Date();

        this.emit('contextUpdated', {
            workflow: this,
            oldContext,
            newContext: this.context,
            user
        });
    }

    /**
     * Acquire lock for workflow operations
     */
    async acquireLock(user, timeout = 30000) {
        if (this.isLocked && this.lockOwner !== user.id) {
            const lockAge = new Date() - this.lockAcquiredAt;
            if (lockAge < timeout) {
                throw new Error(`Workflow is locked by another user. Try again in ${Math.ceil((timeout - lockAge) / 1000)} seconds.`);
            }
            // Auto-release expired lock
            this.releaseLock();
        }

        this.isLocked = true;
        this.lockOwner = user.id;
        this.lockAcquiredAt = new Date();
    }

    /**
     * Release workflow lock
     */
    releaseLock() {
        this.isLocked = false;
        this.lockOwner = null;
        this.lockAcquiredAt = null;
    }

    /**
     * Event listener management
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;

        const callbacks = this.listeners.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event to listeners
     */
    emit(eventName, data) {
        if (!this.listeners.has(eventName)) return;

        const callbacks = this.listeners.get(eventName);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }

    /**
     * Get workflow summary
     */
    getSummary() {
        return {
            id: this.id,
            type: this.type,
            currentState: this.currentState,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            organizationId: this.organizationId,
            stateCount: this.states.size,
            historyCount: this.history.length,
            timeInCurrentState: this.getTimeInCurrentState(),
            isLocked: this.isLocked,
            lockOwner: this.lockOwner
        };
    }

    /**
     * Serialize workflow state
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            currentState: this.currentState,
            context: this.context,
            history: this.history,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            organizationId: this.organizationId
        };
    }

    /**
     * Abstract method to get initial state (must be implemented by subclasses)
     */
    getInitialState() {
        throw new Error('getInitialState() must be implemented by subclass');
    }

    /**
     * Abstract method to define workflow states (must be implemented by subclasses)
     */
    defineStates() {
        throw new Error('defineStates() must be implemented by subclass');
    }

    /**
     * Initialize workflow with states
     */
    initialize() {
        this.defineStates();
        return this;
    }
}