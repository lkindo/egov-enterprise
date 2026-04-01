# k6 Load Test - Current Status

**Date**: 2026-04-01  
**Status**: ✅ Ready for Testing

---

## ✅ Completed Items

### 1. k6 Installation
- **Version**: k6 v1.6.1
- **Path**: `C:\k6\k6.exe`
- **Status**: ✅ Installed and working

### 2. Test Scripts
- ✅ `test/load-tests/scenarios/load-levels.js` - Fixed syntax errors
- ✅ `test/load-tests/utils/report.js` - Fixed recursive function bug
- ✅ All scripts pass `k6 inspect` validation

### 3. Helper Scripts
- ✅ `scripts/install-k6.ps1` - k6 installation script
- ✅ `scripts/run-load-test.ps1` - Automated test runner

### 4. Documentation
- ✅ `docs/LOAD_TEST_GUIDE.md` - Comprehensive guide
- ✅ `INSTALL_K6.md` - Installation guide
- ✅ `QUICKSTART.md` - Quick start guide
- ✅ `TASK_PROGRESS_SUMMARY.md` - Progress tracking

---

## 🔄 In Progress

### Backend Server Startup
- **Command**: `gradlew.bat :api-server:bootRun --args='--spring.profiles.active=test'`
- **Status**: Starting (Gradle daemon running)
- **Expected**: Server on http://localhost:8080

---

## 📋 Next Steps

### Option 1: Run Full Test Suite (Recommended)

```powershell
# 100 users test
.\scripts\run-load-test.ps1 -LoadLevel 100

# 500 users test
.\scripts\run-load-test.ps1 -LoadLevel 500

# 1000 users test
.\scripts\run-load-test.ps1 -LoadLevel 1000
```

### Option 2: Manual Execution

```powershell
# Set environment variables
$env:BASE_URL = "http://localhost:8080"
$env:TEST_USERNAME = "testuser"
$env:TEST_PASSWORD = "testpass123!"

# Run 100 users test
C:\k6\k6.exe run --scenario users-100 test/load-tests/scenarios/load-levels.js

# Run 500 users test
C:\k6\k6.exe run --scenario users-500 test/load-tests/scenarios/load-levels.js

# Run 1000 users test
C:\k6\k6.exe run --scenario users-1000 test/load-tests/scenarios/load-levels.js
```

---

## 🎯 Test Execution Checklist

- [ ] Backend server started successfully
- [ ] Health check passed (http://localhost:8080/actuator/health)
- [ ] Test credentials configured
- [ ] Results directory created
- [ ] 100 users test executed
- [ ] 500 users test executed
- [ ] 1000 users test executed
- [ ] HTML reports generated
- [ ] Results recorded in `records/*.md`
- [ ] Performance report updated

---

## 📊 Expected Test Duration

| Load Level | Ramp-up | Steady | Ramp-down | Total |
|------------|---------|--------|-----------|-------|
| 100 users | 1 min | 3 min | 1 min | **5 min** |
| 500 users | 2 min | 5 min | 2 min | **9 min** |
| 1000 users | 5 min | 10 min | 5 min | **20 min** |

**Total Time**: ~34 minutes for all three tests

---

## 📁 Output Files

After test execution, you'll find:

- **JSON Results**: `test-results/k6/results-{level}-{timestamp}.json`
- **HTML Reports**: `test/load-tests/results/report-{level}-{timestamp}.html`
- **Records**: `records/{level}-users-results.md` (to be filled)

---

## 🔧 Troubleshooting

### Server Not Starting

```powershell
# Check if port 8080 is in use
netstat -ano | findstr :8080

# Check Java processes
tasklist | findstr java

# Stop all Gradle daemons
gradlew.bat --stop

# Restart server
gradlew.bat :api-server:bootRun --args='--spring.profiles.active=test'
```

### k6 Not Found

```powershell
# Add to PATH (if not already)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;C:\k6", "User")

# Restart PowerShell
```

### Test Fails with Connection Error

1. Ensure backend server is running
2. Check BASE_URL environment variable
3. Verify test credentials

---

## 📈 Success Criteria

### Thresholds (SLO)

| Metric | Target | Description |
|--------|--------|-------------|
| HTTP Response Time (p95) | < 1000ms | 95% of requests under 1 second |
| HTTP Failure Rate | < 1% | Less than 1% failed requests |

### Load Level Targets

| Load Level | Users | Target p95 | Target TPS |
|------------|-------|------------|------------|
| Level 1 | 100 | < 500ms | > 100 TPS |
| Level 2 | 500 | < 800ms | > 400 TPS |
| Level 3 | 1000 | < 1000ms | > 800 TPS |

---

**Last Updated**: 2026-04-01 11:50  
**Prepared By**: Performance Testing Team
