import { statfsSync } from 'node:fs';

/*
 * 생성 전 환경 점검(설계서 14장·19장, E5). 생성은 Docker·Java 21·Node.js 22·pnpm 과 작업 트리를 쓰는데,
 * 무엇이 빠졌는지 몇 분 뒤 실패로 알게 되면 산출물 잔재만 남는다. 점검은 그 전에 사실만 말한다.
 * 명령 출력 원문은 내보내지 않는다. 판정에 쓴 버전 번호와 개수만 싣는다.
 *
 * 상태: pass(문제 없음), warn(확인하고 진행할 수 있음), block(해결하기 전에는 생성할 수 없음).
 * 생성기 서버의 PATH·JAVA_HOME 은 서버를 시작할 때 고정되고 생성도 같은 환경을 쓴다. 그래서 도구를 새로
 * 설치했거나 JAVA_HOME 을 바꿨다면 다시 점검이 아니라 생성기를 다시 시작해야 한다고 말한다.
 */

export const PREFLIGHT_IMAGE = 'postgres:17-alpine';
// 검증까지 마친 생성물 하나가 880MB(그중 frontend/node_modules 792MB, DB 번들 4MB)를 남겼다(2026-10-09 du 실측).
// 생성 중에는 빌드 산출물이 잠시 더 차지하므로 그 두 배를 차단 기준으로 둔다. Gradle·pnpm 캐시는 사용자 홈에 따로 쌓여 넣지 않는다.
export const DISK_BLOCK_BYTES = 2 * 1024 ** 3;
export const DISK_WARN_BYTES = 5 * 1024 ** 3;

const VERSION = /\b(\d+)(?:\.\d+){0,3}\b/;
const versionOf = text => {
  const match = VERSION.exec(text ?? '');
  return match ? { text: match[0], major: Number(match[1]) } : null;
};
const gib = bytes => `${(bytes / 1024 ** 3).toFixed(1)}GB`;
// gradlew.bat 처럼 JAVA_HOME 의 큰따옴표와 앞뒤 공백을 걷는다.
const javaHomeOf = value => (value ?? '').replaceAll('"', '').trim();

/**
 * `probe(command, args)` 는 명령의 표준 출력을 돌려주거나 실패로 거부한다(시간 제한은 호출자가 건다).
 * 실행 파일을 찾지 못한 실패는 `code: 'TOOL_UNAVAILABLE'` 로 온다.
 * `sourceCommit` 은 점검을 요청한 화면이 카탈로그를 받은 때의 원본 커밋이다.
 * `freeBytes` 는 출력 위치의 남은 공간을 돌려준다(테스트 이음새).
 */
