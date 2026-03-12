# Task: FAQ Test Coverage Expansion

## Step 1: Think (Analysis)
- Current `FaqControllerTest.java` covers success paths for `getFaqs`, `getFaq`, and `insertFaq`.
- `updateFaq` and `deleteFaq` endpoints are not tested.
- Error scenarios (FAQ not found, invalid parameters) are not tested.
- Controller uses `EgovFaqService` but the test mocks `FaqService`. Need to check the relationship between them.
- `FaqDto` needs to be checked for potential validation coverage.

## Step 2: Plan (Action Steps)
1. Read `EgovFaqService.java`, `FaqService.java`, and `FaqDto.java`.
2. Verify existing test runs successfully.
3. Add `updateFaq_Success` test.
4. Add `deleteFaq_Success` test.
5. Identify and add common failure scenarios (e.g., `getFaq_NotFound`).
6. Verify all tests pass and coverage is expanded.

## Step 3: Implement (Tasks)
- [x] Read related files (Service/DTO)
- [x] Run baseline tests
- [x] Implement `updateFaq_Success` in `FaqControllerTest`
- [x] Implement `deleteFaq_Success` in `FaqControllerTest`
- [x] Implement error cases (`getFaq_NotFound`) in `FaqControllerTest`
- [x] Create `FaqServiceTest` to cover service layer methods

## Step 4: Test (Verification)
- [x] Run `gradlew test --tests *FaqControllerTest*` (Passed)
- [x] Run `gradlew test --tests *FaqServiceTest*` (Passed)
- [x] Check coverage manually (all major methods covered)

## Step 5: Summarize
- FaqControllerTest is updated with full endpoint coverage.
- FaqServiceTest is created with full service method coverage.
- Success and common error paths (404) are verified.

