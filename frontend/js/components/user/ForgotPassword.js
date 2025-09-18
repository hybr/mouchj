import { BaseForm } from "../../core/BaseForm.js";

export class ForgotPassword extends BaseForm {
    render() {
        const fields = [
            {
                label: "Email Address",
                type: "email",
                name: "email",
                placeholder: "Enter your registered email address",
                required: true
            }
        ];

        const options = {
            subtitle: "Enter your email address and we'll send you a link to reset your password.",
            links: [
                { href: "#signin", text: "Remember your password? Sign in" },
                { href: "#signup", text: "Need an account? Sign up" }
            ]
        };

        return this.renderForm("Reset Password", fields, "Send Reset Link", options);
    }

    async handleSubmit(data) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.showMessage("If an account with that email exists, we've sent you a password reset link.", "success");
    }
}