export async function composerPreflight({ outputRoot, sourceCommit, probe, nodeVersion = process.versions.node,
  javaHome = process.env.JAVA_HOME, freeBytes = path => { const stats = statfsSync(path); return stats.bavail * stats.bsize; } }) {
  const attempt = async (command, args) => {
    try { return { ok: true, out: String(await probe(command, args)) }; }
    catch (error) { return { ok: false, out: '', missing: error?.code === 'TOOL_UNAVAILABLE' }; }
  };
  const home = javaHomeOf(javaHome);
  const [docker, java, javac, pnpm, status, head] = await Promise.all([
    attempt('docker', ['version', '--format', '{{.Server.Os}} {{.Server.Version}}']),
    attempt(home ? `${home}/bin/java` : 'java', ['--version']),
    attempt(home ? `${home}/bin/javac` : 'javac', ['--version']),
    attempt('pnpm', ['--version']),
    // 생성기는 무시되지 않은 새 파일을 하나씩 모두 복사하므로 새 폴더도 파일 단위로 센다. 점검은 인덱스를 잠그지 않는다.
    attempt('git', ['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all']),
    attempt('git', ['rev-parse', 'HEAD']),
  ]);
  const checks = [];
  const check = (id, status, label, extra = {}) => checks.push({ id, status, label, ...extra });

  const [dockerOs, dockerVersionText] = docker.ok ? docker.out.trim().split(/\s+/) : [];
  const dockerVersion = versionOf(dockerVersionText);
  const linuxDocker = dockerVersion && dockerOs === 'linux';
  if (linuxDocker) check('docker', 'pass', 'Docker 엔진이 응답합니다', { detail: dockerVersion.text });
  else if (dockerVersion) check('docker', 'block', 'Docker가 Windows 컨테이너 모드입니다. Linux 컨테이너로 전환한 뒤 다시 점검하세요.', { code: 'TOOL_UNAVAILABLE' });
  else if (docker.missing) check('docker', 'block', 'Docker를 찾지 못했습니다. Docker를 설치한 뒤 생성기를 다시 시작하세요.', { code: 'TOOL_UNAVAILABLE' });
  else check('docker', 'block', 'Docker 엔진에 연결할 수 없습니다. Docker를 시작하거나 접근 권한을 확인한 뒤 다시 점검하세요.', { code: 'TOOL_UNAVAILABLE' });

  // Gradle 은 JAVA_HOME(없으면 PATH)의 Java 로 돌고, 빌드는 이 컴퓨터에 설치된 JDK 21 툴체인을 찾아 쓴다.
  const javaVersion = java.ok ? versionOf(java.out.split(/\r?\n/)[0]) : null;
  if (javaVersion?.major === 21 && javac.ok) check('java', 'pass', 'Java 21', { detail: javaVersion.text });
  else if (javaVersion?.major === 21) {
    check('java', 'warn', 'Java 21은 있지만 JDK(javac)를 찾지 못했습니다. 빌드는 이 컴퓨터에 설치된 JDK 21을 찾아 쓰며, 없으면 실패합니다.', { detail: javaVersion.text });
  } else if (javaVersion && javaVersion.major >= 17) {
    check('java', 'warn', `Gradle을 실행하는 Java가 ${javaVersion.major}입니다. 빌드는 이 컴퓨터에 설치된 JDK 21을 찾아 쓰며, 없으면 실패합니다.`, { detail: javaVersion.text });
  } else check('java', 'block', 'Java 21을 찾지 못했습니다. JDK 21을 설치하고 JAVA_HOME을 맞춘 뒤 생성기를 다시 시작하세요.', { code: 'TOOL_UNAVAILABLE' });

  const nodeMajor = versionOf(nodeVersion);
  if (nodeMajor && nodeMajor.major >= 22) check('node', 'pass', 'Node.js 22 이상', { detail: nodeMajor.text });
  else check('node', 'block', `Node.js 22 이상이 필요합니다(지금 ${nodeMajor?.text ?? '알 수 없음'}). Node.js 22 이상으로 생성기를 다시 시작하세요.`, { code: 'TOOL_UNAVAILABLE' });

  const pnpmVersion = pnpm.ok ? versionOf(pnpm.out) : null;
  if (pnpmVersion && pnpmVersion.major >= 9) check('pnpm', 'pass', 'pnpm 9 이상', { detail: pnpmVersion.text });
  else check('pnpm', 'block', 'pnpm 9 이상을 찾지 못했습니다. pnpm을 설치한 뒤 생성기를 다시 시작하세요.', { code: 'TOOL_UNAVAILABLE' });

  // 이미지는 Linux 컨테이너 Docker 가 응답할 때만 볼 수 있다. 없어도 첫 생성이 내려받으므로 경고다.
  if (linuxDocker) {
    const image = await attempt('docker', ['image', 'inspect', '--format', '{{.Id}}', PREFLIGHT_IMAGE]);
    if (image.ok && image.out.trim()) check('image', 'pass', `${PREFLIGHT_IMAGE} 이미지가 있습니다`);
    else check('image', 'warn', `${PREFLIGHT_IMAGE} 이미지가 없습니다. 첫 생성 때 내려받습니다(네트워크 필요).`);
  }

  // 생성기는 작업 트리의 파일(무시되지 않은 새 파일 포함)을 그대로 복사한다.
  if (!status.ok) check('worktree', 'block', 'Git 작업 트리를 확인하지 못했습니다. 저장소 폴더에서 생성기를 실행하세요.');
  else {
    const changed = status.out.split(/\r?\n/).filter(line => line.trim()).length;
    if (changed) check('worktree', 'warn', `커밋되지 않은 변경 ${changed}개가 그대로 생성물에 들어갑니다.`);
    else check('worktree', 'pass', '커밋되지 않은 변경이 없습니다');
  }

  // 원본 비교는 점검을 요청한 화면의 커밋과 한다. 어느 쪽이든 알 수 없으면 생성도 원본을 결속하지 못하므로 막는다.
  const headCommit = head.ok && /^[a-f0-9]{40}$/.test(head.out.trim()) ? head.out.trim() : null;
  if (!headCommit || !sourceCommit) check('source', 'block', '원본 커밋을 확인하지 못했습니다. 기능 목록을 다시 불러온 뒤 다시 점검하세요.', { code: 'SOURCE_CHANGED' });
  else if (headCommit === sourceCommit) check('source', 'pass', '원본 커밋이 화면을 연 시점과 같습니다', { detail: headCommit.slice(0, 12) });
  else check('source', 'block', '원본이 새 커밋으로 바뀌었습니다. 기능 목록을 새 원본으로 다시 불러온 뒤 확인하세요.', { code: 'SOURCE_CHANGED' });

  // 출력 위치(저장소 build/)가 있는 드라이브만 잰다. Gradle·pnpm 캐시가 쓰는 사용자 홈은 따로다.
  let free = null;
  try { free = freeBytes(outputRoot); } catch { /* 알 수 없으면 아래에서 경고한다. */ }
  if (!Number.isFinite(free)) check('disk', 'warn', '출력 위치의 남은 공간을 확인하지 못했습니다.');
  else if (free < DISK_BLOCK_BYTES) check('disk', 'block', `출력 위치에 ${gib(free)}만 남았습니다. 생성에는 ${gib(DISK_BLOCK_BYTES)} 이상이 필요합니다.`);
  else if (free < DISK_WARN_BYTES) check('disk', 'warn', `출력 위치에 ${gib(free)} 남았습니다. 생성 하나가 약 1GB를 씁니다.`);
  else check('disk', 'pass', '출력 위치의 남은 공간이 충분합니다', { detail: gib(free) });

  return { checks, blocked: checks.some(item => item.status === 'block') };
}
