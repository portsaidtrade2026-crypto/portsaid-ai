import {
  normalizeLocalMediaUrl,
  normalizeLocalMediaUrlsMiddleware,
} from "../normalize-local-media-urls";

describe("normalizeLocalMediaUrl", () => {
  it("converts workspace-loopback public image URLs to same-origin paths", () => {
    expect(
      normalizeLocalMediaUrl(
        "http://localhost:9000/static/product image.webp?width=320"
      )
    ).toBe("/static/product%20image.webp?width=320");
    expect(
      normalizeLocalMediaUrl("http://127.0.0.1:9000/static/product.webp")
    ).toBe("/static/product.webp");
  });

  it("preserves unrelated and private file URLs", () => {
    expect(
      normalizeLocalMediaUrl("https://cdn.example.com/static/product.webp")
    ).toBe("https://cdn.example.com/static/product.webp");
    expect(
      normalizeLocalMediaUrl("http://localhost:9000/static/private-contract.pdf")
    ).toBe("http://localhost:9000/static/private-contract.pdf");
  });
});

describe("normalizeLocalMediaUrlsMiddleware", () => {
  it("normalizes nested image URLs in JSON responses", () => {
    const originalJson = jest.fn();
    const response = { json: originalJson };
    const next = jest.fn();
    const createdAt = new Date("2026-09-25T00:00:00.000Z");

    normalizeLocalMediaUrlsMiddleware({} as never, response as never, next);
    (response.json as jest.Mock)({
      products: [
        {
          images: [
            { url: "http://localhost:9000/static/product.webp" },
          ],
        },
      ],
      created_at: createdAt,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(originalJson).toHaveBeenCalledWith({
      products: [{ images: [{ url: "/static/product.webp" }] }],
      created_at: createdAt,
    });
  });
});