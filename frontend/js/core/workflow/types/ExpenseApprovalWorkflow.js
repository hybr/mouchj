import { BaseWorkflow } from '../BaseWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Expense Approval Workflow Implementation
 * Manages expense claims and reimbursement approval process
 */
export class ExpenseApprovalWorkflow extends BaseWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'ExpenseApprovalWorkflow' });
        this.initialize();
    }

    /**
     * Get initial state for expense approval workflow
     */
    getInitialState() {
        return 'draft';
    }

    /**
     * Define all states for expense approval workflow
     */
    defineStates() {
        // Draft State - Expense claim creation
        this.addState('draft', new StateNode('draft', {
            transitions: [
                { target: 'submitted', action: 'submit_claim', label: 'Submit Expense Claim' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Claim' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            validations: [
                (context) => context.total_amount > 0 ? true : 'Total amount must be greater than 0',
                (context) => context.expense_items && context.expense_items.length > 0 ? true : 'At least one expense item is required',
                (context) => context.business_purpose ? true : 'Business purpose is required',
                (context) => this.validateReceipts(context)
            ],
            onEnter: async (context, user, orgContext) => {
                if (!context.expense_items) {
                    context.expense_items = [];
                }
                console.log(`Expense claim draft created by ${user.username}`);
            }
        }));

        // Submitted State - Waiting for initial review
        this.addState('submitted', new StateNode('submitted', {
            transitions: [
                {
                    target: 'manager_review',
                    action: 'send_to_manager',
                    label: 'Send to Manager Review',
                    guards: [(context) => context.total_amount < 5000] // Auto-route small amounts
                },
                {
                    target: 'finance_review',
                    action: 'send_to_finance',
                    label: 'Send to Finance Review',
                    guards: [(context) => context.total_amount >= 5000] // Large amounts go to finance
                },
                { target: 'draft', action: 'return_to_draft', label: 'Return to Draft' }
            ],
            requiredActors: [WorkflowActors.ANALYZER, WorkflowActors.HR_SPECIALIST],
            onEnter: async (context, user, orgContext) => {
                context.submitted_at = new Date();
                context.submission_number = this.generateSubmissionNumber();
                console.log(`Expense claim submitted: ${context.submission_number}`);
            }
        }));

        // Manager Review State - Direct manager approval
        this.addState('manager_review', new StateNode('manager_review', {
            transitions: [
                {
                    target: 'finance_review',
                    action: 'approve_manager',
                    label: 'Approve (Manager)',
                    guards: [(context) => context.manager_approval && context.manager_comments]
                },
                {
                    target: 'rejected',
                    action: 'reject_manager',
                    label: 'Reject (Manager)',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'submitted', action: 'return_to_submitted', label: 'Return for Review' }
            ],
            requiredActors: [WorkflowActors.APPROVER],
            permissionConditions: {
                customCondition: (user, orgContext, workflowContext) => {
                    // Must be manager in same department as requester
                    const requesterDept = workflowContext.requester_department;
                    return orgContext.positions.some(pos =>
                        pos.designation.name.toLowerCase().includes('manager') &&
                        pos.group?.department?.name === requesterDept
                    );
                }
            },
            onEnter: async (context, user, orgContext) => {
                console.log(`Expense claim sent to manager review: ${context.submission_number}`);
            }
        }));

        // Finance Review State - Finance team approval
        this.addState('finance_review', new StateNode('finance_review', {
            transitions: [
                {
                    target: 'approved',
                    action: 'approve_finance',
                    label: 'Approve (Finance)',
                    guards: [(context) => context.finance_approval && this.validateFinanceChecks(context)]
                },
                {
                    target: 'rejected',
                    action: 'reject_finance',
                    label: 'Reject (Finance)',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'manager_review', action: 'return_to_manager', label: 'Return to Manager' }
            ],
            requiredActors: [WorkflowActors.FINANCE_SPECIALIST, WorkflowActors.APPROVER],
            permissionConditions: {
                department: ['Finance', 'Accounting'],
                designation: ['Finance Manager', 'Accountant', 'Finance Specialist', 'CFO']
            },
            validations: [
                (context) => this.validateBudgetAvailability(context),
                (context) => this.validatePolicyCompliance(context)
            ],
            onEnter: async (context, user, orgContext) => {
                console.log(`Expense claim sent to finance review: ${context.submission_number}`);
            }
        }));

        // Approved State - Ready for payment processing
        this.addState('approved', new StateNode('approved', {
            transitions: [
                { target: 'payment_processing', action: 'process_payment', label: 'Process Payment' }
            ],
            requiredActors: [WorkflowActors.FINANCE_SPECIALIST],
            onEnter: async (context, user, orgContext) => {
                context.approved_at = new Date();
                context.approval_number = this.generateApprovalNumber();
                console.log(`Expense claim approved: ${context.approval_number}`);
            }
        }));

        // Payment Processing State - Payment being processed
        this.addState('payment_processing', new StateNode('payment_processing', {
            transitions: [
                { target: 'paid', action: 'confirm_payment', label: 'Confirm Payment' },
                { target: 'payment_failed', action: 'payment_failed', label: 'Payment Failed' }
            ],
            requiredActors: [WorkflowActors.FINANCE_SPECIALIST],
            validations: [
                (context) => context.payment_method ? true : 'Payment method must be specified',
                (context) => context.bank_details || context.payment_method === 'check' ? true : 'Bank details required for electronic payment'
            ],
            onEnter: async (context, user, orgContext) => {
                context.payment_initiated_at = new Date();
                console.log(`Payment processing initiated for: ${context.submission_number}`);
            }
        }));

        // Paid State - Payment completed
        this.addState('paid', new StateNode('paid', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.paid_at = new Date();
                context.payment_reference = this.generatePaymentReference();
                console.log(`Payment completed: ${context.payment_reference}`);
            }
        }));

        // Payment Failed State - Payment processing failed
        this.addState('payment_failed', new StateNode('payment_failed', {
            transitions: [
                { target: 'payment_processing', action: 'retry_payment', label: 'Retry Payment' },
                { target: 'approved', action: 'update_payment_details', label: 'Update Payment Details' }
            ],
            requiredActors: [WorkflowActors.FINANCE_SPECIALIST],
            onEnter: async (context, user, orgContext) => {
                context.payment_failed_at = new Date();
                console.log(`Payment failed for: ${context.submission_number}`);
            }
        }));

        // Rejected State - Expense claim rejected
        this.addState('rejected', new StateNode('rejected', {
            transitions: [
                { target: 'draft', action: 'revise_and_resubmit', label: 'Revise and Resubmit' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rejected_at = new Date();
                console.log(`Expense claim rejected: ${context.rejection_reason}`);
            }
        }));

        // Cancelled State - Expense claim cancelled
        this.addState('cancelled', new StateNode('cancelled', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.cancelled_at = new Date();
                console.log(`Expense claim cancelled: ${context.submission_number}`);
            }
        }));
    }

    /**
     * Add expense item to claim
     */
    addExpenseItem(itemData, user) {
        if (!this.context.expense_items) {
            this.context.expense_items = [];
        }

        const item = {
            id: Date.now().toString(),
            date: new Date(itemData.date),
            category: itemData.category,
            description: itemData.description,
            amount: parseFloat(itemData.amount),
            currency: itemData.currency || 'USD',
            receipt_url: itemData.receipt_url,
            merchant: itemData.merchant,
            business_purpose: itemData.business_purpose,
            added_by: user.id,
            added_at: new Date()
        };

        this.context.expense_items.push(item);
        this.updateTotalAmount();
        this.updateContext({ expense_items: this.context.expense_items, total_amount: this.context.total_amount }, user);

        return item;
    }

    /**
     * Remove expense item from claim
     */
    removeExpenseItem(itemId, user) {
        if (!this.context.expense_items) return false;

        const index = this.context.expense_items.findIndex(item => item.id === itemId);
        if (index === -1) return false;

        this.context.expense_items.splice(index, 1);
        this.updateTotalAmount();
        this.updateContext({ expense_items: this.context.expense_items, total_amount: this.context.total_amount }, user);

        return true;
    }

    /**
     * Update total amount based on expense items
     */
    updateTotalAmount() {
        this.context.total_amount = this.context.expense_items?.reduce((total, item) => total + item.amount, 0) || 0;
    }

    /**
     * Validate receipts are provided for items above threshold
     */
    validateReceipts(context) {
        const receiptThreshold = 25; // Receipts required for expenses over $25

        const missingReceipts = context.expense_items?.filter(item =>
            item.amount > receiptThreshold && !item.receipt_url
        ) || [];

        return missingReceipts.length === 0 ? true : `Receipts required for expenses over $${receiptThreshold}`;
    }

    /**
     * Validate finance-specific checks
     */
    validateFinanceChecks(context) {
        return context.budget_code && context.cost_center && context.gl_account;
    }

    /**
     * Validate budget availability
     */
    validateBudgetAvailability(context) {
        // In a real implementation, this would check against budget systems
        return context.total_amount <= 10000 ? true : 'Amount exceeds available budget';
    }

    /**
     * Validate policy compliance
     */
    validatePolicyCompliance(context) {
        // Check expense policy rules
        const violations = [];

        context.expense_items?.forEach(item => {
            // Example policy checks
            if (item.category === 'Meals' && item.amount > 100) {
                violations.push(`Meal expense of $${item.amount} exceeds policy limit of $100`);
            }

            if (item.category === 'Travel' && !item.business_purpose) {
                violations.push('Travel expenses require business purpose');
            }

            if (item.category === 'Entertainment' && item.amount > 500) {
                violations.push(`Entertainment expense of $${item.amount} requires special approval`);
            }
        });

        return violations.length === 0 ? true : violations.join('; ');
    }

    /**
     * Generate submission number
     */
    generateSubmissionNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `EXP-${year}${month}-${random}`;
    }

    /**
     * Generate approval number
     */
    generateApprovalNumber() {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 8).toUpperCase();
        return `APP-${year}-${random}`;
    }

    /**
     * Generate payment reference
     */
    generatePaymentReference() {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 10).toUpperCase();
        return `PAY-${year}-${random}`;
    }

    /**
     * Get expense summary by category
     */
    getExpenseSummary() {
        if (!this.context.expense_items) return {};

        const summary = {};
        this.context.expense_items.forEach(item => {
            if (!summary[item.category]) {
                summary[item.category] = { count: 0, total: 0 };
            }
            summary[item.category].count++;
            summary[item.category].total += item.amount;
        });

        return summary;
    }

    /**
     * Get workflow metrics
     */
    getMetrics() {
        const metrics = {
            total_amount: this.context.total_amount || 0,
            item_count: this.context.expense_items?.length || 0,
            processing_time: null,
            approval_time: null,
            payment_time: null,
            expense_summary: this.getExpenseSummary()
        };

        // Calculate processing times
        if (this.context.approved_at && this.context.submitted_at) {
            metrics.approval_time = this.context.approved_at - this.context.submitted_at;
        }

        if (this.context.paid_at && this.context.approved_at) {
            metrics.payment_time = this.context.paid_at - this.context.approved_at;
        }

        if (this.context.paid_at && this.context.submitted_at) {
            metrics.processing_time = this.context.paid_at - this.context.submitted_at;
        }

        return metrics;
    }

    /**
     * Export workflow data for reporting
     */
    exportData() {
        return {
            ...this.serialize(),
            metrics: this.getMetrics(),
            expense_summary: this.getExpenseSummary(),
            timeline: this.history.map(entry => ({
                stage: entry.toState,
                date: entry.timestamp,
                user: entry.user.name,
                amount: this.context.total_amount
            }))
        };
    }
}