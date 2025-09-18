import { Component } from "../js/core/Component.js";

describe("Component Base Class", () => {
  test("createElement should return a DOM element with class and content", () => {
    const comp = new Component();
    const el = comp.createElement("div", "test-class", "Hello");
    
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.className).toBe("test-class");
    expect(el.innerHTML).toBe("Hello");
  });

  test("render should throw error if not implemented", () => {
    const comp = new Component();
    expect(() => comp.render()).toThrow("Render method must be implemented");
  });
});
