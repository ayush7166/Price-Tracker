import pandas as pd

df = pd.read_csv("products.csv")

result = df[df["dept_label"] == "Networking".upper()]

print(result)