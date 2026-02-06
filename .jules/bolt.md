## 2024-05-23 - In-memory Filtering of Large Datasets
**Learning:** Found `EgovMenuManageServiceImpl` fetching the entire menu table (`findAll`) to filter by parent ID in memory using Java Streams. This is a severe scalability bottleneck as the menu table grows.
**Action:** When working on hierarchical data services (Menu, Program, Code), always check for `findAll()` usage followed by stream filtering. Replace with targeted repository methods (e.g., `findByUpperMenuNo`).

## 2024-05-23 - In-memory Filtering of Large Datasets (BndtDiary)
**Learning:** Found `EgovBndtManageServiceImpl` fetching the entire diary table (`findAll`) to filter by composite key in memory. This is a severe scalability bottleneck.
**Action:** Replaced `findAll().stream().filter()` with targeted `BndtDiaryRepository.findByBndtIdAndBndtDe`. Validated the existence of the repository method in `common-domain` before applying.
