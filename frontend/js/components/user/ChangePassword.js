import { BaseForm } from "../../core/BaseForm.js";

export class ChangePassword extends BaseForm {
    render() {
        const fields = [
            {
                label: "Current Password",
                type: "password",
                name: "oldPassword",
                placeholder: "Enter your current password",
                required: true,
                minlength: 6
            },
            {
                label: "New Password",
                type: "password",
                name: "newPassword",
                placeholder: "Enter your new password",
                required: true,
                minlength: 6
            },
            {
                label: "Confirm New Password",
                type: "password",
                name: "confirmPassword",
                placeholder: "Confirm your new password",
                required: true,
                minlength: 6
            }
        ];

        const options = {
            subtitle: "Please enter your current password and choose a new secure password.",
            links: [
                { href: "#profile", text: "Back to Profile" }
            ]
        };

        return this.renderForm("Change Password", fields, "Update Password", options);
    }

    async handleSubmit(data) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock validation
        if (data.oldPassword === "wrongpassword") {
            throw new Error("Current password is incorrect.");
        }

        this.showMessage("Password changed successfully! Please sign in with your new password.", "success");

        setTimeout(() => {
            window.location.hash = '#signin';
        }, 2000);
    }
}
