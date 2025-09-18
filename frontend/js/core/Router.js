export class Router {
    constructor(routes, rootId = "app") {
        this.routes = routes;
        this.root = document.getElementById(rootId);

        window.addEventListener("hashchange", () => this.loadRoute());
        window.addEventListener("DOMContentLoaded", () => this.loadRoute());
    }

    loadRoute() {
        const fullPath = window.location.hash.replace("#", "") || "signin";
        const [path, ...params] = fullPath.split('/');

        const ComponentClass = this.routes[path];

        if (ComponentClass) {
            this.root.innerHTML = ""; // clear previous

            // Pass parameters to component if available
            const props = {};
            if (path === 'org-edit' && params[0]) {
                props.organizationId = params[0];
            }

            new ComponentClass(props).mount(this.root);
        } else {
            this.root.innerHTML = `<h2>404 - Page Not Found</h2>`;
        }
    }
}
