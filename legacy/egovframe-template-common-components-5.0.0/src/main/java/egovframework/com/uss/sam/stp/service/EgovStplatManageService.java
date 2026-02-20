package egovframework.com.uss.sam.stp.service;

import java.util.List;

/**
 *
 * ?쎄??댁슜??泥섎━?섎뒗 ?쒕퉬???대옒??
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
 *   2016.06.13  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
public interface EgovStplatManageService {

    /**
	 * ?쎄??뺣낫 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	StplatManageVO selectStplatDetail(StplatManageVO vo) throws Exception;

    /**
	 * ?쎄??뺣낫 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    List<StplatManageVO> selectStplatList(StplatManageDefaultVO searchVO) throws Exception;

    /**
	 * ?쎄??뺣낫 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    int selectStplatListTotCnt(StplatManageDefaultVO searchVO);

	/**
	 * ?쎄??뺣낫 湲???깅줉?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void insertStplatCn(StplatManageVO vo) throws Exception;


	/**
	 * ?쎄??뺣낫 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void updateStplatCn(StplatManageVO vo) throws Exception;

	/**
	 * ?쎄??뺣낫 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    void deleteStplatCn(StplatManageVO vo) throws Exception;


}
