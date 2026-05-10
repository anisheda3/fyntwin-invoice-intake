#!/usr/bin/env python3
"""
Verification script for sync tools and model changes.
Tests that all @tool functions work without async issues.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.config import get_settings
from backend.tools.erpnext_tools import (
    fetch_purchase_order,
    list_purchase_orders,
    fetch_supplier,
    create_purchase_invoice,
    fetch_item_details,
)

def test_sync_tools():
    """Test all sync tools return proper dict responses."""
    print("Testing sync tools...")

    # Test 1: fetch_purchase_order (should return error dict for non-existent PO)
    print("1. Testing fetch_purchase_order...")
    result = fetch_purchase_order("NON-EXISTENT-PO")
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "error" in result or "not_found" in result, f"Expected error/not_found, got: {result}"
    print("   ✓ Returns dict with error for non-existent PO")

    # Test 2: list_purchase_orders (should return dict with purchase_orders key)
    print("2. Testing list_purchase_orders...")
    result = list_purchase_orders(limit=5)
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "purchase_orders" in result, f"Expected 'purchase_orders' key, got: {result}"
    assert "count" in result, f"Expected 'count' key, got: {result}"
    print("   ✓ Returns dict with purchase_orders and count")

    # Test 3: fetch_supplier (should return error dict for non-existent supplier)
    print("3. Testing fetch_supplier...")
    result = fetch_supplier("NON-EXISTENT-SUPPLIER")
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "error" in result or "not_found" in result, f"Expected error/not_found, got: {result}"
    print("   ✓ Returns dict with error for non-existent supplier")

    # Test 4: fetch_item_details (should return error dict for non-existent item)
    print("4. Testing fetch_item_details...")
    result = fetch_item_details("NON-EXISTENT-ITEM")
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "error" in result or "not_found" in result, f"Expected error/not_found, got: {result}"
    print("   ✓ Returns dict with error for non-existent item")

    print("All sync tool tests passed! ✓")

def test_models():
    """Test that models are set to gemini-flash-latest."""
    print("Testing model configuration...")
    settings = get_settings()

    expected_model = "models/gemini-flash-latest"
    assert settings.intake_model == expected_model, f"intake_model should be {expected_model}, got {settings.intake_model}"
    assert settings.validator_model == expected_model, f"validator_model should be {expected_model}, got {settings.validator_model}"
    assert settings.action_model == expected_model, f"action_model should be {expected_model}, got {settings.action_model}"

    print(f"   ✓ All models set to {expected_model}")

def main():
    """Run all verification tests."""
    print("=== Verification Script ===")
    print("Testing sync tools and model configuration...\n")

    try:
        test_sync_tools()
        print()
        test_models()
        print()
        print("🎉 ALL TESTS PASSED! Ready to run without demo mode.")
        return 0
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())