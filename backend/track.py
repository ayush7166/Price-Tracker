from playwright.sync_api import sync_playwright
import sys
import time
import json

import re

def clean_prices(prices):
    for item in prices:
        price = item["price"]
        if price == "sold out":
            item["price"] = "sold out"
            continue
        match = re.search(r"\d[\d,]*", price)
        if match:
            item["price"] = int(match.group().replace(",", ""))
        else:
            item["price"] = None
    return prices


with sync_playwright() as p:
    prices=[]
    browser = p.chromium.launch(headless=True) ##for deployment need to make true
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
    btn=page.locator("button.opt-chip")
    btn_click=offer.get_by_role("button",name="Check today’s price")
    for i in range(btn.count()):
        opt=btn.nth(i)
        opt.click()
        if btn_click.count()==0:
            btn_click=offer.locator("button.ctl.ctl-main")
            time.sleep(1)
        btn_click.click()
        time.sleep(7)
        x=opt.inner_text().strip()
        if offer.locator("span.avail-pill.avail-no").count()!=0:
            prices.append({"option":x,"price":"sold out"})
        else:
            price_div = page.locator("b.dpe-n6").first
            price_parts =  price_div.all_inner_texts()
            price = "".join(price_parts).replace("\xa0", "").replace("\u200b", "").replace(" ","").strip()
            prices.append({"option":x,"price":price})
            
                    
       
    prices=clean_prices(prices)
    # IMPORTANT:
    # stdout contains ONLY JSON
    print(json.dumps(prices))
    browser.close()