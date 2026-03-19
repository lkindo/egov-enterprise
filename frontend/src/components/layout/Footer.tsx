'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
 return (
 <div className="footer">
 <div className="inner">
 <h1>
 <Link href="/">
 <Image src="/api/v1/images/logo_footer.png" alt="표준프레임워크 포털 eGovFrame" width={150} height={40} />
 </Link>
 </h1>

 <div className="mid">
 <address>
 대표문의메일 : egovframesupport@gmail.com | 대표전화 : 0000-0000 (000-0000-0000)<br />
 호환성확인 : 000-0000-0000 | 교육문의 : 000-0000-0000
 </address>
 <p className="copy">Copyright © 2021 Ministry Of The Interior And Safety. All Rights Reserved.</p>
 </div>

 <div className="right_col">
 <a href="#"><Image src="/api/v1/images/banner01.png" alt="행정안전부" width={120} height={40} /></a>
 <a href="#"><Image src="/api/v1/images/banner02.png" alt="NIA 한국지능정보사회진흥원" width={120} height={40} /></a>
 </div>
 </div>
 </div>
 );
};

export default Footer;
