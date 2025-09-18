import { Component } from "./Component.js";

export class BaseForm extends Component {
    constructor(props) {
        super(props);
        this.isLoading = false;
        this.errors = {};
    }

    renderForm(title, fields, buttonText, options = {}) {
        const formWrapper = this.createElement("div", "form-wrapper");
        formWrapper.innerHTML = `
            <div class="form-container">
                <div class="form-header">
                    <h2 class="form-title">${title}</h2>
                    ${options.subtitle ? `<p class="form-subtitle">${options.subtitle}</p>` : ''}
                </div>

                <form class="user-form" novalidate>
                    ${fields.map(field => this.renderField(field)).join('')}

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <span class="btn-text">${buttonText}</span>
                            <div class="btn-loader">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </div>

                    <div class="form-message" id="form-message"></div>
                </form>

                ${options.links ? this.renderLinks(options.links) : ''}
            </div>
        `;

        this.addFormEventListeners(formWrapper);
        return formWrapper;
    }

    renderField(field) {
        const isRequired = field.required !== false;
        const placeholder = field.placeholder || field.label;

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
            password: '🔒',
            text: '👤',
            tel: '📞',
            url: '🌐'
        };
        return icons[type] || '✏️';
    }

    renderLinks(links) {
        return `
            <div class="form-links">
                ${links.map(link => `
                    <a href="${link.href}" class="form-link">${link.text}</a>
                `).join('')}
            </div>
        `;
    }

    addFormEventListeners(formWrapper) {
        const form = formWrapper.querySelector('.user-form');
        const submitBtn = form.querySelector('.btn-primary');
        const inputs = form.querySelectorAll('.form-input');

        // Real-time validation
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (this.isLoading) return;

            const isValid = this.validateForm(form);
            if (!isValid) return;

            this.setLoading(true, submitBtn);

            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                await this.handleSubmit(data);

                this.showMessage('Success! Action completed.', 'success');
            } catch (error) {
                this.showMessage(error.message || 'An error occurred. Please try again.', 'error');
            } finally {
                this.setLoading(false, submitBtn);
            }
        });
    }

    validateField(input) {
        const value = input.value.trim();
        const name = input.name;
        const type = input.type;
        let error = '';

        // Required validation
        if (input.required && !value) {
            error = `${this.getFieldLabel(name)} is required.`;
        }
        // Email validation
        else if (type === 'email' && value && !this.isValidEmail(value)) {
            error = 'Please enter a valid email address.';
        }
        // Password validation
        else if (type === 'password' && value && value.length < 6) {
            error = 'Password must be at least 6 characters long.';
        }
        // Pattern validation
        else if (input.pattern && value && !new RegExp(input.pattern).test(value)) {
            error = 'Please enter a valid format.';
        }

        this.setFieldError(input, error);
        return !error;
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('.form-input');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Special validation for password confirmation
        const password = form.querySelector('input[name="password"]');
        const confirmPassword = form.querySelector('input[name="confirmPassword"]');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            this.setFieldError(confirmPassword, 'Passwords do not match.');
            isValid = false;
        }

        return isValid;
    }

    setFieldError(input, error) {
        const errorElement = document.getElementById(`${input.name}-error`);
        const inputWrapper = input.closest('.input-wrapper');

        if (error) {
            errorElement.textContent = error;
            errorElement.classList.add('show');
            inputWrapper.classList.add('error');
        } else {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            inputWrapper.classList.remove('error');
        }
    }

    clearFieldError(input) {
        const errorElement = document.getElementById(`${input.name}-error`);
        const inputWrapper = input.closest('.input-wrapper');

        if (errorElement.classList.contains('show')) {
            errorElement.classList.remove('show');
            inputWrapper.classList.remove('error');
        }
    }

    setLoading(loading, button) {
        this.isLoading = loading;
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        if (loading) {
            button.classList.add('loading');
            btnText.style.opacity = '0';
            btnLoader.style.opacity = '1';
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            btnText.style.opacity = '1';
            btnLoader.style.opacity = '0';
            button.disabled = false;
        }
    }

    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('form-message');
        messageElement.textContent = message;
        messageElement.className = `form-message show ${type}`;

        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 5000);
        }
    }

    getFieldLabel(name) {
        const labels = {
            username: 'Username',
            password: 'Password',
            email: 'Email',
            confirmPassword: 'Confirm Password',
            newPassword: 'New Password',
            oldPassword: 'Old Password'
        };
        return labels[name] || name;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Override this method in child classes
    async handleSubmit(data) {
        console.log('Form submitted with data:', data);
    }
}