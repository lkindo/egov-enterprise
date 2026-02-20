package egovframework.com.uss.olp.mgt.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?뚯쓽愿由щ? 泥섎━?섍린 ?꾪븳 Service 援ы쁽 Class
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovMeetingManageService {

    /**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> egovMeetingManageLisAuthorGroupPopup(ComDefaultVO searchVO) throws Exception;
    /**
	 * ?꾩씠??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> egovMeetingManageLisEmpLyrPopup(ComDefaultVO searchVO) throws Exception;
    /**
	 * ?뚯쓽?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectMeetingManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?뚯쓽?뺣낫瑜??곸꽭議고쉶 ?쒕떎.
	 * @param MeetingManageVO - ?뚯쓽?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectMeetingManageDetail(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ?뚯쓽?뺣낫瑜?紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectMeetingManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?뚯쓽?뺣낫瑜??깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void  insertMeetingManage(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ?뚯쓽?뺣낫瑜??섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void  updateMeetingManage(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ?뚯쓽?뺣낫瑜???젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	void  deleteMeetingManage(MeetingManageVO meetingManageVO) throws Exception;


}
