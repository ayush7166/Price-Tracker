from playwright.sync_api import sync_playwright
import pandas as pd
import sys
import json
import time


CSV_FILE = "products.csv"

URL = "https://demo.inelabteamdev.com"


with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto(URL, wait_until="domcontentloaded")


    # Remove cookie/consent popup if it appears
    page.add_style_tag(content="""
        .consent-scrim {
            display: none !important;
        }
    """)
    # # Handle cookies
    # try:

    #     cookies_btn = page.get_by_role(
    #         "button",
    #         name="Allow"
    #     )

    #     cookies_btn.wait_for(
    #         state="visible",
    #         timeout=5000
    #     )

    #     cookies_btn.click()

    # except:
    #     pass


    data = []

    page2=browser.new_page()
    # Pages 1 to 48
    for page_number in range(1, 49):
        print(
            f"Scraping page {page_number}",
            file=sys.stderr
        )


        # Wait for cards
        page.locator(
            "article.card"
        ).first.wait_for(
            state="visible"
        )


        articles = page.locator(
            "article.card"
        )


        count = articles.count()


        for i in range(count):
            article = articles.nth(i)
            dept = article.locator(
                "span.dept-label"
            ).inner_text().strip()
            code = article.locator(
                "p.card-code"
            ).inner_text().strip().split("-")[1]
            brand=article.locator("p.card-maker").inner_text().strip()

            product_name=article.locator("h3.card-title").inner_text().lower()
            # scrap price 
            url= f"https://demo.inelabteamdev.com/item/{code}"
            ##now hover 12 times 60ms and get price
           
            page2.goto(url , wait_until="domcontentloaded")

            ##handle cookies

            # Remove cookie/consent popup if it appears
            page2.add_style_tag(content="""
                .consent-scrim {
                    display: none !important;
                }
            """)
            # time.sleep(2)
            # try:
            
            #     cookies_btn = page2.get_by_role(
            #         "button",
            #         name="Allow"
            #     )
        
            #     cookies_btn.wait_for(
            #         state="visible",
            #         timeout=5000
            #     )
        
            #     cookies_btn.click()
            
            # except:
            #     pass
            #first hover the div
            offer = page2.locator("div.offer-panel").first
            offer.wait_for(state="visible")
            box = offer.bounding_box()
            x = box["x"]
            y = box["y"]
            width = box["width"]
            height = box["height"]
            # Move outside first
            page2.mouse.move(20, 20)
            time.sleep(0.2)
            # Enter the element
            page2.mouse.move(x + 20, y + height / 2)
            # Generate >= 8 mouse movements
            for i in range(12):
                move_x = x + 20 + (width - 40) * i / 11
                move_y = y + height / 2
                page2.mouse.move(move_x, move_y)
                # Site ignores movements faster than ~40ms
                time.sleep(0.06)
            # Satisfy minDwellMs: 600ms
            time.sleep(0.7)

            # now we enable the check todys: price button
            btn=page2.locator("button.opt-chip")
            btn_price=page2.get_by_role("button",name="Check today’s price")
            for i in range(btn.count()):
                btn.nth(i).click()
                if btn_price:
                    btn_price=page2.get_by_role("button",name="Check today’s price")
                btn_price.click()
                option = btn.nth(i).inner_text()
                price_locator = page2.locator("span.kjr-w7")
                try:
                    price_locator.wait_for(
                        state="visible",
                        timeout=5000
                    )
                    price = price_locator.inner_text()
                except:
                    price = "N/A"
                data.append({
                    "dept_label": dept,
                    "card_code": code,
                    "brand": brand,
                    "title": product_name,
                    "option": option,
                    "price":price
                })
            
            
        # Go to next page
        if page_number < 48:

            next_button = page.locator(
                "nav.pager button"
            ).last

            next_button.click()

            page.wait_for_timeout(500)
    page.close()
    page2.close()
    browser.close()


# Create DataFrame
df = pd.DataFrame(data)


# Save CSV
df.to_csv(
    CSV_FILE,
    index=False
)


print(
    json.dumps({
        "success": True,
        "rows": len(df),
        "file": CSV_FILE
    })
)

