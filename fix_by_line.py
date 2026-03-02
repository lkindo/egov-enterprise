def fix_line(file_path, line_num, new_content):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # line_num is 1-indexed
    original_line = lines[line_num - 1]
    indent = original_line[:len(original_line) - len(original_line.lstrip())]
    lines[line_num - 1] = indent + new_content + '\n'
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed line {line_num} in {file_path}")

fix_line('d:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/CommonCodeIntegrationTest.java', 73, '.codeIdNm("??좎럩???좎럡?뉒뙴諭€???")')
fix_line('d:/project/egov-enterprise/api-server/src/test/java/com/company/project/integration/MenuIntegrationTest.java', 74, '.menuNm("?봔€筌뤴뫀李??")')
