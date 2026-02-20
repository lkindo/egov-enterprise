package egovframework.com.utl.sys.trm.service.impl;

import java.security.SecureRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngChecker;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngResult;

/**
 * ?≪닔?좊え?덊꽣留곸쓣 ?꾪븳 Check interface ?덉젣 援ы쁽?대옒??
 * 
 * @author 源吏꾨쭔
 * @since 2010.08.16
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.16  源吏꾨쭔          理쒖큹 ?앹꽦
 *	 2025.09.06  ?댁꽑洹?         2025??而⑦듃由щ럭??硫섑넗留?PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *      </pre>
 */

public class TrsmrcvMntrngCheckerTestImpl implements TrsmrcvMntrngChecker {

	private static final Logger LOGGER = LoggerFactory.getLogger(TrsmrcvMntrngCheckerTestImpl.class);
	private static SecureRandom oRandom = new SecureRandom(); // 221115 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?섑뻾?쒕떎.
	 *
	 * ?곌퀎ID瑜??댁슜?섏뿬 ?곌퀎湲곌?怨??듭떊???꾩슂???뺣낫瑜??살? ?ㅼ쓬 ?곌퀎湲곌?怨??듭떊???섑뻾?쒕떎.
	 * ?듭떊寃곌낵瑜?TrsmrcvMntrngResult ?대옒??媛앹껜???댁븘??由ы꽩?쒕떎.
	 *
	 * ?듭떊寃곌낵媛 true?쇰븣 : TrsmrcvMntrngResult??nrmltAt??true, cause??null?????
	 * ?듭떊寃곌낵媛 false?쇰븣: TrsmrcvMntrngResult??nrmltAt??false, cause???먮윭?먯씤 Exception????ν븳??
	 *
	 *
	 * @return 紐⑤땲?곕쭅寃곌낵
	 *
	 * @param cntcId 紐⑤땲?곕쭅 ????곌퀎ID
	 *
	 */
	@Override
	public TrsmrcvMntrngResult check(String cntcId) {
		Boolean b = oRandom.nextBoolean();
		TrsmrcvMntrngResult result = null;

		if (b) {
			result = new TrsmrcvMntrngResult(b, null);
		} else {
			result = new TrsmrcvMntrngResult(b, new UnsupportedOperationException("?≪닔?좎깦?똂heck?대옒?ㅼ뿉??諛쒖깮??Exception?낅땲??"));
		}
		LOGGER.debug("result cause : {}", result.getCause());
		return result;
	}
}
