"""
Book Scraper for ark.no and norli.no
Usage: python book_scraper.py [--output PATH] [--overwrite] <url>...
Output: book_data.json by default
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path as PathlibPath
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Run: pip install requests beautifulsoup4")
    sys.exit(1)

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7",
})

HEADERS = SESSION.headers


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> BeautifulSoup:
    resp = SESSION.get(url, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def extract_json_ld(soup: BeautifulSoup) -> dict:
    """Pull the first schema.org Book / Product JSON-LD block if present."""
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            if isinstance(data, dict) and "@graph" in data:
                for item in data["@graph"]:
                    if item.get("@type") in ("Book", "Product"):
                        return item
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") in ("Book", "Product"):
                        return item
            if isinstance(data, dict) and data.get("@type") in ("Book", "Product"):
                return data
        except (json.JSONDecodeError, AttributeError):
            continue
    return {}


def clean(text: str | None) -> str | None:
    if not text:
        return None
    return re.sub(r"\s+", " ", str(text)).strip() or None


def parse_author(raw_author: object | None) -> str | None:
    if isinstance(raw_author, list):
        names = []
        for author in raw_author:
            if isinstance(author, dict):
                name = author.get("name") or author.get("@id")
                if name:
                    names.append(str(name))
            elif isinstance(author, str):
                names.append(author)
        return clean(", ".join(names))

    if isinstance(raw_author, dict):
        name = raw_author.get("name") or raw_author.get("@id")
        return clean(str(name)) if name else None

    if isinstance(raw_author, str):
        return clean(raw_author)

    return None


def parse_price(raw_price: object | None) -> str | None:
    if raw_price is None:
        return None
    return clean(str(raw_price))


def select_first_text(soup: BeautifulSoup, *selectors: str) -> str | None:
    for selector in selectors:
        tag = soup.select_one(selector)
        if tag:
            return clean(tag.get_text())
    return None


def select_meta_content(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
    return clean(tag["content"]) if tag and tag.get("content") else None


def select_image_url(soup: BeautifulSoup, *selectors: str) -> str | None:
    for selector in selectors:
        tag = soup.select_one(selector)
        if tag:
            url = tag.get("src") or tag.get("data-src")
            if url:
                return clean(url)
    return None


def normalize_book_data(
    *,
    source: str,
    url: str,
    title: str | None,
    author: str | None,
    description: str | None,
    isbn: str | None,
    price: str | None,
    currency: str | None,
    image_url: str | None,
    publisher: str | None,
    published_date: str | None,
    language: str | None,
    num_pages: str | None,
    book_format: str | None,
) -> dict:
    authors = clean(author)
    return {
        "source": source,
        "url": url,
        "title": clean(title),
        "author": authors,
        "authors": authors,
        "description": description,
        "isbn": clean(isbn),
        "price": price,
        "currency": currency,
        "image_url": clean(image_url),
        "cover_image_url": clean(image_url),
        "publisher": clean(publisher),
        "published_date": clean(published_date),
        "language": clean(language),
        "num_pages": clean(num_pages),
        "format": clean(book_format),
        "scraped_at": datetime.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# Site-specific scrapers
# ---------------------------------------------------------------------------

def scrape_ark(soup: BeautifulSoup, url: str) -> dict:
    data = extract_json_ld(soup)

    title = (
        data.get("name")
        or select_first_text(soup, "h1.product-title", "h1[class*='title']", "h1")
        or select_meta_content(soup, "og:title")
    )

    author = (
        parse_author(data.get("author"))
        or select_first_text(soup, "[class*='author']", "[class*='contributor']", ".product-author")
    )

    description = (
        clean(data.get("description"))
        or select_first_text(soup, "[class*='description']", "[class*='ingress']", "[itemprop='description']")
        or select_meta_content(soup, "og:description")
    )

    isbn = (
        data.get("isbn")
        or select_first_text(soup, "[itemprop='isbn']", "[class*='isbn']")
    )

    offers = data.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}

    price = parse_price(offers.get("price")) or select_first_text(
        soup,
        "[class*='price']",
        "[itemprop='price']",
        ".product-price",
    )
    currency = offers.get("priceCurrency") or "NOK"

    image = (
        (data.get("image") if isinstance(data.get("image"), str) else None)
        or select_meta_content(soup, "og:image")
        or select_image_url(soup, "[class*='product-image'] img", ".book-cover img")
    )

    publisher_raw = data.get("publisher")
    publisher = (
        publisher_raw.get("name") if isinstance(publisher_raw, dict)
        else publisher_raw
        or select_first_text(soup, "[itemprop='publisher']", "[class*='publisher']")
    )

    pub_date = data.get("datePublished") or select_first_text(soup, "[itemprop='datePublished']", "[class*='publish-date']")
    language = data.get("inLanguage") or select_first_text(soup, "[itemprop='inLanguage']")
    num_pages = data.get("numberOfPages") or select_first_text(soup, "[itemprop='numberOfPages']", "[class*='pages']")
    book_format = (
        data.get("bookFormat")
        or select_first_text(soup, "[itemprop='bookFormat']", "[class*='format']", "[class*='binding']")
    )

    return normalize_book_data(
        source="ark.no",
        url=url,
        title=title,
        author=author,
        description=description,
        isbn=isbn,
        price=price,
        currency=currency,
        image_url=image,
        publisher=publisher,
        published_date=pub_date,
        language=language,
        num_pages=num_pages,
        book_format=book_format,
    )


def scrape_norli(soup: BeautifulSoup, url: str) -> dict:
    data = extract_json_ld(soup)

    title = (
        data.get("name")
        or select_first_text(soup, "h1.product-name", "h1[class*='title']", "h1")
        or select_meta_content(soup, "og:title")
    )

    author = (
        parse_author(data.get("author"))
        or select_first_text(soup, "[class*='author']", ".contributor-name")
    )

    description = (
        clean(data.get("description"))
        or select_first_text(soup, "[class*='description']", ".product-description", "[itemprop='description']")
        or select_meta_content(soup, "og:description")
    )

    isbn = data.get("isbn") or select_first_text(soup, "[itemprop='isbn']", "[class*='isbn']")

    offers = data.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}

    price = parse_price(offers.get("price")) or select_first_text(
        soup,
        "[class*='price']",
        ".price",
        "[itemprop='price']",
    )
    currency = offers.get("priceCurrency") or "NOK"

    image = (
        (data.get("image") if isinstance(data.get("image"), str) else None)
        or select_meta_content(soup, "og:image")
        or select_image_url(soup, ".product-image img", "[class*='cover'] img")
    )

    publisher_raw = data.get("publisher")
    publisher = (
        publisher_raw.get("name") if isinstance(publisher_raw, dict)
        else publisher_raw
        or select_first_text(soup, "[itemprop='publisher']", "[class*='publisher']")
    )

    pub_date = data.get("datePublished") or select_first_text(soup, "[itemprop='datePublished']")
    language = data.get("inLanguage") or select_first_text(soup, "[itemprop='inLanguage']")
    num_pages = data.get("numberOfPages") or select_first_text(soup, "[itemprop='numberOfPages']")
    book_format = data.get("bookFormat") or select_first_text(soup, "[itemprop='bookFormat']", "[class*='format']")

    return normalize_book_data(
        source="norli.no",
        url=url,
        title=title,
        author=author,
        description=description,
        isbn=isbn,
        price=price,
        currency=currency,
        image_url=image,
        publisher=publisher,
        published_date=pub_date,
        language=language,
        num_pages=num_pages,
        book_format=book_format,
    )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def scrape(url: str) -> dict:
    domain = urlparse(url).netloc.lower().lstrip("www.")

    print(f"  Fetching: {url}")
    soup = fetch_page(url)

    if "ark.no" in domain:
        print("  Detected: ark.no")
        return scrape_ark(soup, url)
    elif "norli.no" in domain:
        print("  Detected: norli.no")
        return scrape_norli(soup, url)
    else:
        raise ValueError(
            f"Unsupported site: {domain}\n"
            "This scraper supports ark.no and norli.no only."
        )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_existing_books(path: PathlibPath) -> list[dict]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as f:
            existing = json.load(f)
        return existing if isinstance(existing, list) else [existing]
    except (json.JSONDecodeError, OSError):
        return []


def save_books(path: PathlibPath, books: list[dict], overwrite: bool) -> None:
    if overwrite:
        data = books
    else:
        existing = load_existing_books(path)
        data = existing + books
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scrape book details from ark.no and norli.no",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("urls", nargs="*", help="Book page URL(s) to scrape")
    parser.add_argument(
        "-o",
        "--output",
        default="book_data.json",
        help="Output JSON file path",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite output file instead of appending",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    urls = args.urls or []

    if not urls:
        prompt = input("Enter book URL (ark.no or norli.no): ").strip()
        if not prompt:
            print("No URL provided.")
            return 1
        urls = [prompt]

    books = []
    for url in urls:
        try:
            book = scrape(url)
            books.append(book)
        except ValueError as e:
            print(f"\nError: {e}")
            continue
        except requests.HTTPError as e:
            print(f"\nHTTP error: {e}")
            continue
        except Exception as e:
            print(f"\nUnexpected error: {e}")
            continue

    if not books:
        print("No book data was scraped.")
        return 1

    output_path = PathlibPath(args.output)
    save_books(output_path, books, overwrite=args.overwrite)

    for book in books:
        print(f"\n{'='*50}")
        print(f"  Title:     {book.get('title') or '—'}")
        print(f"  Author:    {book.get('authors') or '—'}")
        print(f"  ISBN:      {book.get('isbn') or '—'}")
        print(f"  Price:     {book.get('price') or '—'} {book.get('currency', '')}")
        print(f"  Publisher: {book.get('publisher') or '—'}")
        print(f"  Published: {book.get('published_date') or '—'}")
        print(f"  Pages:     {book.get('num_pages') or '—'}")
        print(f"  Format:    {book.get('format') or '—'}")
    print(f"{'='*50}")
    print(f"\n  Saved to: {output_path}  ({len(load_existing_books(output_path))} book(s) total)\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
