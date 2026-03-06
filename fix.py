import os
files = [
    "api-server/src/main/java/com/company/project/api/controller/code/CcmManageController.java",
    "api-server/src/main/java/com/company/project/api/controller/smarttoolkit/DeptJobController.java",
    "api-server/src/main/java/com/company/project/api/controller/smarttoolkit/ScheduleController.java",
    "api-server/src/main/java/com/company/project/api/controller/smarttoolkit/ScrapController.java",
    "api-server/src/main/java/com/company/project/api/controller/terms/TermsApiController.java",
    "api-server/src/main/java/com/company/project/api/controller/zip/ZipManageController.java",
    "api-server/src/main/java/com/company/project/api/interceptor/OperationalAuditInterceptor.java"
]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    content = content.replace(".getUser().getUserId()", ".getUserId()")
    content = content.replace(".getUser().getEsntlId()", ".getEsntlId()")
    content = content.replace(".getUser().getUserNm()", ".getUserNm()")
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
