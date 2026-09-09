import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  operationAdminService,
  type ExternalHrCreateInput,
} from '@/services/foundation/operation/OperationAdminService';
import { createExternalHrOperation } from '@/types/generated-operations';
import { smsAdminService } from '@/services/foundation/operation/SmsAdminService';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import { manualAdminService } from '@/services/foundation/user/ManualAdminService';
import { deptAuthorityAdminService } from '../DeptAuthorityAdminService';
import { policyAdminService } from '../PolicyAdminService';
import { userAuthorityAdminService } from '../UserAuthorityAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

describe('foundation ordinary generated boundary wave4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(null));
  });

  it.each([undefined, null])('survey optional descriptions and dates may be %s without hiding the whole list', async (empty) => {
    const survey = { srvySn: 7, srvyTtl: '제목만 작성한 설문', srvyTmpltSn: 1 };
    const response = { ...survey, srvyPrps: empty, srvyWrtGdCn: empty, srvyTrgt: empty,
      srvyBgngYmd: empty, srvyEndYmd: empty, frstRgtrId: empty, crtDt: empty };
    client.getRaw.mockResolvedValueOnce(success({ list: [response], total: 1, page: 0, size: 10, totalPage: 1 }));
    const page = await surveyAdminService.getSurveys({ page: 0, size: 10 });
    expect(page).toMatchObject({
      list: [{ ...survey, srvyPrps: '', srvyWrtGdCn: '', srvyTrgt: '', srvyBgngYmd: '', srvyEndYmd: '', crtDt: '' }],
      total: 1,
    });
    expect(page.list[0]).not.toHaveProperty('frstRgtrId');
  });

  it('survey response still rejects missing identity and malformed optional text', async () => {
    for (const survey of [
      { srvyTtl: 'missing id', srvyTmpltSn: 1 },
      { srvySn: 7, srvyTtl: 'bad text', srvyTmpltSn: 1, srvyPrps: 123 },
    ]) {
      client.getRaw.mockResolvedValueOnce(success({ list: [survey], total: 1, page: 0, size: 10, totalPage: 1 }));
      await expect(surveyAdminService.getSurveys({ page: 0, size: 10 })).rejects.toThrow();
    }
  });

  it('operation external HR list uses its exact generated query', async () => {
    const page = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(operationAdminService.getExternalHrList({ name: 'Kim', page: 0, size: 10 }))
      .resolves.toStrictEqual(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/operation/external-hr', {
      params: { name: 'Kim', page: 0, size: 10 },
    });
  });

  it('operation mutations and reward list use their exact generated descriptors', async () => {
    const externalHr = { evntSn: 1, otsdHrId: 'OUTSIDE_1', otsdHrNm: 'Kim' };
    const reward = { rwrdSn: 2, rwardNm: 'Award' };
    const page = { list: [reward], total: 1, page: 0, size: 10, totalPage: 1 };
    client.requestRaw
      .mockResolvedValueOnce(success(externalHr))
      .mockResolvedValueOnce(success(reward));
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(operationAdminService.createExternalHr(externalHr)).resolves.toStrictEqual(externalHr);
    await expect(operationAdminService.getRewardList({ name: 'Award', page: 0, size: 10 }))
      .resolves.toStrictEqual(page);
    await expect(operationAdminService.createReward(reward)).resolves.toStrictEqual(reward);

    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'admin/operation/external-hr',
      method: 'post',
      data: externalHr,
    });
    expect(client.getRaw).toHaveBeenCalledWith('admin/operation/rewards', {
      params: { name: 'Award', page: 0, size: 10 },
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'admin/operation/rewards',
      method: 'post',
      data: reward,
    });
  });

  it('external HR creation rejects all server-owned audit fields before transport', async () => {
    type ServerOwnedAuditField = Extract<
      keyof ExternalHrCreateInput,
      'crtDt' | 'frstRgtrId' | 'mdfcnDt' | 'lastMdfrId'
    >;
    expectTypeOf<ServerOwnedAuditField>().toEqualTypeOf<never>();
    expectTypeOf<Parameters<typeof operationAdminService.createExternalHr>[0]>()
      .toEqualTypeOf<ExternalHrCreateInput>();

    expect(createExternalHrOperation.requestForbiddenPaths).toStrictEqual([
      ['crtDt'],
      ['frstRgtrId'],
      ['mdfcnDt'],
      ['lastMdfrId'],
    ]);

    for (const field of ['crtDt', 'frstRgtrId', 'mdfcnDt', 'lastMdfrId']) {
      await expect(operationAdminService.createExternalHr({
        evntSn: 1,
        otsdHrId: 'OUTSIDE_1',
        [field]: 'forged-audit-value',
      } as never)).rejects.toThrow('생성 API 요청에 허용되지 않은 필드가 있습니다.');
    }
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('SMS send exposes the generated numeric response directly', async () => {
    client.requestRaw.mockResolvedValueOnce(success(17));
    const body = {
      sndngTelno: '0212345678',
      sndngCn: 'generated SMS',
      recipients: [{ rcptnTelno: '01012345678' }],
    };

    await expect(smsAdminService.sendSms(body)).resolves.toBe(17);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/operation/sms',
      method: 'post',
      data: body,
    });
  });

  it('policy update uses the generated type path and void response', async () => {
    const body = { plcyTtl: 'Privacy', plcyCn: 'Contents' };
    await policyAdminService.updatePolicy('PRIVACY', body);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/policies/PRIVACY',
      method: 'put',
      data: body,
    });
  });

  it('user authority delete keeps identifiers in the generated DELETE body', async () => {
    await userAuthorityAdminService.deleteUserAuthorities(['USER_1']);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/user-authorities',
      method: 'delete',
      data: ['USER_1'],
    });
  });

  it('department authority batch uses its exact generated request', async () => {
    const body = { deptId: 'DEPT_1', authrtId: 'ROLE_ADMIN', allMembers: true };
    await deptAuthorityAdminService.updateDeptAuthorities(body);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/dept-authorities/batch',
      method: 'post',
      data: body,
    });
  });

  it('manual creation returns the generated numeric identifier', async () => {
    client.requestRaw.mockResolvedValueOnce(success(31));
    const body = {
      onlnMnlNm: 'Guide',
      onlnMnlSeCd: 'GNR',
      onlnMnlDfn: '/guide',
      onlnMnlExpln: 'Guide contents',
    };

    await expect(manualAdminService.createManual(body)).resolves.toBe(31);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'help/manuals',
      method: 'post',
      data: body,
    });
  });

  /*
    [2026-09-08 PD-MYPG-001] 마이페이지 콘텐츠 경계 계약 2건을 걷었다 — 그 API·서비스·화면을
    함께 제거했기 때문이다. tb_indv_pg_conts 는 시드도 생성 경로도 없고, 무엇보다 **그 값을 읽는
    화면이 없다**(대시보드 위젯 SPI 구현 2개가 이 값을 쓰지 않는다) — 켜고 꺼도 어디에도
    나타나지 않으므로 소비처를 먼저 정하기로 했다. 엔티티·테이블은 남는다.
  */


  it('survey response submission uses the exact generated path and response', async () => {
    client.requestRaw.mockResolvedValueOnce(success(55));
    const body = {
      rspnsNm: 'respondent',
      answers: [{ srvyQstnSn: 1, srvyArtclSn: 2, rspdntAnsCn: 'answer' }],
    };

    await expect(surveyAdminService.submitAnswers(7, body)).resolves.toBe(55);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'surveys/7/responses',
      method: 'post',
      data: body,
    });
  });

  it('survey read operations use exact paths and preserve their public adapters', async () => {
    const survey = {
      srvySn: 7,
      srvyTtl: 'Service survey',
      srvyPrps: 'Quality',
      srvyWrtGdCn: 'Choose one',
      srvyTrgt: 'Users',
      srvyBgngYmd: '20260801',
      srvyEndYmd: '20260831',
      srvyTmpltSn: 1,
      crtDt: '2026-08-01T00:00:00Z',
    };
    const question = {
      srvyQstnSn: 10,
      srvySn: 7,
      qstnSn: 1,
      qstnTypeCd: '1',
      qstnCn: 'Satisfied?',
      maxChcCnt: 1,
      srvyTmpltSn: 1,
      frstRgtrId: 'admin',
      crtDt: '2026-08-01T00:00:00Z',
      items: [{
        srvyArtclSn: 20,
        srvyQstnSn: 10,
        srvySn: 7,
        artclSn: 1,
        artclCn: 'Yes',
        etcAnsYn: 'N',
        srvyTmpltSn: 1,
        frstRgtrId: 'admin',
        crtDt: '2026-08-01T00:00:00Z',
      }],
    };
    const stats = [{
      srvyQstnSn: 10,
      qstnCn: 'Satisfied?',
      qstnTypeCd: '1',
      srvyArtclSn: 20,
      artclCn: 'Yes',
      count: 3,
      percentage: 100,
    }];
    const page = { list: [survey], total: 1, page: 0, size: 10, totalPage: 1 };
    client.getRaw
      .mockResolvedValueOnce(success(page))
      .mockResolvedValueOnce(success(survey))
      .mockResolvedValueOnce(success([question]))
      .mockResolvedValueOnce(success(stats));

    await expect(surveyAdminService.getSurveys({ page: 0, size: 10, keyword: 'service' }))
      .resolves.toStrictEqual(page);
    await expect(surveyAdminService.getSurvey(7)).resolves.toStrictEqual(survey);
    await expect(surveyAdminService.getQuestions(7)).resolves.toStrictEqual([question]);
    await expect(surveyAdminService.getStats(7)).resolves.toStrictEqual(stats);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'surveys', {
      params: { page: 0, size: 10, keyword: 'service' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'surveys/7', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(3, 'surveys/7/questions', undefined);
    expect(client.getRaw).toHaveBeenNthCalledWith(4, 'surveys/7/stats', undefined);
  });
});
