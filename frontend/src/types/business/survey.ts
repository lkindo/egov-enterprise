export interface Survey {
  srvyId: string;
  srvyTtl: string;
  srvyPrps: string;
  srvyWrtGdCn: string;
  srvyTrgt: string;
  srvyBgngYmd: string;
  srvyEndYmd: string;
  srvyTmpltId?: string;
  frstRgtrId?: string;
  crtDt: string;
}

export interface SurveyQuestion {
  srvyQstnId: string;
  srvyId: string;
  qstnSn: number;
  qstnTypeCd: string;
  qstnCn: string;
  maxChcCnt: number;
  srvyTmpltId: string;
  frstRgtrId: string;
  crtDt: string;
  items: SurveyAnswer[];
}

export interface SurveyAnswer {
  srvyArtclId: string;
  srvyQstnId: string;
  srvyId: string;
  artclSn: number;
  artclCn: string;
  etcAnsYn: string;
  srvyTmpltId: string;
  frstRgtrId: string;
  crtDt: string;
}

export interface SurveyResultStats {
  artclCn: string;
  count: number;
  percentage: number;
}

export interface QustnrRespondInfo {
  srvyRspnsId: string;
  srvyId: string;
  srvyQstnId: string;
  srvyTmpltId: string;
  srvyArtclId: string;
  rspdntAnsCn: string;
  rspnsNm: string;
  etcAnsCn: string;
  frstRgtrId: string;
  crtDt: string;
  srvyTtl?: string; // Optionally included in detail responses
}

export interface QustnrRespondInfoVO {
  qustnrRespondInfo: QustnrRespondInfo;
  answers: SurveyAnswer[];
  pageNo?: number;
  pageIndex?: number;
  size?: number;
  respondNm?: string;
}
