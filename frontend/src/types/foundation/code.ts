import { CmmnClCode, CmmnCode, CmmnDetailCode } from './system';

export interface CodeDetail extends CmmnDetailCode {
    // UI 전용 또는 확장 필드
}

export interface GroupCode extends CmmnCode {
    details: CodeDetail[];
}

export interface DomainCluster extends CmmnClCode {
    id: string; // clCode alias or normalized id
    name: string; // clCodeNm alias
    groups: GroupCode[];
}
