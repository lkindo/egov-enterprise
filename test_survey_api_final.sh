#!/bin/bash

BASE_URL="http://localhost:8080/api/v1/survey"

echo "=== 1. Get Survey Response List (Initial) ==="
curl -X GET "$BASE_URL/response?pageIndex=1" -H "Content-Type: application/json"
echo -e "\n\n"

echo "=== 2. Register New Survey Response ==="
# Using IDs from the sample data:
# Template: TMPLAT_0000000000001
# Qestnr: QESTNR_0000000000001
# Obj Question: QESITM_0000000000001
# Subj Question: QESITM_0000000000002
# Item: IEM_0000000000000002 (Satisfied)

# 2-1. Objective Response
curl -X POST "$BASE_URL/response" \
     -H "Content-Type: application/json" \
     -d '{
           "qestnrTmplatId": "TMPLAT_0000000000001",
           "qestnrId": "QESTNR_0000000000001",
           "qestnrQesitmId": "QESITM_0000000000001",
           "qustnrIemId": "IEM_0000000000000002",
           "respondAnswerCn": "2",
           "respondNm": "TestUser",
           "frstRegisterId": "TESTER",
           "lastUpdusrId": "TESTER"
         }'
echo -e "\n\n"

# 2-2. Subjective Response
curl -X POST "$BASE_URL/response" \
     -H "Content-Type: application/json" \
     -d '{
           "qestnrTmplatId": "TMPLAT_0000000000001",
           "qestnrId": "QESTNR_0000000000001",
           "qestnrQesitmId": "QESITM_0000000000002",
           "respondAnswerCn": "This is a test feedback.",
           "respondNm": "TestUser",
           "frstRegisterId": "TESTER",
           "lastUpdusrId": "TESTER"
         }'
echo -e "\n\n"

echo "=== 3. Get Survey Response List (After Insert) ==="
curl -X GET "$BASE_URL/response?pageIndex=1" -H "Content-Type: application/json"
echo -e "\n\n"

echo "=== 4. Get Survey Statistics (Type 1 - Objective) ==="
curl -X GET "$BASE_URL/stats?qestnrId=QESTNR_0000000000001&qestnrTmplatId=TMPLAT_0000000000001&type=1" -H "Content-Type: application/json"
echo -e "\n\n"

echo "=== 5. Get Survey Statistics (Type 2 - Subjective) ==="
curl -X GET "$BASE_URL/stats?qestnrId=QESTNR_0000000000001&qestnrTmplatId=TMPLAT_0000000000001&type=2" -H "Content-Type: application/json"
echo -e "\n"
