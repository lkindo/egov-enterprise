const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('frontend/src');

const dictionary = {
  'Tab 1': '탭 1',
  'Content 1': '콘텐츠 1',
  'Option 1': '옵션 1',
  'Default': '기본',
  'Outline': '외곽선',
  'Disabled': '비활성화',
  'Loading': '로딩 중',
  'More pages': '더 많은 페이지',
  'EGOV': '전자정부',
  'E-GOV ENTERPRISE': '전자정부 엔터프라이즈',
  'CloseModal': '모달 닫기',
  'Organizational': '조직',
  'Infrastructure': '인프라',
  'Live infra establish': '라이브 인프라 구축',
  'Deactivate bypass': '우회 비활성화',
  'No Results': '결과 없음',
  'INTEGRITY': '무결성',
  'Master Data Repository': '마스터 데이터 저장소',
  'Total Participation': '총 참여',
  'UNITS': '단위',
  'ACTIVE': '활성',
  'Live Gauge': '라이브 게이지',
  'System Idle': '시스템 대기',
  'Intelligence Board': '인텔리전스 게시판',
  'Global Feedback Monitoring': '글로벌 피드백 모니터링',
  'Configure Protocol': '프로토콜 구성',
  'Initiation Date': '시작일',
  'Termination Date': '종료일',
  'NODE': '노드',
  'Hub': '허브',
  'System Integrity Summary': '시스템 무결성 요약',
  'Global Directory': '글로벌 디렉토리',
  'Corporate Stats': '기업 통계',
  'Total Staff': '총 직원',
  'Departments': '부서',
  'Architectural Override Caution': '아키텍처 재정의 주의',
  'Functional Role Table Probe': '기능적 역할 테이블 프로브',
  'NODE-01 ACTIVE': '노드-01 활성',
  'STABLE': '안정',
  'Security Verified Channel': '보안 검증 채널',
  'Global Delivery': '글로벌 배포',
  'Active Triggers': '활성 트리거',
  'Intelligence Hub Console': '인텔리전스 허브 콘솔',
  'Enterprise Knowledge': '엔터프라이즈 지식',
  'Internal Access Only': '내부 접근 전용',
  'Admin Root': '관리자 루트',
  'Knowledge Portal': '지식 포털',
  'Access Matrix Denied': '액세스 매트릭스 거부됨',
  'No Knowledge Record Found': '지식 기록을 찾을 수 없음',
  'SCORE': '점수',
  'CORE UNIT': '핵심 단위',
  'SYNCED': '동기화됨',
  'Stability Status': '안정성 상태',
  'Synchronized': '동기화 완료',
  'Impact Score High': '영향도 점수 높음',
  'Intelligence Engine': '인텔리전스 엔진',
  'Active Data Matrix Scanning': '활성 데이터 매트릭스 스캔 중',
  'LIVE DATA FEED': '라이브 데이터 피드',
  'Archiving...': '보관 중...',
  'Functional Group Table Probe': '기능적 그룹 테이블 프로브',
  'Knowledge Hub': '지식 허브',
  'Real-time': '실시간'
};

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  Object.entries(dictionary).forEach(([eng, kor]) => {
    // Replace exact text between tags
    let regex = new RegExp('>' + eng + '<', 'g');
    newContent = newContent.replace(regex, '>' + kor + '<');
    
    // Replace with spaces around
    regex = new RegExp('>\\\\s*' + eng + '\\\\s*<', 'g');
    newContent = newContent.replace(regex, '> ' + kor + ' <');
    
    // Replace standalone string values (e.g. text nodes without tags but exact matches)
    newContent = newContent.split('"' + eng + '"').join('"' + kor + '"');
    newContent = newContent.split("'" + eng + "'").join("'" + kor + "'");
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log('Extended translation pass 2 modified ' + modifiedCount + ' files.');
