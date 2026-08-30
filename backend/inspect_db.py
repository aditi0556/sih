"""
Database Inspection Utility Script
Run this script to inspect all database tables, columns, and data records.
Usage: py -3 inspect_db.py
"""
import sys
from db.database import engine
from sqlalchemy import inspect, text

def inspect_database():
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    print("\n" + "=" * 70)
    print(f" DATABASE TABLES IN: {engine.url}")
    print("=" * 70)
    
    if not table_names:
        print("No tables found. Run 'py -3 seed.py' to initialize.")
        return

    with engine.connect() as conn:
        for table in table_names:
            columns = inspector.get_columns(table)
            count = conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
            
            print(f"\n[*] TABLE: {table.upper()} ({count} rows)")
            col_summary = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
            print(f"    Columns: {col_summary}")
            
            # Show up to 5 sample rows
            rows = conn.execute(text(f'SELECT * FROM "{table}" LIMIT 5')).fetchall()
            if rows:
                col_names = [c['name'] for c in columns]
                print(f"    Sample Data (First {len(rows)} rows):")
                for r in rows:
                    row_dict = dict(zip(col_names, r))
                    print(f"     -> {row_dict}")
            else:
                print("    (Table is currently empty)")

    print("\n" + "=" * 70 + "\n")

if __name__ == "__main__":
    inspect_database()
