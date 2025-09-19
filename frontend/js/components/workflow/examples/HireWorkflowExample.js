import { Component } from "../../../core/Component.js";

/**
 * Hire Workflow Example Implementation
 * Demonstrates how to use the HireWorkflow with custom UI components
 */
export class HireWorkflowExample extends Component {
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
        const container = this.createElement("div", "hire-workflow-example");

        container.innerHTML = `
            <div class="workflow-header">
                <h1>Hire Workflow Example</h1>
                <div class="workflow-controls">
                    <button class="btn-primary" id="create-sample-workflow">
                        Create Sample Hire Workflow
                    </button>
                    <button class="btn-outline" id="load-existing" ${!this.workflowId ? 'disabled' : ''}>
                        Load Existing Workflow
                    </button>
                </div>
            </div>

            <div class="workflow-content" id="workflow-content">
                <div class="getting-started">
                    <h2>Getting Started with Hire Workflows</h2>
                    <p>This example demonstrates a complete hire workflow implementation with:</p>
                    <ul>
                        <li>Job requisition creation and approval</li>
                        <li>Job posting and candidate management</li>
                        <li>Interview scheduling and feedback</li>
                        <li>Candidate selection and offer management</li>
                        <li>Onboarding process tracking</li>
                    </ul>
                    <p>Click "Create Sample Hire Workflow" to see it in action!</p>
                </div>
            </div>

            <div class="workflow-states-guide">
                <h2>Workflow States Guide</h2>
                <div class="states-grid">
                    <div class="state-card">
                        <h3>Draft</h3>
                        <p>Initial job requisition creation</p>
                        <div class="state-actions">
                            <span class="action">✏️ Edit job details</span>
                            <span class="action">📝 Add requirements</span>
                            <span class="action">➡️ Submit for approval</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Pending Approval</h3>
                        <p>Manager/HR review and approval</p>
                        <div class="state-actions">
                            <span class="action">✅ Approve requisition</span>
                            <span class="action">❌ Reject requisition</span>
                            <span class="action">↩️ Return to draft</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Posted</h3>
                        <p>Job is live and accepting applications</p>
                        <div class="state-actions">
                            <span class="action">👥 View applications</span>
                            <span class="action">🔍 Start screening</span>
                            <span class="action">❌ Cancel posting</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Screening</h3>
                        <p>Initial candidate review and filtering</p>
                        <div class="state-actions">
                            <span class="action">📋 Review resumes</span>
                            <span class="action">📞 Phone screens</span>
                            <span class="action">➡️ Start interviews</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Interviewing</h3>
                        <p>Conduct candidate interviews</p>
                        <div class="state-actions">
                            <span class="action">📅 Schedule interviews</span>
                            <span class="action">📝 Record feedback</span>
                            <span class="action">➡️ Select candidate</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Offer Sent</h3>
                        <p>Job offer extended to candidate</p>
                        <div class="state-actions">
                            <span class="action">⏳ Wait for response</span>
                            <span class="action">✅ Accept offer</span>
                            <span class="action">❌ Reject offer</span>
                        </div>
                    </div>

                    <div class="state-card">
                        <h3>Onboarding</h3>
                        <p>New hire integration process</p>
                        <div class="state-actions">
                            <span class="action">📋 Complete checklist</span>
                            <span class="action">🎓 Orientation</span>
                            <span class="action">✅ Complete hire</span>
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
        const createSampleBtn = container.querySelector('#create-sample-workflow');
        createSampleBtn.addEventListener('click', () => this.createSampleWorkflow());

        const loadExistingBtn = container.querySelector('#load-existing');
        if (loadExistingBtn && !loadExistingBtn.disabled) {
            loadExistingBtn.addEventListener('click', () => this.loadWorkflow());
        }
    }

    async createSampleWorkflow() {
        try {
            const sampleJobData = {
                title: 'Senior Software Engineer',
                description: 'We are looking for an experienced software engineer to join our development team.',
                priority: 'high',
                department: 'Engineering',
                position_count: 1,
                requirements: [
                    '5+ years of software development experience',
                    'Proficiency in JavaScript, Python, or Java',
                    'Experience with web frameworks',
                    'Strong problem-solving skills',
                    'Bachelor\'s degree in Computer Science or related field'
                ],
                responsibilities: [
                    'Design and develop software applications',
                    'Collaborate with cross-functional teams',
                    'Write clean, maintainable code',
                    'Participate in code reviews',
                    'Mentor junior developers'
                ]
            };

            // Generate unique workflow ID
            const workflowId = `hire_${Date.now()}`;

            // Create the workflow
            const workflow = await this.workflowService.createWorkflow(
                'HireWorkflow',
                workflowId,
                this.user,
                this.organizationContext,
                {
                    metadata: sampleJobData,
                    context: {
                        jobTitle: sampleJobData.title,
                        department: sampleJobData.department,
                        position_count: sampleJobData.position_count,
                        business_purpose: 'Team expansion for new project initiatives',
                        priority: sampleJobData.priority,
                        requirements: sampleJobData.requirements,
                        responsibilities: sampleJobData.responsibilities,
                        requester_department: sampleJobData.department
                    }
                }
            );

            this.workflowId = workflowId;
            this.showSuccess('Sample hire workflow created successfully!');

            // Load and display the workflow
            await this.loadWorkflow();

        } catch (error) {
            console.error('Error creating sample workflow:', error);
            this.showError('Failed to create sample workflow. Please try again.');
        }
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
                    <h2>${this.workflow.metadata?.title || 'Hire Workflow'}</h2>
                    <div class="workflow-status">
                        <span class="status-badge ${this.getStatusClass(this.workflow.currentState)}">
                            ${this.formatState(this.workflow.currentState)}
                        </span>
                        <span class="priority-badge priority-${this.workflow.metadata?.priority || 'normal'}">
                            ${(this.workflow.metadata?.priority || 'normal').toUpperCase()}
                        </span>
                    </div>
                </div>

                <div class="workflow-details">
                    <div class="detail-section">
                        <h3>Job Details</h3>
                        <div class="job-info">
                            <div class="info-item">
                                <strong>Position:</strong> ${this.workflow.context?.jobTitle || 'N/A'}
                            </div>
                            <div class="info-item">
                                <strong>Department:</strong> ${this.workflow.context?.department || 'N/A'}
                            </div>
                            <div class="info-item">
                                <strong>Positions to fill:</strong> ${this.workflow.context?.position_count || 'N/A'}
                            </div>
                            <div class="info-item">
                                <strong>Business Purpose:</strong> ${this.workflow.context?.business_purpose || 'N/A'}
                            </div>
                        </div>

                        ${this.workflow.context?.requirements ? `
                            <div class="requirements">
                                <h4>Requirements:</h4>
                                <ul>
                                    ${this.workflow.context.requirements.map(req => `<li>${req}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        ${this.workflow.context?.responsibilities ? `
                            <div class="responsibilities">
                                <h4>Responsibilities:</h4>
                                <ul>
                                    ${this.workflow.context.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
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
                        <h3>Progress Timeline</h3>
                        <div class="timeline">
                            ${this.renderTimeline()}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Modal -->
            <div class="modal-backdrop hidden" id="action-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="action-title">Execute Action</h3>
                        <button class="modal-close" id="close-modal">&times;</button>
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
            case 'posted':
                return this.renderPostedContent();
            case 'screening':
                return this.renderScreeningContent();
            case 'interviewing':
                return this.renderInterviewingContent();
            case 'offer_sent':
                return this.renderOfferSentContent();
            case 'onboarding':
                return this.renderOnboardingContent();
            default:
                return '';
        }
    }

    renderDraftContent() {
        return `
            <div class="state-content">
                <h4>Draft State Actions</h4>
                <p>In the draft state, you can:</p>
                <ul>
                    <li>Edit job title and description</li>
                    <li>Modify requirements and responsibilities</li>
                    <li>Set priority and urgency level</li>
                    <li>Submit for manager approval</li>
                </ul>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="alert('In a real implementation, this would open an edit form')">
                        ✏️ Edit Job Details
                    </button>
                    <button class="btn-outline" onclick="alert('In a real implementation, this would open requirements editor')">
                        📋 Update Requirements
                    </button>
                </div>
            </div>
        `;
    }

    renderPostedContent() {
        return `
            <div class="state-content">
                <h4>Posted State - Job is Live</h4>
                <p>Job posting is active and receiving applications:</p>
                <div class="posting-stats">
                    <div class="stat-item">
                        <strong>Applications Received:</strong> ${this.workflow.context?.candidates?.length || 0}
                    </div>
                    <div class="stat-item">
                        <strong>Posting URL:</strong>
                        <a href="#" onclick="alert('Sample job posting URL')" target="_blank">
                            ${this.workflow.context?.job_posting_url || 'Generate URL'}
                        </a>
                    </div>
                </div>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="alert('Would show application management interface')">
                        👥 Manage Applications
                    </button>
                    <button class="btn-outline" onclick="alert('Would show posting analytics')">
                        📊 View Analytics
                    </button>
                </div>
            </div>
        `;
    }

    renderScreeningContent() {
        const candidates = this.workflow.context?.candidates || [];
        return `
            <div class="state-content">
                <h4>Candidate Screening</h4>
                <p>Review and screen candidates for the position:</p>
                <div class="candidates-list">
                    ${candidates.length > 0 ? candidates.map(candidate => `
                        <div class="candidate-item">
                            <div class="candidate-info">
                                <strong>${candidate.name}</strong>
                                <span class="candidate-status">${candidate.status}</span>
                            </div>
                            <div class="candidate-actions">
                                <button class="btn-sm btn-outline">📄 View Resume</button>
                                <button class="btn-sm btn-primary">✅ Screen</button>
                            </div>
                        </div>
                    `).join('') : '<div class="no-candidates">No candidates yet. Add sample candidates below.</div>'}
                </div>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="this.addSampleCandidates()">
                        👥 Add Sample Candidates
                    </button>
                </div>
            </div>
        `;
    }

    renderInterviewingContent() {
        return `
            <div class="state-content">
                <h4>Interview Management</h4>
                <p>Schedule and conduct interviews with screened candidates:</p>
                <div class="interview-schedule">
                    <div class="schedule-item">
                        <strong>Next Interview:</strong> John Doe - Technical Interview
                        <span class="schedule-time">Tomorrow 2:00 PM</span>
                    </div>
                    <div class="schedule-item">
                        <strong>Pending Feedback:</strong> Jane Smith - Behavioral Interview
                        <span class="schedule-status">Awaiting feedback</span>
                    </div>
                </div>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="alert('Would open interview scheduler')">
                        📅 Schedule Interview
                    </button>
                    <button class="btn-outline" onclick="alert('Would open feedback form')">
                        📝 Submit Feedback
                    </button>
                </div>
            </div>
        `;
    }

    renderOfferSentContent() {
        return `
            <div class="state-content">
                <h4>Offer Management</h4>
                <p>Job offer has been extended to selected candidate:</p>
                <div class="offer-details">
                    <div class="offer-item">
                        <strong>Candidate:</strong> ${this.workflow.context?.selected_candidate?.name || 'John Doe'}
                    </div>
                    <div class="offer-item">
                        <strong>Offer Sent:</strong> ${this.workflow.context?.offer_sent_at ?
                            new Date(this.workflow.context.offer_sent_at).toLocaleDateString() : 'Today'}
                    </div>
                    <div class="offer-item">
                        <strong>Response Deadline:</strong> 7 days from offer date
                    </div>
                </div>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="alert('Would show offer details')">
                        📄 View Offer Details
                    </button>
                    <button class="btn-outline" onclick="alert('Would send reminder')">
                        📧 Send Reminder
                    </button>
                </div>
            </div>
        `;
    }

    renderOnboardingContent() {
        return `
            <div class="state-content">
                <h4>Onboarding Process</h4>
                <p>New hire onboarding checklist and progress:</p>
                <div class="onboarding-checklist">
                    <div class="checklist-item">
                        <input type="checkbox" ${this.workflow.context?.onboarding_checklist?.documents_collected ? 'checked' : ''}>
                        <label>Documents Collected</label>
                    </div>
                    <div class="checklist-item">
                        <input type="checkbox" ${this.workflow.context?.onboarding_checklist?.workspace_assigned ? 'checked' : ''}>
                        <label>Workspace Assigned</label>
                    </div>
                    <div class="checklist-item">
                        <input type="checkbox" ${this.workflow.context?.onboarding_checklist?.systems_access_granted ? 'checked' : ''}>
                        <label>Systems Access Granted</label>
                    </div>
                    <div class="checklist-item">
                        <input type="checkbox" ${this.workflow.context?.onboarding_checklist?.orientation_completed ? 'checked' : ''}>
                        <label>Orientation Completed</label>
                    </div>
                </div>
                <div class="sample-actions">
                    <button class="btn-outline" onclick="alert('Would update onboarding checklist')">
                        ✅ Update Checklist
                    </button>
                    <button class="btn-outline" onclick="alert('Would schedule orientation')">
                        📅 Schedule Orientation
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

        // Modal controls
        const modal = document.getElementById('action-modal');
        const closeModal = document.getElementById('close-modal');
        const cancelAction = document.getElementById('cancel-action');
        const confirmAction = document.getElementById('confirm-action');

        [closeModal, cancelAction].forEach(btn => {
            btn.addEventListener('click', () => this.hideActionModal());
        });

        confirmAction.addEventListener('click', () => this.executeAction());

        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideActionModal();
            }
        });
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
        if (action === 'submit_claim' || action === 'submit_for_approval') {
            formHTML += `
                <div class="form-group">
                    <label for="submission-notes">Submission Notes</label>
                    <textarea id="submission-notes" class="form-textarea" rows="3"
                              placeholder="Add any notes for the approver..."></textarea>
                </div>
            `;
        }

        if (action.includes('approve')) {
            formHTML += `
                <div class="form-group">
                    <label for="approval-comments">Approval Comments *</label>
                    <textarea id="approval-comments" class="form-textarea" rows="3"
                              placeholder="Provide approval comments..." required></textarea>
                </div>
            `;
        }

        if (action.includes('reject')) {
            formHTML += `
                <div class="form-group">
                    <label for="rejection-reason">Rejection Reason *</label>
                    <textarea id="rejection-reason" class="form-textarea" rows="3"
                              placeholder="Please provide a reason for rejection..." required></textarea>
                </div>
            `;
        }

        if (action === 'post_job') {
            formHTML += `
                <div class="form-group">
                    <label for="posting-url">Job Posting URL</label>
                    <input type="url" id="posting-url" class="form-input"
                           placeholder="https://careers.company.com/job/123"
                           value="https://careers.company.com/job/${Date.now()}">
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

        const submissionNotes = document.getElementById('submission-notes')?.value;
        if (submissionNotes) formData.submission_notes = submissionNotes;

        const approvalComments = document.getElementById('approval-comments')?.value;
        if (approvalComments) {
            formData.approved_by = this.user.id;
            formData.approval_comments = approvalComments;
        }

        const rejectionReason = document.getElementById('rejection-reason')?.value;
        if (rejectionReason) formData.rejection_reason = rejectionReason;

        const postingUrl = document.getElementById('posting-url')?.value;
        if (postingUrl) formData.job_posting_url = postingUrl;

        return formData;
    }

    async addSampleCandidates() {
        try {
            const sampleCandidates = [
                {
                    name: 'John Doe',
                    email: 'john.doe@email.com',
                    resume_url: 'https://example.com/resume1.pdf',
                    status: 'applied'
                },
                {
                    name: 'Jane Smith',
                    email: 'jane.smith@email.com',
                    resume_url: 'https://example.com/resume2.pdf',
                    status: 'applied'
                },
                {
                    name: 'Mike Johnson',
                    email: 'mike.johnson@email.com',
                    resume_url: 'https://example.com/resume3.pdf',
                    status: 'applied'
                }
            ];

            // Update workflow context with sample candidates
            await this.workflowService.updateWorkflowContext(
                this.workflowId,
                { candidates: sampleCandidates },
                this.user,
                this.organizationContext
            );

            await this.loadWorkflow();
            this.showSuccess('Sample candidates added successfully!');

        } catch (error) {
            console.error('Error adding sample candidates:', error);
            this.showError('Failed to add sample candidates.');
        }
    }

    // Utility methods
    formatState(state) {
        if (!state) return 'Unknown';
        return state.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
    }

    getStatusClass(state) {
        if (['completed', 'paid'].includes(state)) return 'status-completed';
        if (['rejected', 'cancelled'].includes(state)) return 'status-rejected';
        if (['pending_approval', 'submitted'].includes(state)) return 'status-pending';
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