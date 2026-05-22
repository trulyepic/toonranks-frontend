import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PasswordField from "./PasswordField";

describe("PasswordField", () => {
  it("toggles password visibility without changing the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PasswordField
        value="secret-pass"
        onChange={onChange}
        placeholder="Password"
        className="input"
      />
    );

    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("secret-pass");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });
});
