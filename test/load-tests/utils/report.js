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
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/25058f7861695cb4fe6e0ecf6415ea489c489005/dist/bundle.js';

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
