from playwright.sync_api import sync_playwright
import sys
import time
import json

with sync_playwright() as p:

    browser = p.chromium.launch(headless=False)
    if sys.argv[1]:
        card_code = sys.argv[1]
    else:
        card_code=2064
    URL = f"https://demo.inelabteamdev.com/item/{card_code}"
    page = browser.new_page()

    page.goto(URL,wait_until="domcontentloaded")

    # Remove consent popup
    page.add_style_tag(content="""
        .consent-scrim {
            display: none !important;
        }
    """)

    # Product information
    # dept = page.locator("span.dept-label").inner_text().strip()
    # code = card_code
    # brand = page.locator("p.card-maker").inner_text().strip()
    # product_name = page.locator("h3.card-title").inner_text().strip()
    # Hover offer panel
    offer = page.locator("div.offer-panel").first
    offer.wait_for(state="visible")
    box = offer.bounding_box()
    x = box["x"]
    y = box["y"]
    width = box["width"]
    height = box["height"]
    page.mouse.move(20, 20)
    time.sleep(0.2)
    page.mouse.move(x + 20,y + height / 2)
    # Hover detection
    for i in range(12):
        move_x = x + 20 + ((width - 40) * i / 11)
        move_y = y + height / 2
        page.mouse.move(move_x,move_y)
        time.sleep(0.06)
    time.sleep(0.7)

    # Get all options
    btn = page.locator("button.opt-chip")
    btn_price = page.get_by_role("button", name="Check today’s price")
    prices = []
    for i in range(btn.count()):
        option = btn.nth(i).inner_text().strip()
        # Select option
        btn.nth(i).click()
        # Wait for price button
        btn_price.wait_for(state="visible",timeout=5000)
        # Wait until enabled
        # for _ in range(50):
        #     if not btn_price.is_disabled():
        #         break
        #     time.sleep(0.1)
        if btn_price.is_disabled():
            price = "N/A"
        else:
            btn_price.click()
            price_locator = page.locator("span.price-value")      
            try:
                price_locator.wait_for(
                    state="visible",
                    timeout=10000
                )

                price = price_locator.inner_text().strip()
                price = price.replace("\u200b", "")
                price = price.replace("\n", "")
                price = price.replace(" ", "")

            except:
                price = "0"
        prices.append({"option": option, "price": price})

    # IMPORTANT:
    # stdout contains ONLY JSON
    print(json.dumps(prices))
    browser.close()