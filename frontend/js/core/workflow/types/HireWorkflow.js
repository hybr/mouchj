import { BaseWorkflow } from '../BaseWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Hire Workflow Implementation
 * Manages the complete hiring process from job posting to onboarding
 */
export class HireWorkflow extends BaseWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'HireWorkflow' });
        this.initialize();
    }

    /**
     * Get initial state for hire workflow
     */
    getInitialState() {
        return 'draft';
    }

    /**
     * Define all states for hire workflow
     */
    defineStates() {
        // Draft State - Job requisition creation
        this.addState('draft', new StateNode('draft', {
            transitions: [
                { target: 'pending_approval', action: 'submit_for_approval', label: 'Submit for Approval' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Requisition' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            validations: [
                (context) => context.jobTitle ? true : 'Job title is required',
                (context) => context.department ? true : 'Department is required',
                (context) => context.position_count > 0 ? true : 'Position count must be greater than 0'
            ],
            onEnter: async (context, user, orgContext) => {
                console.log(`Job requisition created by ${user.username}`);
            }
        }));

        // Pending Approval State - Manager/HR approval
        this.addState('pending_approval', new StateNode('pending_approval', {
            transitions: [
                {
                    target: 'approved',
                    action: 'approve',
                    label: 'Approve Requisition',
                    guards: [(context) => context.approved_by && context.approval_comments]
                },
                {
                    target: 'rejected',
                    action: 'reject',
                    label: 'Reject Requisition',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'draft', action: 'return_to_draft', label: 'Return to Draft' }
            ],
            requiredActors: [WorkflowActors.APPROVER, WorkflowActors.HR_SPECIALIST],
            permissionConditions: {
                department: (context) => context.department || null,
                customCondition: (user, orgContext, workflowContext) => {
                    // Manager can approve for their department
                    return orgContext.positions.some(pos =>
                        pos.designation.name.toLowerCase().includes('manager') &&
                        pos.group?.department?.name === workflowContext.department
                    );
                }
            },
            onEnter: async (context, user, orgContext) => {
                // Send notification to approvers
                console.log(`Job requisition pending approval for ${context.jobTitle}`);
            }
        }));

        // Approved State - Ready for posting
        this.addState('approved', new StateNode('approved', {
            transitions: [
                { target: 'posted', action: 'post_job', label: 'Post Job' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST],
            onEnter: async (context, user, orgContext) => {
                context.approved_at = new Date();
                console.log(`Job requisition approved for ${context.jobTitle}`);
            }
        }));

        // Posted State - Job is live and accepting applications
        this.addState('posted', new StateNode('posted', {
            transitions: [
                { target: 'screening', action: 'start_screening', label: 'Start Screening' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Posting' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST],
            validations: [
                (context) => context.job_posting_url ? true : 'Job posting URL is required'
            ],
            onEnter: async (context, user, orgContext) => {
                context.posted_at = new Date();
                console.log(`Job posted: ${context.job_posting_url}`);
            }
        }));

        // Screening State - Initial candidate screening
        this.addState('screening', new StateNode('screening', {
            transitions: [
                {
                    target: 'interviewing',
                    action: 'start_interviews',
                    label: 'Start Interviews',
                    guards: [(context) => context.screened_candidates && context.screened_candidates.length > 0]
                },
                { target: 'posted', action: 'reopen_posting', label: 'Reopen Posting' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST, WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                if (!context.screened_candidates) {
                    context.screened_candidates = [];
                }
                console.log(`Screening started for ${context.jobTitle}`);
            }
        }));

        // Interviewing State - Candidate interviews
        this.addState('interviewing', new StateNode('interviewing', {
            transitions: [
                {
                    target: 'selecting',
                    action: 'complete_interviews',
                    label: 'Complete Interviews',
                    guards: [(context) => context.interview_results && context.interview_results.length > 0]
                },
                { target: 'screening', action: 'return_to_screening', label: 'Return to Screening' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel' }
            ],
            requiredActors: [WorkflowActors.ANALYZER, WorkflowActors.APPROVER],
            permissionConditions: {
                department: (context) => context.department
            },
            onEnter: async (context, user, orgContext) => {
                if (!context.interview_results) {
                    context.interview_results = [];
                }
                console.log(`Interviews started for ${context.jobTitle}`);
            }
        }));

        // Selecting State - Final candidate selection
        this.addState('selecting', new StateNode('selecting', {
            transitions: [
                {
                    target: 'offer_preparation',
                    action: 'select_candidate',
                    label: 'Select Candidate',
                    guards: [(context) => context.selected_candidate]
                },
                { target: 'interviewing', action: 'continue_interviews', label: 'Continue Interviews' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel' }
            ],
            requiredActors: [WorkflowActors.APPROVER],
            permissionConditions: {
                department: (context) => context.department,
                designation: ['Manager', 'Director', 'Head']
            },
            onEnter: async (context, user, orgContext) => {
                console.log(`Candidate selection phase for ${context.jobTitle}`);
            }
        }));

        // Offer Preparation State - Preparing job offer
        this.addState('offer_preparation', new StateNode('offer_preparation', {
            transitions: [
                {
                    target: 'offer_sent',
                    action: 'send_offer',
                    label: 'Send Offer',
                    guards: [(context) => context.offer_details && context.offer_details.salary]
                },
                { target: 'selecting', action: 'revise_selection', label: 'Revise Selection' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST, WorkflowActors.APPROVER],
            validations: [
                (context) => context.offer_details?.salary ? true : 'Salary must be specified',
                (context) => context.offer_details?.start_date ? true : 'Start date must be specified'
            ],
            onEnter: async (context, user, orgContext) => {
                console.log(`Preparing offer for ${context.selected_candidate?.name}`);
            }
        }));

        // Offer Sent State - Waiting for candidate response
        this.addState('offer_sent', new StateNode('offer_sent', {
            transitions: [
                { target: 'offer_accepted', action: 'accept_offer', label: 'Offer Accepted' },
                { target: 'offer_rejected', action: 'reject_offer', label: 'Offer Rejected' },
                { target: 'offer_preparation', action: 'revise_offer', label: 'Revise Offer' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST],
            timeoutDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
            onEnter: async (context, user, orgContext) => {
                context.offer_sent_at = new Date();
                console.log(`Offer sent to ${context.selected_candidate?.name}`);
            }
        }));

        // Offer Accepted State - Preparing for onboarding
        this.addState('offer_accepted', new StateNode('offer_accepted', {
            transitions: [
                { target: 'onboarding', action: 'start_onboarding', label: 'Start Onboarding' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST],
            onEnter: async (context, user, orgContext) => {
                context.offer_accepted_at = new Date();
                console.log(`Offer accepted by ${context.selected_candidate?.name}`);
            }
        }));

        // Onboarding State - New hire onboarding process
        this.addState('onboarding', new StateNode('onboarding', {
            transitions: [
                { target: 'completed', action: 'complete_onboarding', label: 'Complete Onboarding' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST],
            validations: [
                (context) => context.onboarding_checklist?.completed ? true : 'Onboarding checklist must be completed'
            ],
            onEnter: async (context, user, orgContext) => {
                if (!context.onboarding_checklist) {
                    context.onboarding_checklist = {
                        documents_collected: false,
                        workspace_assigned: false,
                        systems_access_granted: false,
                        orientation_completed: false,
                        completed: false
                    };
                }
                console.log(`Onboarding started for ${context.selected_candidate?.name}`);
            }
        }));

        // Completed State - Hire process completed
        this.addState('completed', new StateNode('completed', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.completed_at = new Date();
                console.log(`Hire process completed for ${context.jobTitle}`);
            }
        }));

        // Rejected State - Requisition rejected
        this.addState('rejected', new StateNode('rejected', {
            transitions: [
                { target: 'draft', action: 'revise_and_resubmit', label: 'Revise and Resubmit' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rejected_at = new Date();
                console.log(`Job requisition rejected: ${context.rejection_reason}`);
            }
        }));

        // Offer Rejected State - Candidate rejected offer
        this.addState('offer_rejected', new StateNode('offer_rejected', {
            transitions: [
                { target: 'selecting', action: 'select_alternate', label: 'Select Alternate Candidate' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Requisition' }
            ],
            requiredActors: [WorkflowActors.HR_SPECIALIST, WorkflowActors.APPROVER],
            onEnter: async (context, user, orgContext) => {
                context.offer_rejected_at = new Date();
                console.log(`Offer rejected by ${context.selected_candidate?.name}`);
            }
        }));

        // Cancelled State - Process cancelled
        this.addState('cancelled', new StateNode('cancelled', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.cancelled_at = new Date();
                console.log(`Hire process cancelled for ${context.jobTitle}`);
            }
        }));
    }

    /**
     * Add candidate to screening list
     */
    addCandidate(candidateData, user, orgContext) {
        if (!this.context.candidates) {
            this.context.candidates = [];
        }

        const candidate = {
            id: candidateData.id || Date.now().toString(),
            name: candidateData.name,
            email: candidateData.email,
            resume_url: candidateData.resume_url,
            application_date: new Date(),
            status: 'applied',
            screening_notes: '',
            interview_results: [],
            added_by: user.id
        };

        this.context.candidates.push(candidate);
        this.updateContext({ candidates: this.context.candidates }, user);

        return candidate;
    }

    /**
     * Update candidate status
     */
    updateCandidateStatus(candidateId, status, notes, user) {
        if (!this.context.candidates) return false;

        const candidate = this.context.candidates.find(c => c.id === candidateId);
        if (!candidate) return false;

        candidate.status = status;
        candidate.notes = notes;
        candidate.updated_by = user.id;
        candidate.updated_at = new Date();

        this.updateContext({ candidates: this.context.candidates }, user);
        return true;
    }

    /**
     * Add interview result
     */
    addInterviewResult(candidateId, interviewData, user) {
        if (!this.context.candidates) return false;

        const candidate = this.context.candidates.find(c => c.id === candidateId);
        if (!candidate) return false;

        const interview = {
            id: Date.now().toString(),
            interviewer: user.id,
            date: interviewData.date || new Date(),
            type: interviewData.type, // 'phone', 'video', 'in_person'
            score: interviewData.score,
            notes: interviewData.notes,
            recommendation: interviewData.recommendation
        };

        if (!candidate.interview_results) {
            candidate.interview_results = [];
        }
        candidate.interview_results.push(interview);

        this.updateContext({ candidates: this.context.candidates }, user);
        return interview;
    }

    /**
     * Get workflow metrics
     */
    getMetrics() {
        const metrics = {
            time_to_hire: null,
            total_candidates: this.context.candidates?.length || 0,
            screened_candidates: this.context.screened_candidates?.length || 0,
            interviewed_candidates: this.context.candidates?.filter(c =>
                c.interview_results && c.interview_results.length > 0
            ).length || 0,
            current_stage_duration: this.getTimeInCurrentState()
        };

        // Calculate time to hire if completed
        if (this.currentState === 'completed' && this.context.completed_at) {
            metrics.time_to_hire = this.context.completed_at - this.createdAt;
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
            timeline: this.history.map(entry => ({
                stage: entry.toState,
                date: entry.timestamp,
                user: entry.user.name,
                duration: entry.duration
            }))
        };
    }
}