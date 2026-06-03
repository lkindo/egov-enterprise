export interface AddressBook {
 adbkId: string;
 adbkNm: string;
 rlsScopeCd: string; // 공용, 개인
 frstRgtrId: string;
}

/** AddressBookUserDto (백엔드 business-suite) 필드와 1:1 매핑 */
export interface NameCard {
 adbkConstntId: string;
 adbkId: string;
 userId: string;    // 직원 ID (표시용)
 nm: string;        // 이름
 emlAddr: string;
 homeTelno?: string;
 mblTelno?: string;
 ofcTelno?: string;
 faxNo?: string;
}

export interface AddressBookUser {
 adbkConstntId: string;
 nm: string;
 emlAddr: string;
 mblTelno: string;
}
