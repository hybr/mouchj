import { BaseForm } from "../../core/BaseForm.js";
import { organizationService } from "../../core/OrganizationService.js";
import { authManager } from "../../core/AuthManager.js";

export class OrganizationForm extends BaseForm {
    constructor(props) {
        super(props);
        this.mode = props?.mode || 'create'; // 'create' or 'edit'
        this.organizationId = props?.organizationId || null;
        this.organization = null;

        if (this.mode === 'edit' && this.organizationId) {
            this.organization = organizationService.getOrganizationById(this.organizationId);
        }
    }

    render() {
        const title = this.mode === 'create' ? 'Create Organization' : 'Edit Organization';
        const buttonText = this.mode === 'create' ? 'Create Organization' : 'Update Organization';
        const subtitle = this.mode === 'create'
            ? 'Set up a new organization to manage your business operations.'
            : 'Update your organization details and settings.';

        const fields = [
            {
                label: "Organization Name",
                type: "text",
                name: "name",
                placeholder: "Enter organization name",
                required: true,
                value: this.organization?.name || ''
            },
            {
                label: "Legal Name",
                type: "text",
                name: "legal_name",
                placeholder: "Enter legal business name",
                required: false,
                value: this.organization?.legal_name || ''
            },
            {
                label: "Tagline",
                type: "text",
                name: "tag_line",
                placeholder: "Enter a brief tagline or slogan",
                required: false,
                maxlength: 100,
                value: this.organization?.tag_line || ''
            },
            {
                label: "Description",
                type: "textarea",
                name: "description",
                placeholder: "Describe your organization",
                required: false,
                value: this.organization?.description || ''
            },
            {
                label: "Subdomain",
                type: "text",
                name: "sub_domain_to_v4l_app",
                placeholder: "mycompany (will be mycompany.app.com)",
                required: false,
                pattern: "^[a-z0-9-]+$",
                value: this.organization?.sub_domain_to_v4l_app || ''
            },
            {
                label: "Website",
                type: "url",
                name: "website",
                placeholder: "https://example.com",
                required: false,
                value: this.organization?.website || ''
            },
            {
                label: "Industry",
                type: "select",
                name: "industry",
                options: organizationService.getIndustryOptions(),
                required: false,
                value: this.organization?.industry || ''
            },
            {
                label: "Primary Phone",
                type: "tel",
                name: "primary_phone_number",
                placeholder: "+1-555-0123",
                required: false,
                value: this.organization?.primary_phone_number || ''
            },
            {
                label: "Primary Email",
                type: "email",
                name: "primary_email_address",
                placeholder: "contact@organization.com",
                required: false,
                value: this.organization?.primary_email_address || ''
            },
            {
                label: "Fiscal Year Start",
                type: "select",
                name: "fiscal_year_start_month",
                options: organizationService.getFiscalMonthOptions(),
                required: false,
                value: this.organization?.fiscal_year_start_month || 1
            },
            {
                label: "Primary Currency",
                type: "select",
                name: "primary_currency_code",
                options: organizationService.getCurrencyOptions(),
                required: false,
                value: this.organization?.primary_currency_code || 'USD'
            },
            {
                label: "Main Timezone",
                type: "select",
                name: "main_time_zone",
                options: organizationService.getTimezoneOptions(),
                required: false,
                value: this.organization?.main_time_zone || 'America/New_York'
            },
            {
                label: "Main Locale",
                type: "text",
                name: "main_locale",
                placeholder: "en-US",
                required: false,
                value: this.organization?.main_locale || 'en-US'
            }
        ];

        const options = {
            subtitle,
            links: [
                { href: "#organizations", text: "← Back to Organizations" }
            ]
        };

        return this.renderForm(title, fields, buttonText, options);
    }

