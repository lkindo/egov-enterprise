import { describe, expect, it } from 'vitest';
import { navigateToDownload } from '../full-result-download';

/**
 * jsdom 의 `window.location` 은 [LegacyUnforgeable] — `assign` 이 인스턴스의
 * non-configurable own property 라 spy/재정의가 불가능하다(실측: descriptor
 * configurable=false, writable=false). 그래서 spy 대신 jsdom 이 실제로 구현하는
 * 해시 내비게이션("Not implemented: navigation (**except hash changes**)")으로
 * 인자가 location.assign 에 그대로 도달해 내비게이션이 일어나는 것을 검증한다.
 * 소비자 배선(URL 구성·상한 가드)은 log-clients.contract.test.tsx 가 모듈 경계
 * mock 으로 검증한다.
 */
describe('navigateToDownload', () => {
  it('주어진 URL 로 window.location 내비게이션을 실제로 수행한다', () => {
    navigateToDownload('#full-result-download-probe');

    expect(window.location.hash).toBe('#full-result-download-probe');
  });
});
