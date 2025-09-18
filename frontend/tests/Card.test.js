import { Card } from "../js/components/Card.js";

describe("Card Component", () => {
  test("renders with given props", () => {
    const props = { title: "Test Card", content: "This is a test" };
    const card = new Card(props);
    const el = card.render();

    expect(el.querySelector("h3").textContent).toBe("Test Card");
    expect(el.querySelector("p").textContent).toBe("This is a test");
  });
});
