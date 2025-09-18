import { BaseForm } from "../../core/BaseForm.js";

export class ResetPassword extends BaseForm {
    render() {
        const fields = [
            {
                label: "New Password",
                type: "password",
                name: "newPassword",
                placeholder: "Enter your new password",
                required: true,
                minlength: 6
            },
            {
                label: "Confirm Password",
                type: "password",
                name: "confirmPassword",
                placeholder: "Confirm your new password",
                required: true,
                minlength: 6
            }
        ];

        const options = {
            subtitle: "Create a new secure password for your account.",
            links: [
                { href: "#signin", text: "Back to Sign In" }
            ]
        };

        return this.renderForm("Set New Password", fields, "Reset Password", options);
    }

    async handleSubmit(data) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.showMessage("Password reset successfully! You can now sign in with your new password.", "success");

        setTimeout(() => {
            window.location.hash = '#signin';
        }, 2000);
    }
}
