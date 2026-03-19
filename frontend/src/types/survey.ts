export interface Survey {
 qestnrId: string;
 qestnrSj: string;
 qestnrPurps: string;
 qestnrWritngGuidanceCn: string;
 qestnrTrget: string;
 qestnrBgnde: string;
 qestnrEndde: string;
 frstRegisterNm?: string;
 createdDate: string;
 status: 'OPEN' | 'CLOSED' | 'UPCOMING';
}

export interface SurveyQuestion {
 qestnrQesitmId: string;
 qestnCn: string;
 qestnTyCode: string; // 1: 객관식, 2: 주관식
 mxmmChoiseCo: number;
}

export interface SurveyAnswer {
 qustnrIemId: string;
 iemCn: string;
 etcAnswerAt: string;
}

export interface SurveyResultStats {
 iemCn: string;
 count: number;
 percentage: number;
}

export interface QustnrRespondInfo {
 respondId: string;
 qestnrId: string;
 qestnrQesitmId: string;
 respondNm: string;
 respondDe: string;
 respondCn?: string;
 respondAnswerCn?: string;
 etcAnswerCn?: string;
 frstRegisterPnttm?: string;
}

export interface QustnrRespondInfoVO {
 qustnrRespondInfo: QustnrRespondInfo;
 answers: SurveyAnswer[];
 page번호?: number;
 size?: number;
 respondNm?: string;
}
