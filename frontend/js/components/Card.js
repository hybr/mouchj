import { Component } from "../core/Component.js";

export class Card extends Component {
    render() {
        const card = this.createElement("div", "card");
        card.innerHTML = `
            <h3>${this.props.title}</h3>
            <p>${this.props.content}</p>
        `;
        return card;
    }
}
