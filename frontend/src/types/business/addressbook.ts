export interface AddressBook {
 adbkId: string;
 adbkNm: string;
 othbcScope: string; // 공용, 개인
 frstRegisterId: string;
}

export interface NameCard {
 ncrdId: string;
 ncrdNm: string;
 cmpnyNm: string;
 deptNm: string;
 telNo: string;
 moblphonNo: string; // Aligned with backend moblphonNo
 emailAdres: string;
}

export interface AddressBookUser {
 ncrdId: string;
 nm: string;
 emailAdres: string;
 moblphonNo: string;
}
