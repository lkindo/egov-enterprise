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

export interface HelpSearchParams {
 keyword?: string;
 page?: number;
 size?: number;
}
