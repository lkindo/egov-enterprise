package egovframework.com.uss.olp.cns.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;


/**
 *
 * ?곷떞?댁슜??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovCnsltManageService {

    /**
	 * ?곷떞?댁슜 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	CnsltManageVO selectCnsltListDetail(CnsltManageVO vo) throws Exception;

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.(議고쉶?섎? ?섏젙)
	 * @param vo
	 * @exception Exception
	 */
    void updateCnsltInqireCo(CnsltManageVO vo) throws Exception;

    /**
	 * ?곷떞?댁슜 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    List<EgovMap> selectCnsltList(CnsltManageDefaultVO searchVO) throws Exception;

    /**
	 * ?곷떞?댁슜 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    int selectCnsltListTotCnt(CnsltManageDefaultVO searchVO);

	/**
	 * ?곷떞?댁슜 湲???깅줉?쒕떎.
	 * @param vo - ?깅줉???뺣낫媛 ?닿릿 CnsltManageVO
	 * @exception Exception
	 */
    void insertCnsltDtls(CnsltManageVO vo) throws Exception;

    /**
	 * ?묒꽦鍮꾨?踰덊샇瑜??뺤씤?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 * @exception
	 */
    int selectCnsltPasswordConfirmCnt(CnsltManageVO vo);

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void updateCnsltDtls(CnsltManageVO vo) throws Exception;

	/**
	 * ?곷떞?댁슜 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void deleteCnsltDtls(CnsltManageVO vo) throws Exception;


    /**
	 * ?곷떞?듬? 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	CnsltManageVO selectCnsltAnswerListDetail(CnsltManageVO vo) throws Exception;


    /**
	 * ?곷떞?듬? 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    List<EgovMap> selectCnsltAnswerList(CnsltManageDefaultVO searchVO) throws Exception;

    /**
	 * ?곷떞?듬? 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 * @exception
	 */
    int selectCnsltAnswerListTotCnt(CnsltManageDefaultVO searchVO);

	/**
	 * ?곷떞?듬? 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void updateCnsltDtlsAnswer(CnsltManageVO vo) throws Exception;



}
