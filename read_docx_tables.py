import zipfile
import xml.etree.ElementTree as ET
import os

def extract_tables_properly(file_path):
    ns = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }
    
    with zipfile.ZipFile(file_path) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        # We want to find tables
        tables_data = []
        
        # Traverse the XML tree to find Table Names (which are paragraphs before tables) and the tables themselves
        # Alternatively, let's just find all paragraphs and tables in order.
        # We can do this by iterating over the child elements of w:body.
        body = root.find('w:body', ns)
        if body is None:
            return "No body found"
        
        current_table_name = "Unknown"
        current_pk = ""
        current_fk = ""
        
        for child in body:
            if child.tag == '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p':
                # Paragraph
                text = "".join([node.text for node in child.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text])
                if text.startswith("Table Name:"):
                    current_table_name = text.replace("Table Name:", "").strip()
                elif text.startswith("Primary Key:"):
                    current_pk = text.replace("Primary Key:", "").strip()
                elif text.startswith("Foreign Key:"):
                    current_fk = text.replace("Foreign Key:", "").strip()
            
            elif child.tag == '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tbl':
                # Table!
                rows = []
                for row_elem in child.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tr'):
                    row_cells = []
                    for cell_elem in row_elem.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tc'):
                        # Inside cell, concatenate all text in all paragraphs
                        cell_text_parts = []
                        for p_elem in cell_elem.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                            p_text = "".join([t_elem.text for t_elem in p_elem.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t_elem.text])
                            cell_text_parts.append(p_text)
                        cell_text = "\n".join(cell_text_parts).strip()
                        row_cells.append(cell_text)
                    rows.append(row_cells)
                
                tables_data.append({
                    'name': current_table_name,
                    'pk': current_pk,
                    'fk': current_fk,
                    'rows': rows
                })
        
        return tables_data

data = extract_tables_properly('Database_Tables.docx')
if isinstance(data, str):
    print(data)
else:
    with open('Database_Tables_formatted.md', 'w', encoding='utf-8') as out_f:
        out_f.write("# Database Schema Table Details\n\n")
        for table in data:
            out_f.write(f"## Table: {table['name']}\n")
            out_f.write(f"* **Primary Key**: `{table['pk']}`\n")
            out_f.write(f"* **Foreign Key**: `{table['fk']}`\n\n")
            
            rows = table['rows']
            if not rows:
                out_f.write("*No columns defined*\n\n")
                continue
                
            # Assume first row is header
            headers = rows[0]
            # Replace empty headers
            headers = [h if h else f"Col {i}" for i, h in enumerate(headers)]
            
            # Print table markdown
            header_line = "| " + " | ".join(headers) + " |"
            sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
            out_f.write(header_line + "\n")
            out_f.write(sep_line + "\n")
            
            for row in rows[1:]:
                # Pad row to match header length if needed
                if len(row) < len(headers):
                    row += [""] * (len(headers) - len(row))
                # Clean row text for markdown (replace newlines with spaces)
                clean_row = [cell.replace('\n', '<br>') for cell in row]
                out_f.write("| " + " | ".join(clean_row) + " |\n")
            out_f.write("\n")
    print("Formatted markdown tables written to Database_Tables_formatted.md")
