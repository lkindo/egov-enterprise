
/** AddressBookUserDto (백엔드 business-suite) 필드와 1:1 매핑 */
export interface NameCard {
 adbkMbrSn?: number;
 adbkSn?: number;
 /** 연결된 사용자 ID — 서버 소유이며 요청에 싣지 않는다. 손으로 적는 구성원은 없다(DIP B5 F8). */
 userId?: string;
 nm: string;        // 이름
 emlAddr: string;
 homeTelno?: string;
 mblTelno?: string;
 ofcTelno?: string;
 faxNo?: string;
}

