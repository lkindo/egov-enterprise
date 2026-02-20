package egovframework.com.sym.prm.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?꾨줈洹몃옩愿由ъ뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *
 * </pre>
 */

public interface EgovProgrmManageService {
	/**
	 * ?꾨줈洹몃옩 ?곸꽭?뺣낫瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return ProgrmManageVO
	 * @exception Exception
	 */
	ProgrmManageVO selectProgrm(ProgrmManageVO vo) throws Exception;
	
	/**
     * ?꾨줈洹몃옩 紐⑸줉??議고쉶
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     */
    List<ProgrmManageVO> selectProgrmList(ComDefaultVO vo) throws Exception;
    
	/**
	 * ?꾨줈洹몃옩紐⑸줉 珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception;
	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜??깅줉
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	void insertProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜??섏젙
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	void updateProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩 ?뺣낫瑜???젣
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	void deleteProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩 ?뚯씪 議댁옱?щ?瑜?議고쉶
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO  ?꾨줈洹몃옩蹂寃쎌슂泥?由ъ뒪??
	 * @exception Exception
	 */
	ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception;
	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?ぉ濡?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?깅줉
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쓣 ??젣
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥??붿껌踰덊샇MAX ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由?紐⑸줉??議고쉶
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由щぉ濡?珥앷굔?섎? 議고쉶?쒕떎.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?쿂由щ? ?섏젙
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?붾㈃??議고쉶??硫붾돱 紐⑸줉 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedProgrmFileNmForDel String
	 * @exception Exception
	 */
	void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception;

	/**
	 * ?꾨줈洹몃옩蹂寃쎌슂泥?옄 Email ?뺣낫瑜?議고쉶
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO  ?꾨줈洹몃옩蹂寃쎌슂泥?由ъ뒪??
	 * @exception Exception
	 */
	ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception;

}