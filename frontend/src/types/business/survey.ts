export interface Survey {
  qestnrId: string;
  qestnrSj: string;
  qestnrPurps: string;
  qestnrWritngGuidanceCn: string;
  qestnrTrget: string;
  qestnrBeginDe: string;
  qestnrEndDe: string;
  qestnrTmplatId?: string;
  createdBy?: string;
  createdDate: string;
}

export interface SurveyQuestion {
  qestnrQesitmId: string;
  qestnrId: string;
  qestnSn: number;
  qestnTyCode: string;
  qestnCn: string;
  mxmmChoiseCo: number;
  qestnrTmplatId: string;
  createdBy: string;
  createdDate: string;
  items: SurveyAnswer[];
}

export interface SurveyAnswer {
  qustnrIemId: string;
  qestnrQesitmId: string;
  qestnrId: string;
  iemSn: number;
  iemCn: string;
  etcAnswerAt: string;
  qestnrTmplatId: string;
  createdBy: string;
  createdDate: string;
}

export interface SurveyResultStats {
  iemCn: string;
  count: number;
  percentage: number;
}

export interface QustnrRespondInfo {
  qestnrQesrspnsId: string;
  qestnrId: string;
  qestnrQesitmId: string;
  qestnrTmplatId: string;
  qustnrIemId: string;
  respondAnswerCn: string;
  respondNm: string;
  etcAnswerCn: string;
  createdBy: string;
  createdDate: string;
}

export interface QustnrRespondInfoVO {
  qustnrRespondInfo: QustnrRespondInfo;
  answers: SurveyAnswer[];
  pageNo?: number;
  pageIndex?: number;
  size?: number;
  respondNm?: string;
}
