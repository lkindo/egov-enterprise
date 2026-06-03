export interface Hpcm {
 hlpId?: string;
 hlpSeCd: string;
 hlpDfn: string;
 hlpExpln: string;
 frstRgtrId?: string;
 crtDt?: string;
}

export interface OnlineManual {
 onlnMnlId?: string;
 onlnMnlNm: string;
 onlnMnlSeCd?: string;
 onlnMnlDfn?: string;
 onlnMnlExpln: string;
 frstRgtrId?: string;
 crtDt?: string;
}

export interface HelpSearchParams {
 keyword?: string;
 page?: number;
 size?: number;
}
