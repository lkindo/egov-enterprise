package egovframework.com.uss.cmt.service;

import java.util.List;

/**
 * 異쒗눜洹쇨?由ъ뿉 愿???명꽣?섏씠?ㅽ겢?섏뒪瑜??뺤쓽?쒕떎.
 * @author ?쒖??꾨젅?꾩썙??媛쒕컻?
 * @since 2014.08.29
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  ----------    --------    ---------------------------
 *  2014.08.29     媛쒕컻?       理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovCmtManageService {

	/**
	 * 異쒗눜洹쇱젙蹂?紐⑸줉 ?붾㈃??異쒕젰
	 * @param  DeptInfo (遺?쒕퀎 - optional) 寃?됱“嫄?
	 * @return List<CmtManageVO> ?낅Т?ъ슜??紐⑸줉?뺣낫
	 * @throws Exception
	 */
	public List<CmtManageVO> selectCmtInfoList(CmtDefaultVO cmtSearchVO) throws Exception;

	/**
	 * 異쒓렐?뺣낫 ?낅젰, ?붾컮?댁뒪瑜??듯빐 ?몃? ?곌퀎?낅젰媛??
	 * @param cmtManageVO瑜??깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	public String insertWrkStartCmtInfo(CmtManageVO cmtManageVO) throws Exception;

	/**
	 * ?닿렐?뺣낫 ?낅젰, ?붾컮?댁뒪瑜??듯빐 ?몃? ?곌퀎?낅젰媛??
	 * @param cmtManageVO瑜??깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	public int insertWrkEndCmtInfo(CmtManageVO cmtManageVO) throws Exception;

	/**
	 * ?닿렐 ?뺣낫 ?낅젰???꾪븳 wrktm id ?뺤씤
	 * @param cmtManageVO 寃?됱“嫄?
	 * @return 珥앹궗?⑹옄媛쒖닔(int)
	 * @throws Exception
	 */
	public String selectWrktmId(CmtManageVO cmtManageVO) throws Exception;

}
