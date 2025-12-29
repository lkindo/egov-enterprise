
import pandas as pd
import re
import os

# 1. Load Excel Mapping
excel_path = r'd:\project\egov-enterprise\_legacy_backup\DATABASE\gov-std(2025).xlsx'
df = pd.read_excel(excel_path, sheet_name=1)
# mapping: 영문약어명 -> 한글명
mapping = df[['공통표준단어영문약어명', '공통표준단어명']].dropna().set_index('공통표준단어영문약어명')['공통표준단어명'].to_dict()

# 2. Refined Manual Mappings for Database/egovFrame specifics
manual_mappings = {
    'ID': '아이디',
    'NM': '명',
    'NO': '번호',
    'PASSWORD': '비밀번호',
    'CNSR': '답변',
    'BRTHDY': '생년월일',
    'AREA': '지역',
    'LC': '위치', # Location/Position
    'DC': '설명', # Description
    'DT': '일시',
    'AT': '여부',
    'DE': '일자',
    'CODE': '코드', # Fix for CO+DE
    'CO': '수', # Count
    'CNT': '수',
    'SN': '일련번호',
    'PNTTM': '시점',
    'UPDT': '수정',
    'REGIST': '등록',
    'REGISTER': '등록자',
    'UPDUSR': '수정자',
    'TY': '유형',
    'SJ': '제목',
    'CN': '내용',
    'PROGRM': '프로그램',
    'FILE': '파일',
    'STRE': '저장',
    'ORGNZT': '조직',
    'EMAIL': '이메일',
    'ADRES': '주소',
    'EMPLYR': '사용자',
    'EMPLY': '채용',
    'EMPL': '사원',
    'ORDR': '순서',
    'BGNDE': '시작일',
    'ENDDE': '종료일',
    'VRTICL': '세로',
    'WIDTH': '가로',
    'REFLCT': '반영',
    'STTUS': '상태',
    'NTCE': '공지',
    'ADR': '주소',
    'ZIP': '우편번호',
    'TELNO': '전화번호',
    'MBTLNUM': '휴대폰번호',
    'OFFM': '사무실',
    'HOUSE': '택', # 자택
    'IHIDNUM': '주민등록번호',
    'AUTHOR': '권한',
    'ROLE': '역할',
    'BBS': '게시판',
    'CMMNTY': '커뮤니티',
    'CLUB': '동호회',
    'MBER': '회원',
    'ENTRPRS': '기업',
    'GNRL': '일반',
    'SCRTY': '보안',
    'ESTBS': '설정',
    'QA': '질의응답',
    'QNA': '질의응답',
    'QUSTNR': '설문',
    'QESTNR': '설문',
    'TMPLAT': '템플릿',
    'RESPOND': '응답',
}

# Update mapping with manual ones (manual takes precedence for these common terms)
mapping.update(manual_mappings)

def translate_name(name):
    # Some special case joins
    if name == 'NPROGRMLIST': return '프로그램목록'
    if name == 'HPROGRMCHANGEDTLS': return '프로그램변경상세이력'
    
    parts = name.split('_')
    translated_parts = []
    
    # Handle prefixes
    if len(parts) > 1 and parts[0] in ['N', 'H', 'S', 'T', 'C', 'R']:
        prefix = parts[0]
        # Ignore N for comments usually
        if prefix == 'H': translated_parts.append('이력')
        elif prefix == 'S': translated_parts.append('통계')
        elif prefix == 'T': translated_parts.append('내역')
        elif prefix == 'C': translated_parts.append('코드')
        parts = parts[1:]

    for part in parts:
        if part in mapping:
            translated_parts.append(mapping[part])
        else:
            # Try to see if it's a join of multiple abbreviations without underscore
            # e.g. BRTHDY (if not in mapping)
            found = False
            for i in range(len(part)-1, 1, -1):
                head = part[:i]
                tail = part[i:]
                if head in mapping and tail in mapping:
                    translated_parts.append(mapping[head] + mapping[tail])
                    found = True
                    break
            if not found:
                translated_parts.append(part)
            
    return "".join(translated_parts)

# 3. Read DDL and Parse
ddl_path = r'd:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\ddl\postgres\com_DDL_postgres.sql'
with open(ddl_path, 'r', encoding='utf-8') as f:
    ddl_content = f.read()

# Improved parsing
tables = []
# Match CREATE TABLE [IF NOT EXISTS] table_name ( ... );
# We'll use a regex that handles the whole block better or just line by line carefully
current_table = None
lines = ddl_content.split('\n')

SQL_KEYWORDS = {'PRIMARY', 'FOREIGN', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'ON', 'DELETE', 'CASCADE', 'SET', 'NULL', 'REFERENCES', 'INDEX', 'CREATE', 'TABLE'}

for line in lines:
    line = line.strip().upper()
    if not line: continue
    
    table_match = re.match(r'CREATE TABLE (\w+)', line)
    if table_match:
        current_table = table_match.group(1)
        if current_table not in SQL_KEYWORDS:
            tables.append({'name': current_table, 'columns': []})
        continue
    
    if line.startswith(');'):
        current_table = None
        continue
        
    if current_table:
        # Match column name
        col_match = re.match(r'^(\w+)\s+', line)
        if col_match:
            col_name = col_match.group(1)
            if col_name not in SQL_KEYWORDS:
                tables[-1]['columns'].append(col_name)

# 4. Generate Comments
output_sqls = []
for table in tables:
    table_comment = translate_name(table['name'])
    output_sqls.append(f"COMMENT ON TABLE {table['name']} IS '{table_comment}';")
    for col in table['columns']:
        col_comment = translate_name(col)
        output_sqls.append(f"COMMENT ON COLUMN {table['name']}.{col} IS '{col_comment}';")

# 5. Output
with open('generated_comments.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_sqls))

print(f"Generated {len(output_sqls)} comments to generated_comments.sql")
