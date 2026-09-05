import { describe, expect, it } from 'vitest';
import {
  describeSurveyAvailability,
  getSurveyStatus,
  isSurveyActive,
} from '../survey-status';

/**
 * 설문 기간 판정 — 서버(SurveyResultService.assertWithinPeriod)와 같은 규칙이어야 화면이 먼저 막고
 * 서버가 같은 이유로 거부한다. 규칙이 갈리면 사용자는 "제출 가능해 보이는데 거부되는" 경험을 한다.
 */
describe('survey-status', () => {
  const today = '20260905';

  it('시작일·종료일 당일을 포함해 진행중으로 본다', () => {
    expect(getSurveyStatus({ srvyBgngYmd: '20260905', srvyEndYmd: '20260905' }, today)).toBe('active');
    expect(getSurveyStatus({ srvyBgngYmd: '20260901', srvyEndYmd: '20260930' }, today)).toBe('active');
  });

  it('시작 전은 예정, 종료 후는 종료다', () => {
    expect(getSurveyStatus({ srvyBgngYmd: '20260906', srvyEndYmd: '20260930' }, today)).toBe('scheduled');
    expect(getSurveyStatus({ srvyBgngYmd: '20260801', srvyEndYmd: '20260904' }, today)).toBe('closed');
  });

  it('비어 있는 경계는 열린 것으로 본다 — 시작일 없음은 즉시, 종료일 없음은 무기한', () => {
    expect(getSurveyStatus({ srvyBgngYmd: null, srvyEndYmd: '20260930' }, today)).toBe('active');
    expect(getSurveyStatus({ srvyBgngYmd: '20260901', srvyEndYmd: undefined }, today)).toBe('active');
    expect(getSurveyStatus({}, today)).toBe('active');
    expect(getSurveyStatus({ srvyBgngYmd: ' ', srvyEndYmd: '' }, today)).toBe('active');
  });

  it('값이 있는데 8자리 날짜가 아니면 판정 불가이고, 판정 불가는 개방이 아니다', () => {
    expect(getSurveyStatus({ srvyBgngYmd: '2026-09-', srvyEndYmd: '20260930' }, today)).toBe('unknown');
    expect(isSurveyActive({ srvyBgngYmd: '2026-09-', srvyEndYmd: '20260930' }, today)).toBe(false);
  });

  it('안내 문구는 상태별로 다르고 진행중이면 없다', () => {
    expect(describeSurveyAvailability({ srvyBgngYmd: '20260901', srvyEndYmd: '20260930' }, today)).toBeNull();
    expect(describeSurveyAvailability({ srvyBgngYmd: '20260906' }, today))
      .toBe('아직 시작되지 않은 설문입니다. 2026-09-06부터 응답할 수 있습니다.');
    expect(describeSurveyAvailability({ srvyEndYmd: '20260904' }, today))
      .toContain('이미 종료된 설문입니다. (2026-09-04 종료)');
    expect(describeSurveyAvailability({ srvyBgngYmd: 'bad' }, today)).toContain('확인할 수 없어');
  });
});
