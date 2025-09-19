import { HomePage } from "./components/HomePage.js";
import { Header } from "./components/Header.js";
import { Router } from "./core/Router.js";
import { Component } from "./core/Component.js";
import { SignIn } from "./components/user/SignIn.js";
import { SignUp } from "./components/user/SignUp.js";
import { ForgotPassword } from "./components/user/ForgotPassword.js";
import { ResetPassword } from "./components/user/ResetPassword.js";
import { ChangePassword } from "./components/user/ChangePassword.js";
import { Profile } from "./components/user/Profile.js";
import { OrganizationList } from "./components/organization/OrganizationList.js";
import { OrganizationForm } from "./components/organization/OrganizationForm.js";
import { OrganizationDetails } from "./components/organization/OrganizationDetails.js";
import { BranchManagement } from "./components/workflow/BranchManagement.js";
import { BranchWorkflowExample } from "./components/workflow/examples/BranchWorkflowExample.js";
import { authManager } from "./core/AuthManager.js";

// Create a component that shows either login or profile based on auth state
class MyPage extends Component {
    constructor(props) {
        super(props);
        this.isAuthenticated = authManager.isLoggedIn();
        this.currentUser = authManager.getCurrentUser();
    }

    render() {
        if (this.isAuthenticated) {
            // Show profile
            return new Profile(this.currentUser).render();
        } else {
            // Show login form
            return new SignIn().render();
        }
    }
}

// Create organization form component
class CreateOrganization extends Component {
    render() {
        return new OrganizationForm({ mode: 'create' }).render();
    }
}

// Edit organization component
class EditOrganization extends Component {
    constructor(props) {
        super(props);
        this.organizationId = props?.organizationId;
    }

    render() {
        if (!this.organizationId) {
            return this.createElement('div', 'error-message', 'Organization ID not provided');
        }
        return new OrganizationForm({
            mode: 'edit',
            organizationId: this.organizationId
        }).render();
    }
}

// Mount header
new Header().mount(document.getElementById("header"));

// Define routes
const routes = {
    my: MyPage,
    signin: SignIn,
    signup: SignUp,
    forgot: ForgotPassword,
    reset: ResetPassword,
    changepw: ChangePassword,
    profile: Profile,
    organizations: OrganizationList,
    'org-create': CreateOrganization,
    'org-edit': EditOrganization,
    'organization-details': OrganizationDetails,
    'branch-management': BranchManagement,
    'branch-workflow-example': BranchWorkflowExample,
};

// Init router
new Router(routes);

document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    new HomePage().mount(root);
});
