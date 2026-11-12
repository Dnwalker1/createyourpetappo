import { allowedTextOnly } from "./designText";

describe("allowedTextOnly", () => {
  it("keeps letters, numbers and the allowed symbols", () => {
    expect(allowedTextOnly("MAX & RUBY! #1 50% O'Neil-Smith, Jr.: $@+?")).toBe(
      "MAX & RUBY! #1 50% O'Neil-Smith, Jr.: $@+?",
    );
  });
  it("drops the symbols the website would not print (test report M-01)", () => {
    expect(allowedTextOnly("Rex_*%;=")).toBe("Rex%");
    expect(allowedTextOnly('{hi} <b> "x"')).toBe("hi b x");
  });
  it("turns a curly apostrophe from the phone keyboard into a plain one", () => {
    expect(allowedTextOnly("Bo’s")).toBe("Bo's");
  });
});
