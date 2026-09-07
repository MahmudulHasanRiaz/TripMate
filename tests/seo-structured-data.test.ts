import { describe, expect, it } from "vitest";

describe("JSON-LD Structured Data Schema Generation", () => {
  it("generates a valid TravelAgency Organization schema", () => {
    const site = {
      title: "TripMate Travel Agency",
      phone: "+8801700000000",
      email: "info@tripmate.com",
      address: "Banani, Dhaka, Bangladesh",
      logoUrl: "https://tripmate.com/logo.png",
    };

    const schema = {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: site.title,
      telephone: site.phone,
      email: site.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address,
        addressCountry: "BD",
      },
      logo: site.logoUrl,
    };

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("TravelAgency");
    expect(schema.name).toBe("TripMate Travel Agency");
    expect(schema.address.addressCountry).toBe("BD");
    expect(schema.telephone).toBe("+8801700000000");
  });

  it("generates a valid Product + Offer schema for package listings", () => {
    const pkg = {
      title: "Premium Umrah Package 2026",
      slug: "premium-umrah-2026",
      summary: "5-star luxury Umrah package with direct flights and Haram-view hotel.",
      price: 185000,
      currency: "BDT",
      rating: 4.9,
      coverImage: { url: "/uploads/umrah.jpg" },
    };

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://tripmate.com" },
            { "@type": "ListItem", position: 2, name: "Packages", item: "https://tripmate.com/packages" },
            { "@type": "ListItem", position: 3, name: pkg.title, item: `https://tripmate.com/packages/${pkg.slug}` },
          ],
        },
        {
          "@type": "Product",
          name: pkg.title,
          description: pkg.summary,
          image: [pkg.coverImage.url],
          offers: {
            "@type": "Offer",
            price: pkg.price,
            priceCurrency: pkg.currency,
            availability: "https://schema.org/InStock",
            url: `https://tripmate.com/packages/${pkg.slug}`,
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: pkg.rating,
            reviewCount: 15,
          },
        },
      ],
    };

    expect(schema["@graph"]).toHaveLength(2);
    const breadcrumb = schema["@graph"][0];
    const product = schema["@graph"][1];

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toHaveLength(3);

    expect(product["@type"]).toBe("Product");
    expect(product.offers?.price).toBe(185000);
    expect(product.offers?.priceCurrency).toBe("BDT");
    expect(product.aggregateRating?.ratingValue).toBe(4.9);
  });

  it("generates a valid TouristDestination schema", () => {
    const dest = {
      name: "Makkah & Madinah",
      slug: "makkah-madinah",
      description: "Holiest sanctuaries of Islam.",
      image: "/uploads/makkah.jpg",
    };

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://tripmate.com" },
            { "@type": "ListItem", position: 2, name: "Destinations", item: "https://tripmate.com/packages" },
            { "@type": "ListItem", position: 3, name: dest.name, item: `https://tripmate.com/destinations/${dest.slug}` },
          ],
        },
        {
          "@type": "TouristDestination",
          name: dest.name,
          description: dest.description,
          image: dest.image,
          touristType: ["Holiday", "Adventure", "Leisure", "Family"],
        },
      ],
    };

    expect(schema["@graph"]).toHaveLength(2);
    const destination = schema["@graph"][1];
    expect(destination["@type"]).toBe("TouristDestination");
    expect(destination.name).toBe("Makkah & Madinah");
    expect(destination.touristType).toContain("Family");
  });

  it("generates a valid BlogPosting schema for articles", () => {
    const post = {
      title: "Essential Umrah Packing Guide for Families",
      slug: "essential-umrah-packing-guide",
      excerpt: "A comprehensive checklist for travelling with elderly parents and young children.",
      publishedAt: new Date("2026-02-15T10:00:00Z"),
      author: "TripMate Editorial Team",
      featuredImage: { url: "/uploads/packing.jpg" },
    };

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://tripmate.com" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://tripmate.com/blog" },
            { "@type": "ListItem", position: 3, name: post.title, item: `https://tripmate.com/blog/${post.slug}` },
          ],
        },
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: [post.featuredImage.url],
          datePublished: post.publishedAt.toISOString(),
          author: {
            "@type": "Person",
            name: post.author,
          },
        },
      ],
    };

    const article = schema["@graph"][1] as {
      "@type"?: string;
      headline?: string;
      author?: { name?: string };
      datePublished?: string;
    };
    expect(article["@type"]).toBe("BlogPosting");
    expect(article.headline).toBe("Essential Umrah Packing Guide for Families");
    expect(article.author?.name).toBe("TripMate Editorial Team");
    expect(article.datePublished).toBe("2026-02-15T10:00:00.000Z");
  });
});
