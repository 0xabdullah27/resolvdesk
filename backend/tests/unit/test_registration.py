import pytest
from app.services.registration_service import extract_domain


def test_extract_domain_full_urls():
    assert extract_domain("https://shoestore.com") == "shoestore.com"
    assert extract_domain("http://shoestore.com") == "shoestore.com"
    assert extract_domain("https://sub.mystore.co.uk/products/item-1") == "sub.mystore.co.uk"
    assert extract_domain("https://STORE.COM/PATH?query=1") == "store.com"


def test_extract_domain_bare_domains():
    assert extract_domain("shoestore.com") == "shoestore.com"
    assert extract_domain("my-store.myshopify.com") == "my-store.myshopify.com"
    assert extract_domain("localhost") == "localhost"
    assert extract_domain("localhost:3000") == "localhost"


def test_extract_domain_invalid():
    assert extract_domain("") == ""
    assert extract_domain("   ") == ""
