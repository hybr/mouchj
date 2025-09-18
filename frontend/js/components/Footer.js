import { Component } from "../core/Component.js";

export class Footer extends Component {
    render() {
        const footer = this.createElement("footer", "footer", "© 2025 My Website");
        return footer;
    }
}
