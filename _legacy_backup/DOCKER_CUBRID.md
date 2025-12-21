# CUBRID Docker 설정 가이드

## 빠른 시작

### 1. Docker 컨테이너 실행

```bash
# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f cubrid
```

### 2. 데이터베이스 초기화 (최초 1회)

```bash
# 컨테이너 내부에서 초기화 스크립트 실행
docker exec -it egov-cubrid /bin/bash -c "/init-db.sh"
```

### 3. 연결 확인

```bash
# CUBRID 상태 확인
docker exec -it egov-cubrid cubrid server status

# 데이터베이스 접속 테스트
docker exec -it egov-cubrid csql -u dba demodb -c "SELECT 1"
```

## 접속 정보

| 항목 | 값 |
|------|-----|
| Host | localhost |
| Port | 33000 |
| Database | demodb |
| Username | dba |
| Password | (없음) |
| JDBC URL | `jdbc:cubrid:localhost:33000:demodb:::?charSet=UTF-8` |

## 명령어 모음

```bash
# 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 컨테이너 및 볼륨 삭제 (데이터 초기화)
docker-compose down -v

# 로그 확인
docker-compose logs -f cubrid

# 컨테이너 내부 접속
docker exec -it egov-cubrid /bin/bash

# SQL 실행
docker exec -it egov-cubrid csql -u dba demodb
```

## 문제 해결

### 포트 충돌
기존에 33000 포트를 사용 중인 경우 `docker-compose.yml`에서 포트 변경:
```yaml
ports:
  - "33001:33000"  # 호스트포트:컨테이너포트
```

### 데이터베이스 재초기화
```bash
# 볼륨 삭제 후 재시작
docker-compose down -v
docker-compose up -d
docker exec -it egov-cubrid /bin/bash -c "/init-db.sh"
```

## globals.properties 설정

Docker 사용 시 `src/main/resources/egovframework/egovProps/globals.properties` 설정:

```properties
# Docker CUBRID 설정
Globals.DbType = cubrid
Globals.DriverClassName=cubrid.jdbc.driver.CUBRIDDriver
Globals.Url=jdbc:cubrid:localhost:33000:demodb:::?charSet=UTF-8
Globals.UserName=dba
Globals.Password=
```
