import { BaseForm } from "../../core/BaseForm.js";
import { authManager } from "../../core/AuthManager.js";

export class SignIn extends BaseForm {
    render() {
        const fields = [
            {
                label: "Username or Email",
                type: "text",
                name: "username",
                placeholder: "Enter your username or email",
                required: true
            },
            {
                label: "Password",
                type: "password",
                name: "password",
                placeholder: "Enter your password",
                required: true,
                minlength: 6
            }
        ];

        const options = {
            subtitle: "Welcome back! Please sign in to your account.",
            links: [
                { href: "#forgot", text: "Forgot your password?" },
                { href: "#signup", text: "Don't have an account? Sign up" }
            ]
        };

        return this.renderForm("Sign In", fields, "Sign In", options);
    }

    async handleSubmit(data) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock authentication logic
        if (data.username === "admin" && data.password === "password") {
            // Create user object
            const userData = {
                username: "admin",
                email: "admin@example.com",
                firstName: "Admin",
                lastName: "User",
                joinedDate: "2024-01-15",
                lastLogin: new Date().toISOString()
            };

            // Login through auth manager
            await authManager.login(userData);

            this.showMessage("Welcome back! Redirecting to profile...", "success");

            setTimeout(() => {
                window.location.hash = '#profile';
            }, 1000);
        } else {
            throw new Error("Invalid username or password. Please try again.");
        }
    }
}
