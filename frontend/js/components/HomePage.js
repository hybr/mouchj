import { Component } from "../core/Component.js";
import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { Card } from "./Card.js";

export class HomePage extends Component {
    render() {
        const container = this.createElement("div", "home-page");

        // Header
        new Header().mount(container);

        // Cards section
        const main = this.createElement("main", "cards-container");
        const cards = [
            { title: "Fast", content: "Component-based structure with pure JS" },
            { title: "OOP", content: "Each UI unit is a class" },
            { title: "SQLite", content: "Lightweight DB to start with" }
        ];

        cards.forEach(c => {
            new Card(c).mount(main);
        });

        container.appendChild(main);

        // Footer
        new Footer().mount(container);

        return container;
    }
}
