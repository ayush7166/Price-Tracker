from playwright.sync_api import sync_playwright
import sys
import time
import json
import pandas as pd

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    #now scrape
    #we make list of that we need to send to user , which we get by searching all <span> tag on 

    search=sys.argv[1]
    #now we need to search this search on web , and scrap data 
    
    URL = "https://demo.inelabteamdev.com"
    page=browser.new_page()
    page.goto(URL , wait_until="domcontentloaded")

    #handle the cookies popup
    page.add_style_tag(content="""
            .consent-scrim {
                display: none !important;
            }
        """)
    # try:
    #     cookies_btn=page.get_by_role("button","Allow")
    #     cookies_btn.wait_for(state="visible",timeout=5000)
    #     cookies_btn.click()
    #     # print("cookie accpeted")
    # except:
    #     # print("cookie not found")
    #     pass

    #now scrap all page 1 to 48
    df = pd.read_csv("products.csv")
    result = df[
    df["title"].str.contains(search, case=False, na=False)]

    ##now need to scrap the price of every

    data = result.to_dict(orient="records")
    print(json.dumps(data))
    # time.sleep(20)
    browser.close()