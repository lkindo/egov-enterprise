export interface AddressBook {
 adbkId: string;
 adbkNm: string;
 rlsScopeCd: string; // 공용, 개인
 frstRegisterId: string;
}

/** AddressBookUserDto (백엔드 business-suite) 필드와 1:1 매핑 */
export interface NameCard {
 adbkUserId: string;
 adbkId: string;
 emplyrId: string;  // 직원 ID (표시용)
 nm: string;        // 이름
 emailAdres: string;
 homeTelno?: string;
 moblphonNo?: string;
 offmTelno?: string;
 fxnum?: string;
}

export interface AddressBookUser {
 ncrdId: string;
 nm: string;
 emailAdres: string;
 moblphonNo: string;
}
