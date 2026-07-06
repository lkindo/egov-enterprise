---
description: 최적의 통합 테스트 커버리지 측정 (Jacoco Root Report)
---
// turbo-all
# 🚀 통합 테스트 커버리지 측정 워크플로우

Gradle 9.4.1 환경에서 하위 모듈(`foundation`, `api-server`, `business-suite`)의 전체 테스트를 수행하고 시각화된 통합 리포트를 생성하는 최적의 절차입니다.

## 1. 빌드 환경 정화 (Purge)
윈도우 환경에서의 파일 락(File Lock) 및 좀비 프로세스를 방지하기 위해 모든 자바 인스턴스와 기존 빌드 데이터를 초기화합니다.
```powershell
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
.\gradlew --stop
Remove-Item -Path "build", "foundation/build", "api-server/build", "business-suite/build" -Recurse -Force -ErrorAction SilentlyContinue
```

## 2. 설계도 결속 확인 (BOM Check)
`settings.gradle` 파일의 인코딩 문제(BOM)로 인한 하위 모듈 로딩 실패를 방지하기 위해 형식을 고정합니다.
```powershell
[System.IO.File]::WriteAllLines("settings.gradle", (Get-Content "settings.gradle"), (New-Object System.Text.UTF8Encoding($false)))
```

## 3. 원샷 빌드 및 리포트 생성 (Ignition)
캐시 간섭 없이 순수하게 모든 소스를 측정하여 통합 리포트를 생성합니다.
```powershell
.\gradlew clean test jacocoRootReport --no-build-cache --no-daemon
```

## 4. 결과물 확인 (Harvest)
생성된 리포트의 물리적 존재와 용량을 확인합니다.
```powershell
Get-ChildItem -Path "build/reports/jacoco/aggregated/index.html" -File | Select-Object FullName, Length, LastWriteTime
```

---
> [!IMPORTANT]
> **리포트 주소:** d:\project\egov-enterprise\build\reports\jacoco\aggregated\index.html
> 만약 리포트 태스크가 `SKIPPED` 된다면 루트의 `build/jacoco/test.exec` 파일 용량이 1MB 이상인지 먼저 확인하십시오.
