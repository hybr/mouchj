export class Router {
    constructor(routes, rootId = "app") {
        this.routes = routes;
        this.root = document.getElementById(rootId);

        window.addEventListener("hashchange", () => this.loadRoute());
        window.addEventListener("DOMContentLoaded", () => this.loadRoute());
    }

    loadRoute() {
        const path = window.location.hash.replace("#", "") || "signin";
        const ComponentClass = this.routes[path];

        if (ComponentClass) {
            this.root.innerHTML = ""; // clear previous
            new ComponentClass().mount(this.root);
        } else {
            this.root.innerHTML = `<h2>404 - Page Not Found</h2>`;
        }
    }
}
