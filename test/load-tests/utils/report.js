/**
 * k6 HTML 리포트 생성 유틸리티
 *
 * k6 테스트 결과를 HTML 리포트로 생성하는 공통 모듈입니다.
 *
 * @example
 * ```javascript
 * import { createHtmlReport, textSummary } from '../utils/report.js';
 *
 * export function handleSummary(data) {
 *   return {
 *     'results/report.html': createHtmlReport(data, { title: 'My Load Test' }),
 *     stdout: textSummary(data),
 *   };
 * }
 * ```
 */

import { textSummary as k6TextSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

/**
 * HTML 리포트 생성 옵션
 * @typedef {Object} ReportOptions
 * @property {string} [title='k6 Load Test Report'] - 리포트 제목
 * @property {string} [theme='dark'] - 테마 (dark, light, default)
 * @property {boolean} [showChart=true] - 차트 표시 여부
 */

/**
 * HTML 리포트를 생성합니다.
 * @param {Object} data - k6 테스트 결과 데이터
 * @param {ReportOptions} [options] - 리포트 생성 옵션
 * @returns {string} HTML 문자열
 */
export function createHtmlReport(data, options = {}) {
  const config = {
    title: options.title || 'k6 Load Test Report',
    theme: options.theme || 'dark',
    showChart: options.showChart !== false,
  };

  return htmlReport(data, config);
}

/**
 * 텍스트 요약을 생성합니다.
 * @param {Object} data - k6 테스트 결과 데이터
 * @param {Object} [options] - 텍스트 요약 옵션
 * @returns {string} 포맷팅된 텍스트 요약
 */
export function textSummary(data, options = {}) {
  return k6TextSummary(data, options);
}

/**
 * handleSummary 헬퍼 함수
 *
 * 이 함수를 k6 스크립트에 export 하면 자동으로 HTML 리포트가 생성됩니다.
 *
 * @param {string} outputDir - 리포트 저장 디렉토리 (기본값: 'test/load-tests/results')
 * @param {ReportOptions} [options] - 리포트 옵션
 * @returns {Function} handleSummary 함수
 *
 * @example
 * ```javascript
 * import { createHandleSummary } from '../utils/report.js';
 *
 * export const handleSummary = createHandleSummary('results', { title: 'My Test' });
 * ```
 */
export function createHandleSummary(outputDir = 'test/load-tests/results', options = {}) {
  return function (data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportFilename = `${outputDir}/report-${timestamp}.html`;

    return {
      [reportFilename]: createHtmlReport(data, options),
      stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
  };
}

export default {
  createHtmlReport,
  textSummary,
  createHandleSummary,
};
