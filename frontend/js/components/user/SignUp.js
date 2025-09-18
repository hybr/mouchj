import { BaseForm } from "../../core/BaseForm.js";

export class SignUp extends BaseForm {
    render() {
        const fields = [
            {
                label: "Username",
                type: "text",
                name: "username",
                placeholder: "Choose a unique username",
                required: true,
                minlength: 3,
                maxlength: 20,
                pattern: "^[a-zA-Z0-9_-]+$"
            },
            {
                label: "Email",
                type: "email",
                name: "email",
                placeholder: "Enter your email address",
                required: true
            },
            {
                label: "Password",
                type: "password",
                name: "password",
                placeholder: "Create a strong password",
                required: true,
                minlength: 6
            },
            {
                label: "Confirm Password",
                type: "password",
                name: "confirmPassword",
                placeholder: "Confirm your password",
                required: true,
                minlength: 6
            }
        ];

        const options = {
            subtitle: "Create your account to get started with our platform.",
            links: [
                { href: "#signin", text: "Already have an account? Sign in" }
            ]
        };

        return this.renderForm("Create Account", fields, "Sign Up", options);
    }

    async handleSubmit(data) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock registration logic
        if (data.username.length < 3) {
            throw new Error("Username must be at least 3 characters long.");
        }

        // Simulate username check
        const existingUsers = ["admin", "user", "test"];
        if (existingUsers.includes(data.username.toLowerCase())) {
            throw new Error("This username is already taken. Please choose another one.");
        }

        this.showMessage("Account created successfully! Please check your email to verify your account.", "success");

        setTimeout(() => {
            // In a real app, redirect to verification page or login
            console.log("Redirecting to email verification");
        }, 2000);
    }
}
