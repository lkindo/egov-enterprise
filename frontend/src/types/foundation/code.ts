import { CmmnClCode, CmmnCode, CmmnDetailCode } from './system';

export type CodeDetail = CmmnDetailCode;

export interface GroupCode extends CmmnCode {
    details: CodeDetail[];
}

export interface DomainCluster extends CmmnClCode {
    id: string;
    name: string;
    groups: GroupCode[];
}
