// Regression test for the Base UI runtime error thrown when Button is
// rendered as a native <button> while `nativeButton={false}` was hard-coded.
//
// Root cause was: components/ui/button.tsx always passed
// nativeButton={false} to @base-ui/react/button. On the client, Base UI's
// useButton hook runs a useEffect that calls `error(...)` if the rendered
// element is a <button> while nativeButton is false:
//
//   "A component that acts as a button expected a non-<button> because
//    the `nativeButton` prop is false. Rendering a <button> keeps native
//    behavior while Base UI applies non-native attributes and handlers,
//    which can add unintended extra attributes (such as `role` or
//    `aria-disabled`). Use a non-<button> in the `render` prop, or set
//    `nativeButton` to `true`."
//
// This error was the runtime error seen when opening /dashboard (Sign-out
// submit button) and /dashboard/workspaces/<id>/inbox (action buttons).
//
// The fix: when no `render` prop is provided, pass nativeButton=true
// (the Base UI default for native buttons). When `render` IS provided,
// keep nativeButton=false so Base UI doesn't warn about non-button
// render elements.
//
// Strategy: we mock @base-ui/react/button to a capturing-component which
// records its props. This lets us assert exactly what `nativeButton`
// value our wrapper forwards to Base UI — i.e. the dispatch logic —
// without having to recreate Base UI's SSR behavior or spin up a
// happy-dom harness for a client-side useEffect.

import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock @base-ui/react/button to record every prop our wrapper forwards.
const captured: Array<Record<string, unknown>> = [];
vi.mock("@base-ui/react/button", () => {
  const Passthrough = (props: Record<string, unknown>) => {
    captured.push({ ...props });
    // Render a literal <button> (or a passthrough element for the
    // render-prop case) so the React tree stays valid and we can
    // additionally inspect the rendered output if desired.
    return createElement("button", null, "stub");
  };
  return { Button: Passthrough };
});

// Import after the mock so the wrapper uses the capturing primitive.
import { Button } from "@/components/ui/button";

describe("ui/Button — nativeButton dispatch", () => {
  it("forwards nativeButton=true when no render prop is provided", () => {
    captured.length = 0;
    renderToStaticMarkup(
      createElement(Button, { type: "submit" }, "Sign out"),
    );
    expect(captured.length).toBe(1);
    expect(captured[0].nativeButton).toBe(true);
    expect(captured[0].render).toBeUndefined();
  });

  it("forwards nativeButton=false when a render prop is provided", () => {
    captured.length = 0;
    renderToStaticMarkup(
      createElement(
        Button,
        { render: <a href="/x">Go</a> },
        "ignored-children",
      ),
    );
    expect(captured.length).toBe(1);
    expect(captured[0].nativeButton).toBe(false);
    // The render-prop element must be forwarded unchanged.
    expect((captured[0].render as { type: string }).type).toBe("a");
  });

  it("preserves an explicit nativeButton override when consumer passes both render and nativeButton", () => {
    captured.length = 0;
    renderToStaticMarkup(
      createElement(
        Button,
        { nativeButton: true, render: <span>x</span> },
        "ignored",
      ),
    );
    // The wrapper's default dispatch would forward nativeButton=false
    // here because a render prop is present. The consumer's explicit
    // nativeButton=true must still win (the wrapper is a default,
    // not a forced override). We rely on React's prop-spread order:
    // `nativeButton={isNative}` is set first, `{...props}` after, so
    // a consumer-supplied nativeButton in props takes precedence.
    expect(captured[0].nativeButton).toBe(true);
  });
});