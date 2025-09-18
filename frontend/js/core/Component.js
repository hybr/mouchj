export class Component {
    constructor(props = {}) {
        this.props = props;
        this.element = null;
    }

    createElement(tag, className = "", content = "") {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content) el.innerHTML = content;
        return el;
    }

    render() {
        throw new Error("Render method must be implemented in child component");
    }

    mount(parent) {
        this.element = this.render();
        parent.appendChild(this.element);
    }
}