    renderField(field) {
        const isRequired = field.required !== false;
        const placeholder = field.placeholder || field.label;
        const value = field.value || '';

        if (field.type === 'textarea') {
            return `
                <div class="form-group">
                    <label for="${field.name}" class="form-label">
                        ${field.label}
                        ${isRequired ? '<span class="required">*</span>' : ''}
                    </label>
                    <div class="input-wrapper">
                        <textarea
                            id="${field.name}"
                            name="${field.name}"
                            class="form-input form-textarea"
                            placeholder="${placeholder}"
                            ${isRequired ? 'required' : ''}
                            ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}
                            rows="3"
                        >${value}</textarea>
                        <div class="input-icon">
                            📝
                        </div>
                    </div>
                    <div class="field-error" id="${field.name}-error"></div>
                </div>
            `;
        }

        if (field.type === 'select') {
            let optionsHtml = '';
            if (Array.isArray(field.options)) {
                if (typeof field.options[0] === 'string') {
                    // Simple string array
                    optionsHtml = field.options.map(option =>
                        `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
                    ).join('');
                } else if (field.options[0]?.value !== undefined) {
                    // Array of objects with value/label
                    optionsHtml = field.options.map(option =>
                        `<option value="${option.value}" ${value == option.value ? 'selected' : ''}>${option.label}</option>`
                    ).join('');
                } else if (field.options[0]?.code !== undefined) {
                    // Array of objects with code/name
                    optionsHtml = field.options.map(option =>
                        `<option value="${option.code}" ${value === option.code ? 'selected' : ''}>${option.name}</option>`
                    ).join('');
                }
            }

            return `
                <div class="form-group">
                    <label for="${field.name}" class="form-label">
                        ${field.label}
                        ${isRequired ? '<span class="required">*</span>' : ''}
                    </label>
                    <div class="input-wrapper">
                        <select
                            id="${field.name}"
                            name="${field.name}"
                            class="form-input form-select"
                            ${isRequired ? 'required' : ''}
                        >
                            <option value="">Select ${field.label}</option>
                            ${optionsHtml}
                        </select>
                        <div class="input-icon">
                            ${this.getFieldIcon(field.type)}
                        </div>
                    </div>
                    <div class="field-error" id="${field.name}-error"></div>
                </div>
            `;
        }

        // Default input field
        return `
            <div class="form-group">
                <label for="${field.name}" class="form-label">
                    ${field.label}
                    ${isRequired ? '<span class="required">*</span>' : ''}
                </label>
                <div class="input-wrapper">
                    <input
                        type="${field.type}"
                        id="${field.name}"
                        name="${field.name}"
                        class="form-input"
                        placeholder="${placeholder}"
                        value="${value}"
                        ${isRequired ? 'required' : ''}
                        ${field.minlength ? `minlength="${field.minlength}"` : ''}
                        ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}
                        ${field.pattern ? `pattern="${field.pattern}"` : ''}
                    />
                    <div class="input-icon">
                        ${this.getFieldIcon(field.type)}
                    </div>
                </div>
                <div class="field-error" id="${field.name}-error"></div>
            </div>
        `;
    }

    getFieldIcon(type) {
        const icons = {
            email: '📧',
            url: '🌐',
            tel: '📞',
            text: '🏢',
            select: '📋',
            textarea: '📝'
        };
        return icons[type] || '✏️';
    }

    validateField(input) {
        const value = input.value.trim();
        const name = input.name;
        const type = input.type;
        let error = '';

        // Call parent validation first
        const parentValid = super.validateField(input);

        // Add custom validation for organization-specific fields
        if (name === 'sub_domain_to_v4l_app' && value) {
            const pattern = /^[a-z0-9-]+$/;
            if (!pattern.test(value)) {
                error = 'Subdomain can only contain lowercase letters, numbers, and hyphens.';
            } else if (value.length < 3) {
                error = 'Subdomain must be at least 3 characters long.';
            } else if (value.startsWith('-') || value.endsWith('-')) {
                error = 'Subdomain cannot start or end with a hyphen.';
            }
        }

        if (name === 'primary_phone_number' && value) {
            const phonePattern = /^[+]?[\d\s\-\(\)]+$/;
            if (!phonePattern.test(value)) {
                error = 'Please enter a valid phone number.';
            }
        }

        if (error) {
            this.setFieldError(input, error);
            return false;
        }

        return parentValid;
    }

    async handleSubmit(data) {
        try {
            // Add owner_id from current user
            data.owner_id = authManager.getCurrentUser()?.username;

            if (!data.owner_id) {
                throw new Error('User must be logged in to create/edit organizations');
            }

            // Convert numeric fields
            if (data.fiscal_year_start_month) {
                data.fiscal_year_start_month = parseInt(data.fiscal_year_start_month);
            }

            let result;
            if (this.mode === 'create') {
                result = await organizationService.createOrganization(data);
                this.showMessage('Organization created successfully!', 'success');

                setTimeout(() => {
                    window.location.hash = '#organizations';
                }, 1500);
            } else {
                result = await organizationService.updateOrganization(this.organizationId, data);
                this.showMessage('Organization updated successfully!', 'success');

                setTimeout(() => {
                    window.location.hash = '#organizations';
                }, 1500);
            }

        } catch (error) {
            throw new Error(error.message);
        }
    }
}