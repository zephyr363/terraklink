import { describe, expect, it } from "vitest";
import { errorMessage } from "./api";

describe("API error messages", () => {
  it("shows upload validation errors returned as a list", () => {
    expect(
      errorMessage({
        status: 400,
        data: ["Разрешены JPG, PNG, WebP, MP4 и WebM."],
      }),
    ).toBe("Разрешены JPG, PNG, WebP, MP4 и WebM.");
  });
  it("extracts nested field errors without losing their explanation", () => {
    expect(
      errorMessage({
        status: 400,
        data: {
          document: {
            sections: [
              { video: ["Недопустимая ссылка."] },
              { image: ["Недопустимая ссылка."] },
            ],
          },
        },
      }),
    ).toBe("Недопустимая ссылка.");
    expect(
      errorMessage({ status: 400, data: { detail: "Файл повреждён." } }),
    ).toBe("Файл повреждён.");
  });
  it("handles oversized proxy responses and unexpected response bodies", () => {
    expect(
      errorMessage({ status: 413, data: "<html>proxy error</html>" }),
    ).toContain("размер");
    expect(errorMessage({ status: 400, data: null })).toContain(
      "Проверьте поля",
    );
    expect(errorMessage({ status: "FETCH_ERROR" })).toContain("соединение");
  });
});
