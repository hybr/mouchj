import { Component } from "../../../core/Component.js";

/**
 * Expense Approval Workflow Example Implementation
 * Demonstrates how to use the ExpenseApprovalWorkflow with custom UI components
 */
export class ExpenseWorkflowExample extends Component {
    constructor(workflowService, workflowId, user, organizationContext) {
        super();
        this.workflowService = workflowService;
        this.workflowId = workflowId;
        this.user = user;
        this.organizationContext = organizationContext;
        this.workflow = null;
        this.workflowData = null;
    }

    async render() {
        const container = this.createElement("div", "expense-workflow-example");

        container.innerHTML = `
            <div class="workflow-header">
                <h1>Expense Approval Workflow Example</h1>
                <div class="workflow-controls">
                    <button class="btn-primary" id="create-sample-expense">
                        Create Sample Expense Claim
                    </button>
                    <button class="btn-outline" id="load-existing" ${!this.workflowId ? 'disabled' : ''}>
                        Load Existing Workflow
                    </button>
                </div>
            </div>

            <div class="workflow-content" id="workflow-content">
                <div class="getting-started">
                    <h2>Getting Started with Expense Workflows</h2>
                    <p>This example demonstrates a complete expense approval workflow with:</p>
                    <ul>
                        <li>Expense claim creation and submission</li>
                        <li>Multi-level approval process (Manager → Finance)</li>
                        <li>Policy compliance validation</li>
                        <li>Budget availability checking</li>
                        <li>Payment processing and tracking</li>
                    </ul>
                    <p>Click "Create Sample Expense Claim" to see it in action!</p>
                </div>
            </div>

            <div class="expense-categories-guide">
                <h2>Expense Categories & Limits</h2>
                <div class="categories-grid">
                    <div class="category-card">
                        <h3>🍽️ Meals</h3>
                        <div class="category-limit">Limit: $100/day</div>
                        <div class="category-rules">
                            <span class="rule">✓ Business purpose required</span>
                            <span class="rule">✓ Receipts required over $25</span>
                        </div>
                    </div>

                    <div class="category-card">
                        <h3>✈️ Travel</h3>
                        <div class="category-limit">Varies by destination</div>
                        <div class="category-rules">
                            <span class="rule">✓ Pre-approval required</span>
                            <span class="rule">✓ Itinerary required</span>
                        </div>
                    </div>

                    <div class="category-card">
                        <h3>🏨 Accommodation</h3>
                        <div class="category-limit">Standard rates apply</div>
                        <div class="category-rules">
                            <span class="rule">✓ Booking confirmation required</span>
                            <span class="rule">✓ Personal charges excluded</span>
                        </div>
                    </div>

                    <div class="category-card">
                        <h3>🎭 Entertainment</h3>
                        <div class="category-limit">Limit: $500/month</div>
                        <div class="category-rules">
                            <span class="rule">✓ Special approval over $500</span>
                            <span class="rule">✓ Business justification required</span>
                        </div>
                    </div>

                    <div class="category-card">
                        <h3>📱 Technology</h3>
                        <div class="category-limit">Pre-approved items only</div>
                        <div class="category-rules">
                            <span class="rule">✓ IT department approval</span>
                            <span class="rule">✓ Asset tagging required</span>
                        </div>
                    </div>

                    <div class="category-card">
                        <h3>📚 Training</h3>
                        <div class="category-limit">Budget allocation based</div>
                        <div class="category-rules">
                            <span class="rule">✓ Manager pre-approval</span>
                            <span class="rule">✓ Certificate/completion proof</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="workflow-states-guide">
                <h2>Approval Process Guide</h2>
                <div class="process-flow">
                    <div class="flow-step">
                        <div class="step-number">1</div>
                        <h3>Draft</h3>
                        <p>Create and prepare expense claim</p>
                        <div class="step-actions">
                            <span class="action">📝 Add expense items</span>
                            <span class="action">📎 Upload receipts</span>
                            <span class="action">➡️ Submit for review</span>
                        </div>
                    </div>

                    <div class="flow-arrow">→</div>

                    <div class="flow-step">
                        <div class="step-number">2</div>
                        <h3>Manager Review</h3>
                        <p>Direct manager approval (amounts < $5,000)</p>
                        <div class="step-actions">
                            <span class="action">✅ Approve</span>
                            <span class="action">❌ Reject</span>
                            <span class="action">↩️ Request changes</span>
                        </div>
                    </div>

                    <div class="flow-arrow">→</div>

                    <div class="flow-step">
                        <div class="step-number">3</div>
                        <h3>Finance Review</h3>
                        <p>Finance team validation and approval</p>
                        <div class="step-actions">
                            <span class="action">💰 Budget check</span>
                            <span class="action">📋 Policy compliance</span>
                            <span class="action">✅ Final approval</span>
                        </div>
                    </div>

                    <div class="flow-arrow">→</div>

                    <div class="flow-step">
                        <div class="step-number">4</div>
                        <h3>Payment</h3>
                        <p>Process reimbursement</p>
                        <div class="step-actions">
                            <span class="action">🏦 Bank transfer</span>
                            <span class="action">📧 Notification</span>
                            <span class="action">✅ Complete</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners(container);

        if (this.workflowId) {
            await this.loadWorkflow();
        }

        return container;
    }

    addEventListeners(container) {
        const createSampleBtn = container.querySelector('#create-sample-expense');
        createSampleBtn.addEventListener('click', () => this.createSampleExpenseWorkflow());

        const loadExistingBtn = container.querySelector('#load-existing');
        if (loadExistingBtn && !loadExistingBtn.disabled) {
            loadExistingBtn.addEventListener('click', () => this.loadWorkflow());
        }
    }

    async createSampleExpenseWorkflow() {
        try {
            const sampleExpenseData = {
                title: 'Business Trip to Client Meeting',
                description: 'Expenses from client meeting trip to New York',
                priority: 'normal',
                business_purpose: 'Client meeting and project discussion with ABC Corp',
                requester_department: 'Sales'
            };

            // Generate unique workflow ID
            const workflowId = `expense_${Date.now()}`;

            // Create the workflow
            const workflow = await this.workflowService.createWorkflow(
                'ExpenseApprovalWorkflow',
                workflowId,
                this.user,
                this.organizationContext,
                {
                    metadata: sampleExpenseData,
                    context: {
                        business_purpose: sampleExpenseData.business_purpose,
                        requester_department: sampleExpenseData.requester_department,
                        total_amount: 0,
                        expense_items: []
                    }
                }
            );

            this.workflowId = workflowId;

            // Add sample expense items
            await this.addSampleExpenseItems();

            this.showSuccess('Sample expense workflow created successfully!');

            // Load and display the workflow
            await this.loadWorkflow();

        } catch (error) {
            console.error('Error creating sample expense workflow:', error);
            this.showError('Failed to create sample expense workflow. Please try again.');
        }
    }

    async addSampleExpenseItems() {
        const sampleItems = [
            {
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                category: 'Travel',
                description: 'Flight to New York',
                amount: 425.50,
                currency: 'USD',
                merchant: 'American Airlines',
                business_purpose: 'Travel to client meeting',
                receipt_url: 'https://example.com/receipt1.pdf'
            },
            {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                category: 'Accommodation',
                description: 'Hotel stay - 2 nights',
                amount: 320.00,
                currency: 'USD',
                merchant: 'Marriott Hotel',
                business_purpose: 'Accommodation during client meeting trip',
                receipt_url: 'https://example.com/receipt2.pdf'
            },
            {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                category: 'Meals',
                description: 'Client dinner',
                amount: 85.75,
                currency: 'USD',
                merchant: 'Fine Dining Restaurant',
                business_purpose: 'Business dinner with ABC Corp executives',
                receipt_url: 'https://example.com/receipt3.pdf'
            },
            {
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
                category: 'Transportation',
                description: 'Taxi to airport',
                amount: 45.25,
                currency: 'USD',
                merchant: 'NYC Taxi',
                business_purpose: 'Transportation to airport after client meeting',
                receipt_url: 'https://example.com/receipt4.pdf'
            }
        ];

        // Update workflow context with expense items
        const totalAmount = sampleItems.reduce((sum, item) => sum + item.amount, 0);

        await this.workflowService.updateWorkflowContext(
            this.workflowId,
            {
                expense_items: sampleItems,
                total_amount: totalAmount
            },
            this.user,
            this.organizationContext
        );
    }

    async loadWorkflow() {
        try {
            // Load workflow data
            this.workflow = await this.workflowService.getWorkflow(this.workflowId);
            this.workflowData = await this.workflowService.getWorkflowData(
                this.workflowId,
                this.user,
                this.organizationContext
            );

            this.displayWorkflow();

        } catch (error) {
            console.error('Error loading workflow:', error);
            this.showError('Failed to load workflow. Please check the workflow ID.');
        }
    }

    displayWorkflow() {
        const content = document.getElementById('workflow-content');

        content.innerHTML = `
            <div class="workflow-display">
                <div class="workflow-header">
                    <h2>${this.workflow.metadata?.title || 'Expense Claim'}</h2>
                    <div class="workflow-status">
                        <span class="status-badge ${this.getStatusClass(this.workflow.currentState)}">
                            ${this.formatState(this.workflow.currentState)}
                        </span>
                        <span class="amount-badge">
                            $${(this.workflow.context?.total_amount || 0).toFixed(2)}
                        </span>
                        ${this.workflow.context?.submission_number ? `
                            <span class="submission-badge">
                                ${this.workflow.context.submission_number}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="workflow-details">
                    <div class="detail-section">
                        <h3>Expense Summary</h3>
                        <div class="expense-summary">
                            <div class="summary-item">
                                <strong>Total Amount:</strong> $${(this.workflow.context?.total_amount || 0).toFixed(2)}
                            </div>
                            <div class="summary-item">
                                <strong>Number of Items:</strong> ${this.workflow.context?.expense_items?.length || 0}
                            </div>
                            <div class="summary-item">
                                <strong>Business Purpose:</strong> ${this.workflow.context?.business_purpose || 'N/A'}
                            </div>
                            <div class="summary-item">
                                <strong>Department:</strong> ${this.workflow.context?.requester_department || 'N/A'}
                            </div>
                        </div>

                        ${this.renderExpenseItems()}
                        ${this.renderExpenseBreakdown()}
                    </div>

                    <div class="action-section">
                        <h3>Available Actions</h3>
                        <div class="actions-grid" id="workflow-actions">
                            ${this.renderAvailableActions()}
                        </div>
                    </div>

                    <div class="state-specific-content">
                        ${this.renderStateSpecificContent()}
                    </div>

                    <div class="progress-section">
                        <h3>Approval Timeline</h3>
                        <div class="timeline">
                            ${this.renderTimeline()}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Expense Item Modal -->
            <div class="modal-backdrop hidden" id="add-item-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Expense Item</h3>
                        <button class="modal-close" id="close-add-item">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="expense-item-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="item-date">Date</label>
                                    <input type="date" id="item-date" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label for="item-category">Category</label>
                                    <select id="item-category" class="form-select" required>
                                        <option value="">Select category...</option>
                                        <option value="Meals">Meals</option>
                                        <option value="Travel">Travel</option>
                                        <option value="Accommodation">Accommodation</option>
                                        <option value="Transportation">Transportation</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Training">Training</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="item-description">Description</label>
                                <input type="text" id="item-description" class="form-input"
                                       placeholder="Brief description of the expense" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="item-amount">Amount</label>
                                    <input type="number" id="item-amount" class="form-input"
                                           step="0.01" min="0" placeholder="0.00" required>
                                </div>
                                <div class="form-group">
                                    <label for="item-merchant">Merchant</label>
                                    <input type="text" id="item-merchant" class="form-input"
                                           placeholder="Merchant/vendor name">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="item-purpose">Business Purpose</label>
                                <textarea id="item-purpose" class="form-textarea" rows="2"
                                          placeholder="Explain the business purpose for this expense" required></textarea>
                            </div>
                            <div class="form-group">
                                <label for="item-receipt">Receipt URL (Demo)</label>
                                <input type="url" id="item-receipt" class="form-input"
                                       placeholder="https://example.com/receipt.pdf">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-outline" id="cancel-add-item">Cancel</button>
                        <button class="btn-primary" id="confirm-add-item">Add Item</button>
                    </div>
                </div>
            </div>

            <!-- Action Modal -->
            <div class="modal-backdrop hidden" id="action-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="action-title">Execute Action</h3>
                        <button class="modal-close" id="close-action-modal">&times;</button>
                    </div>
                    <div class="modal-body" id="action-form">
                        <!-- Dynamic content -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn-outline" id="cancel-action">Cancel</button>
                        <button class="btn-primary" id="confirm-action">Execute</button>
                    </div>
                </div>
            </div>
        `;

        this.setupActionListeners();
    }

    renderExpenseItems() {
        const items = this.workflow.context?.expense_items || [];

        if (items.length === 0) {
            return `
                <div class="expense-items">
                    <h4>Expense Items</h4>
                    <div class="no-items">
                        No expense items added yet.
                        ${this.workflow.currentState === 'draft' ? `
                            <button class="btn-outline btn-sm" id="add-first-item">
                                ➕ Add First Item
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="expense-items">
                <div class="items-header">
                    <h4>Expense Items (${items.length})</h4>
                    ${this.workflow.currentState === 'draft' ? `
                        <button class="btn-outline btn-sm" id="add-item-btn">
                            ➕ Add Item
                        </button>
                    ` : ''}
                </div>
                <div class="items-list">
                    ${items.map((item, index) => `
                        <div class="expense-item">
                            <div class="item-header">
                                <span class="item-category">${item.category}</span>
                                <span class="item-amount">$${item.amount.toFixed(2)}</span>
                                <span class="item-date">${new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <div class="item-details">
                                <div class="item-description">${item.description}</div>
                                <div class="item-merchant">📍 ${item.merchant}</div>
                                <div class="item-purpose">💼 ${item.business_purpose}</div>
                                ${item.receipt_url ? `
                                    <div class="item-receipt">
                                        <a href="${item.receipt_url}" target="_blank">📎 View Receipt</a>
                                    </div>
                                ` : ''}
                            </div>
                            ${this.workflow.currentState === 'draft' ? `
                                <div class="item-actions">
                                    <button class="btn-outline btn-xs" onclick="alert('Edit functionality would be implemented here')">
                                        ✏️ Edit
                                    </button>
                                    <button class="btn-danger btn-xs" onclick="this.removeExpenseItem(${index})">
                                        🗑️ Remove
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderExpenseBreakdown() {
        const items = this.workflow.context?.expense_items || [];

        if (items.length === 0) return '';

        // Group by category
        const breakdown = {};
        items.forEach(item => {
            if (!breakdown[item.category]) {
                breakdown[item.category] = { count: 0, total: 0 };
            }
            breakdown[item.category].count++;
            breakdown[item.category].total += item.amount;
        });

        return `
            <div class="expense-breakdown">
                <h4>Category Breakdown</h4>
                <div class="breakdown-grid">
                    ${Object.entries(breakdown).map(([category, data]) => `
                        <div class="breakdown-item">
                            <div class="breakdown-category">${category}</div>
                            <div class="breakdown-count">${data.count} item${data.count !== 1 ? 's' : ''}</div>
                            <div class="breakdown-total">$${data.total.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAvailableActions() {
        const actions = this.workflowData?.availableActions || [];

        if (actions.length === 0) {
            return '<div class="no-actions">No actions available in current state</div>';
        }

        return actions.map(action => `
            <button class="action-btn btn-primary"
                    data-action="${action.action}"
                    data-target="${action.target}">
                ${action.label}
            </button>
        `).join('');
    }

    renderStateSpecificContent() {
        const state = this.workflow.currentState;

        switch (state) {
            case 'draft':
                return this.renderDraftContent();
            case 'manager_review':
                return this.renderManagerReviewContent();
            case 'finance_review':
                return this.renderFinanceReviewContent();
            case 'payment_processing':
                return this.renderPaymentProcessingContent();
            case 'paid':
                return this.renderPaidContent();
            default:
                return '';
        }
    }

    renderDraftContent() {
        return `
            <div class="state-content">
                <h4>Draft State</h4>
                <p>Your expense claim is being prepared. You can:</p>
                <ul>
                    <li>Add or remove expense items</li>
                    <li>Upload receipts and documentation</li>
                    <li>Review totals and categories</li>
                    <li>Submit for manager approval when ready</li>
                </ul>
                <div class="draft-tips">
                    <h5>💡 Tips for faster approval:</h5>
                    <ul>
                        <li>Ensure all receipts are attached for items over $25</li>
                        <li>Provide clear business purpose for each expense</li>
                        <li>Check company policy limits before submitting</li>
                        <li>Group related expenses when possible</li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderManagerReviewContent() {
        return `
            <div class="state-content">
                <h4>Manager Review</h4>
                <p>Expense claim is with your manager for review and approval.</p>
                <div class="review-info">
                    <div class="info-item">
                        <strong>Submitted:</strong> ${this.workflow.context?.submitted_at ?
                            new Date(this.workflow.context.submitted_at).toLocaleDateString() : 'Recently'}
                    </div>
                    <div class="info-item">
                        <strong>Review Level:</strong> Manager Approval (< $5,000)
                    </div>
                    <div class="info-item">
                        <strong>Next Step:</strong> ${this.workflow.context?.total_amount > 5000 ?
                            'Finance Review (if approved)' : 'Payment Processing (if approved)'}
                    </div>
                </div>
                <div class="review-actions">
                    <button class="btn-outline" onclick="alert('Would send reminder to manager')">
                        📧 Send Reminder
                    </button>
                    <button class="btn-outline" onclick="alert('Would show manager contact info')">
                        👤 Contact Manager
                    </button>
                </div>
            </div>
        `;
    }

    renderFinanceReviewContent() {
        return `
            <div class="state-content">
                <h4>Finance Review</h4>
                <p>Expense claim is with the finance team for final validation.</p>
                <div class="finance-checklist">
                    <h5>Finance Validation Checklist:</h5>
                    <div class="checklist-item">
                        <span class="check">✓</span> Manager approval received
                    </div>
                    <div class="checklist-item">
                        <span class="check">⏳</span> Budget availability check
                    </div>
                    <div class="checklist-item">
                        <span class="check">⏳</span> Policy compliance review
                    </div>
                    <div class="checklist-item">
                        <span class="check">⏳</span> Documentation verification
                    </div>
                </div>
                <div class="finance-info">
                    <div class="info-item">
                        <strong>Budget Code:</strong> ${this.workflow.context?.budget_code || 'To be assigned'}
                    </div>
                    <div class="info-item">
                        <strong>Cost Center:</strong> ${this.workflow.context?.cost_center || 'To be assigned'}
                    </div>
                    <div class="info-item">
                        <strong>GL Account:</strong> ${this.workflow.context?.gl_account || 'To be assigned'}
                    </div>
                </div>
            </div>
        `;
    }

    renderPaymentProcessingContent() {
        return `
            <div class="state-content">
                <h4>Payment Processing</h4>
                <p>Your expense claim has been approved and payment is being processed.</p>
                <div class="payment-info">
                    <div class="info-item">
                        <strong>Approved Amount:</strong> $${(this.workflow.context?.total_amount || 0).toFixed(2)}
                    </div>
                    <div class="info-item">
                        <strong>Payment Method:</strong> ${this.workflow.context?.payment_method || 'Bank Transfer'}
                    </div>
                    <div class="info-item">
                        <strong>Processing Started:</strong> ${this.workflow.context?.payment_initiated_at ?
                            new Date(this.workflow.context.payment_initiated_at).toLocaleDateString() : 'Today'}
                    </div>
                    <div class="info-item">
                        <strong>Expected Payment:</strong> 3-5 business days
                    </div>
                </div>
                <div class="payment-status">
                    <div class="status-step completed">
                        <span class="step-icon">✓</span>
                        <span class="step-text">Approved</span>
                    </div>
                    <div class="status-step current">
                        <span class="step-icon">⏳</span>
                        <span class="step-text">Processing</span>
                    </div>
                    <div class="status-step">
                        <span class="step-icon">💰</span>
                        <span class="step-text">Paid</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPaidContent() {
        return `
            <div class="state-content">
                <h4>Payment Completed</h4>
                <p>Your expense reimbursement has been processed successfully!</p>
                <div class="payment-summary">
                    <div class="summary-item">
                        <strong>Total Paid:</strong> $${(this.workflow.context?.total_amount || 0).toFixed(2)}
                    </div>
                    <div class="summary-item">
                        <strong>Payment Date:</strong> ${this.workflow.context?.paid_at ?
                            new Date(this.workflow.context.paid_at).toLocaleDateString() : 'Today'}
                    </div>
                    <div class="summary-item">
                        <strong>Payment Reference:</strong> ${this.workflow.context?.payment_reference || 'REF123456'}
                    </div>
                    <div class="summary-item">
                        <strong>Processing Time:</strong> ${this.calculateProcessingTime()}
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="btn-outline" onclick="alert('Would download payment receipt')">
                        📄 Download Receipt
                    </button>
                    <button class="btn-outline" onclick="alert('Would export expense report')">
                        📊 Export Report
                    </button>
                </div>
            </div>
        `;
    }

    renderTimeline() {
        const history = this.workflow.history || [];

        if (history.length === 0) {
            return '<div class="no-timeline">No progress recorded yet</div>';
        }

        return history.map(entry => `
            <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-state">${this.formatState(entry.toState)}</div>
                    <div class="timeline-user">👤 ${entry.user.name}</div>
                    <div class="timeline-time">${this.formatDateTime(entry.timestamp)}</div>
                    ${entry.context?.comment ? `
                        <div class="timeline-comment">"${entry.context.comment}"</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    setupActionListeners() {
        // Action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const target = e.target.dataset.target;
                this.showActionModal(action, target);
            });
        });

        // Add item buttons
        const addItemBtns = document.querySelectorAll('#add-item-btn, #add-first-item');
        addItemBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showAddItemModal());
        });

        // Add item modal controls
        const addItemModal = document.getElementById('add-item-modal');
        const closeAddItem = document.getElementById('close-add-item');
        const cancelAddItem = document.getElementById('cancel-add-item');
        const confirmAddItem = document.getElementById('confirm-add-item');

        [closeAddItem, cancelAddItem].forEach(btn => {
            btn.addEventListener('click', () => this.hideAddItemModal());
        });

        confirmAddItem.addEventListener('click', () => this.addExpenseItem());

        // Action modal controls
        const actionModal = document.getElementById('action-modal');
        const closeActionModal = document.getElementById('close-action-modal');
        const cancelAction = document.getElementById('cancel-action');
        const confirmAction = document.getElementById('confirm-action');

        [closeActionModal, cancelAction].forEach(btn => {
            btn.addEventListener('click', () => this.hideActionModal());
        });

        confirmAction.addEventListener('click', () => this.executeAction());

        // Close modals on backdrop click
        [addItemModal, actionModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal === addItemModal) this.hideAddItemModal();
                    if (modal === actionModal) this.hideActionModal();
                }
            });
        });
    }

    showAddItemModal() {
        const modal = document.getElementById('add-item-modal');
        const form = document.getElementById('expense-item-form');

        // Reset form and set default date
        form.reset();
        document.getElementById('item-date').valueAsDate = new Date();

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideAddItemModal() {
        const modal = document.getElementById('add-item-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    async addExpenseItem() {
        const form = document.getElementById('expense-item-form');
        const formData = new FormData(form);

        const itemData = {
            date: document.getElementById('item-date').value,
            category: document.getElementById('item-category').value,
            description: document.getElementById('item-description').value,
            amount: parseFloat(document.getElementById('item-amount').value),
            merchant: document.getElementById('item-merchant').value,
            business_purpose: document.getElementById('item-purpose').value,
            receipt_url: document.getElementById('item-receipt').value || `https://example.com/receipt_${Date.now()}.pdf`
        };

        // Validate required fields
        if (!itemData.date || !itemData.category || !itemData.description ||
            !itemData.amount || !itemData.business_purpose) {
            this.showError('Please fill in all required fields.');
            return;
        }

        if (itemData.amount <= 0) {
            this.showError('Amount must be greater than 0.');
            return;
        }

        try {
            // Add to existing expense items
            const currentItems = this.workflow.context?.expense_items || [];
            const newItems = [...currentItems, itemData];
            const newTotal = newItems.reduce((sum, item) => sum + item.amount, 0);

            await this.workflowService.updateWorkflowContext(
                this.workflowId,
                {
                    expense_items: newItems,
                    total_amount: newTotal
                },
                this.user,
                this.organizationContext
            );

            this.hideAddItemModal();
            await this.loadWorkflow();
            this.showSuccess('Expense item added successfully!');

        } catch (error) {
            console.error('Error adding expense item:', error);
            this.showError('Failed to add expense item. Please try again.');
        }
    }

    showActionModal(action, target) {
        const modal = document.getElementById('action-modal');
        const title = document.getElementById('action-title');
        const form = document.getElementById('action-form');

        title.textContent = `Execute: ${action.replace(/_/g, ' ')}`;

        // Generate action-specific form
        form.innerHTML = this.generateActionForm(action, target);

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.currentAction = { action, target };
    }

    generateActionForm(action, target) {
        let formHTML = `
            <div class="form-group">
                <label for="action-comment">Comment (optional)</label>
                <textarea id="action-comment" class="form-textarea" rows="3"
                          placeholder="Add a comment about this action..."></textarea>
            </div>
        `;

        // Add action-specific fields
        if (action === 'submit_claim') {
            formHTML += `
                <div class="form-group">
                    <label>Submission Checklist</label>
                    <div class="checklist">
                        <label class="checklist-item">
                            <input type="checkbox" required>
                            All receipts are attached for expenses over $25
                        </label>
                        <label class="checklist-item">
                            <input type="checkbox" required>
                            Business purpose is clearly stated for each item
                        </label>
                        <label class="checklist-item">
                            <input type="checkbox" required>
                            All expenses comply with company policy
                        </label>
                    </div>
                </div>
            `;
        }

        if (action.includes('approve')) {
            formHTML += `
                <div class="form-group">
                    <label for="approval-comments">Approval Comments</label>
                    <textarea id="approval-comments" class="form-textarea" rows="3"
                              placeholder="Add approval comments..."></textarea>
                </div>
            `;

            if (action === 'approve_finance') {
                formHTML += `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="budget-code">Budget Code</label>
                            <input type="text" id="budget-code" class="form-input"
                                   placeholder="e.g., DEPT-2024-001" required>
                        </div>
                        <div class="form-group">
                            <label for="cost-center">Cost Center</label>
                            <input type="text" id="cost-center" class="form-input"
                                   placeholder="e.g., CC-SALES-001" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="gl-account">GL Account</label>
                        <input type="text" id="gl-account" class="form-input"
                               placeholder="e.g., 6200-Travel-Expenses" required>
                    </div>
                `;
            }
        }

        if (action.includes('reject')) {
            formHTML += `
                <div class="form-group">
                    <label for="rejection-reason">Rejection Reason *</label>
                    <textarea id="rejection-reason" class="form-textarea" rows="3"
                              placeholder="Please provide a detailed reason for rejection..." required></textarea>
                </div>
            `;
        }

        if (action === 'process_payment') {
            formHTML += `
                <div class="form-group">
                    <label for="payment-method">Payment Method</label>
                    <select id="payment-method" class="form-select" required>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="check">Check</option>
                        <option value="payroll">Add to Payroll</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="bank-details">Bank Details (for transfers)</label>
                    <textarea id="bank-details" class="form-textarea" rows="2"
                              placeholder="Bank account information..."></textarea>
                </div>
            `;
        }

        return formHTML;
    }

    hideActionModal() {
        const modal = document.getElementById('action-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentAction = null;
    }

    async executeAction() {
        if (!this.currentAction) return;

        try {
            const formData = this.collectActionFormData();

            await this.workflowService.executeWorkflowAction(
                this.workflowId,
                this.currentAction.target,
                this.user,
                this.organizationContext,
                formData
            );

            this.hideActionModal();
            await this.loadWorkflow();
            this.showSuccess(`Action "${this.currentAction.action}" executed successfully!`);

        } catch (error) {
            console.error('Error executing action:', error);
            this.showError('Failed to execute action. Please try again.');
        }
    }

    collectActionFormData() {
        const formData = {};

        const comment = document.getElementById('action-comment')?.value;
        if (comment) formData.comment = comment;

        const approvalComments = document.getElementById('approval-comments')?.value;
        if (approvalComments) {
            formData.manager_approval = true;
            formData.manager_comments = approvalComments;
        }

        const rejectionReason = document.getElementById('rejection-reason')?.value;
        if (rejectionReason) formData.rejection_reason = rejectionReason;

        const budgetCode = document.getElementById('budget-code')?.value;
        if (budgetCode) formData.budget_code = budgetCode;

        const costCenter = document.getElementById('cost-center')?.value;
        if (costCenter) formData.cost_center = costCenter;

        const glAccount = document.getElementById('gl-account')?.value;
        if (glAccount) formData.gl_account = glAccount;

        const paymentMethod = document.getElementById('payment-method')?.value;
        if (paymentMethod) formData.payment_method = paymentMethod;

        const bankDetails = document.getElementById('bank-details')?.value;
        if (bankDetails) formData.bank_details = bankDetails;

        // Finance approval specific
        if (budgetCode && costCenter && glAccount) {
            formData.finance_approval = true;
        }

        return formData;
    }

    calculateProcessingTime() {
        if (!this.workflow.context?.submitted_at || !this.workflow.context?.paid_at) {
            return 'N/A';
        }

        const start = new Date(this.workflow.context.submitted_at);
        const end = new Date(this.workflow.context.paid_at);
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));

        return `${diffDays} business day${diffDays !== 1 ? 's' : ''}`;
    }

    // Utility methods
    formatState(state) {
        if (!state) return 'Unknown';
        return state.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
    }

    getStatusClass(state) {
        if (['paid'].includes(state)) return 'status-completed';
        if (['rejected', 'cancelled'].includes(state)) return 'status-rejected';
        if (['submitted', 'manager_review', 'finance_review'].includes(state)) return 'status-pending';
        if (['payment_processing'].includes(state)) return 'status-processing';
        return 'status-in-progress';
    }

    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    showSuccess(message) {
        alert(message); // In a real app, use a proper notification system
    }

    showError(message) {
        alert(message); // In a real app, use a proper notification system
    }
}