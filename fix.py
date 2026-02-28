import re
with open('d:/project/egov-enterprise/frontend/src/app/smart-toolkit/schedule/page.tsx', 'r', encoding='utf8') as f:
    c = f.read()

# Fix title
c = re.sub(r'title=\"\?.*$', 'title="일정 관리"', c, flags=re.MULTILINE)
# Fix breadcrumbs
c = re.sub(r'breadcrumbs=\{.*?\}', 'breadcrumbs={[{ label: "업무지원" }, { label: "일정관리" }]}', c)
# Fix label and placeholder
c = re.sub(r'label=\"\?[^\"]*', 'label="입력필드"', c)
c = re.sub(r'placeholder=\"\?[^\"]*', 'placeholder="입력하세요"', c)
# Fix calendar title empty quotes issue
c = re.sub(r'\{\s*format\(currentDate,\s*\'yyyy.*?,.*?\}\)', '{format(currentDate, "yyyy년 MM월", { locale: ko })}', c)

with open('d:/project/egov-enterprise/frontend/src/app/smart-toolkit/schedule/page.tsx', 'w', encoding='utf8') as f:
    f.write(c)
print("done")
