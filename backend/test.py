from playwright.sync_api import sync_playwright
# import sys
import time
# import json

with sync_playwright() as p:

    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    prices = []
    
    for card_code in [2661]:
        url=f"https://demo.inelabteamdev.com/item/{card_code}"
        page.goto(url,wait_until="domcontentloaded")
        
            # Remove consent popup
        page.add_style_tag(content="""
            .consent-scrim {
                display: none !important;
            }
        """)
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
        
        btn=page.locator("button.opt-chip")
        btn_click=offer.get_by_role("button",name="Check today’s price")
        for i in range(btn.count()):
            opt=btn.nth(i)
            opt.click()
            if btn_click.count()==0:
                print("-----------button---------")
                btn_click=offer.locator("button.ctl.ctl-main")
                time.sleep(1)
            btn_click.click()
            time.sleep(7)
            x=opt.inner_text().strip()
            if offer.locator("span.avail-pill.avail-no").count()!=0:
                prices.append({"option":x,"price":"sold out"})
                print(x,":","sold out")
            else:
                price_div = page.locator("div.nvo-c5").first
                spans = price_div.locator("span")
                price_parts =  spans.all_inner_texts()
                price = "".join(price_parts).replace("\xa0", "").replace("\u200b", "").replace(" ","").strip()
                prices.append({"option":x,"price":price})
                print(x,":",price)
            
                
    print(prices)
    browser.close()