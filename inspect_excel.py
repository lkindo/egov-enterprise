
import pandas as pd
import os

file_path = r"d:\project\egov-enterprise\_legacy_backup\DATABASE\gov-std(2025).xlsx"

try:
    # Load the Excel file
    xls = pd.ExcelFile(file_path)
    
    print("Sheet names:", xls.sheet_names)
    
    # Read the first sheet (usually contains the dictionary)
    df = pd.read_excel(xls, sheet_name=0, nrows=10)
    print("\nFirst 10 rows of the first sheet:")
    print(df.to_string())
    
    # Check headers
    print("\nColumns:", df.columns.tolist())
    
except Exception as e:
    print(f"Error: {e}")
