export interface AdministrationWord {
  administWordId?: string;
  administWordNm: string;
  administWordEngNm?: string;
  administWordAbrv?: string;
  themaRelm?: string;
  wordDomn?: string;
  stdWord?: string;
  administWordDf?: string;
  administWordDc?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface Hpcm {
  hpcmId?: string;
  hpcmSeCode: string;
  hpcmDf: string;
  hpcmDc: string;
  createdBy?: string;
  createdDate?: string;
}

export interface OnlineManual {
  mnlId?: string;
  mnlNm: string;
  mnlDc: string;
  createdBy?: string;
  createdDate?: string;
}

export interface WordDicary {
  wordId?: string;
  wordNm: string;
  engNm: string;
  wordDf: string;
  wordDc: string;
  createdBy?: string;
  createdDate?: string;
}

export interface HelpSearchParams {
  keyword?: string;
  page?: number;
  size?: number;
}
