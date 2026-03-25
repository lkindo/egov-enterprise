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
  'NEW COMMENT': '새 댓글',
  'High-performance intelligence grid': '고성능 인텔리전스 그리드',
  'Live Engine Active': '라이브 엔진 활성화',
  'Visual Form Engine v1.0': '비주얼 폼 엔진 v1.0',
  'Properties': '속성',
  'Label Name': '라벨 이름',
  'Placeholder': '플레이스홀더',
  'Width': '너비',
  'HALF': '절반',
  'FULL': '전체',
  'No Field Selected': '선택된 필드 없음',
  'High': '높음',
  'Normal': '보통',
  'Medium': '중간',
  'Low': '낮음',
  'Smart Scheduling Canvas': '스마트 스케줄링 캔버스',
  'Real-time resource allocation engine': '실시간 리소스 할당 엔진',
  'Active Capacity': '활성 용량',
  'Room Matrix': '회의실 매트릭스',
  'Instant': '즉시',
  'Reservation': '예약',
  'AI analyzes your schedule to find the perfect slot': 'AI가 일정을 분석하여 최적의 시간을 찾습니다',
  'Fast Book': '빠른 예약',
  'ENTER': '입력',
  'ESC': '취소',
  'EGov Enterprise Intelligence': 'EGov 엔터프라이즈 인텔리전스',
  'Pulse Inactive': '펄스 비활성',
  'Modernizing Enterprise': '엔터프라이즈 현대화',
  'Please wait a moment': '잠시만 기다려주세요',
  'Workflow Intelligence': '워크플로우 인텔리전스',
  'CPU USE': 'CPU 사용량',
  'MEMORY': '메모리',
  'Workflow Engine': '워크플로우 엔진',
  'Process': '프로세스',
  'Canvas': '캔버스',
  'Step Details': '단계 상세',
  'Waiting...': '대기중...',
  'Rank': '순위',
  'Priority': '우선순위',
  'Task Name': '작업명',
  'Owner': '담당자',
  'Workflow System 2.0': '워크플로우 시스템 2.0',
  'Validation Required': '유효성 검사 필요',
  'Interactive Scheduling System': '대화형 스케줄링 시스템',
  'Intelligence Engine Visualization': '인텔리전스 엔진 시각화',
  'Analyzing Information...': '정보 분석 중...',
  'Global': '글로벌',
  'Intelligence': '인텔리전스',
  'Staff': '직원',
  'Delivered': '전달됨',
  'Transmission Log': '전송 로그',
  'Global Output Monitoring': '글로벌 출력 모니터링',
  'Compose Stream': '스트림 작성',
  'Authentication': '인증',
  'Core Protocol': '코어 프로토콜',
  'CANCEL': '취소',
  'Privacy': '프라이버시',
  'Encryption Core': '암호화 코어',
  'Last Commit': '마지막 커밋',
  'Legality Check': '합법성 검사',
  'Visibility': '가시성',
  'Availability': '가용성',
  'Real-time Directory Sync': '실시간 디렉토리 동기화',
  'Authorization Protocol': '권한 부여 프로토콜',
  'Active Privilege Matrix': '활성 권한 매트릭스',
  'Select Identity Entity from the Topology Stream to Begin Intelligence Sync': '인텔리전스 동기화를 시작하려면 토폴로지 스트림에서 엔터티를 선택하세요',
  'Identity': '아이덴티티',
  'Synchronization OK': '동기화 완료'
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

console.log('Extended translation modified ' + modifiedCount + ' files.');
