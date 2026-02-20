package egovframework.com.uss.olp.mgt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.mgt.service.EgovMeetingManageService;
import egovframework.com.uss.olp.mgt.service.MeetingManageVO;
import jakarta.annotation.Resource;
/**
 * ?뚯쓽愿由щ? 泥섎━?섍린 ?꾪븳 ServiceImpl 援ы쁽 Class
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
@Service("egovMeetingManageService")
public class EgovMeetingManageServiceImpl extends EgovAbstractServiceImpl implements EgovMeetingManageService{

	//final private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="meetingManageDao")
	private MeetingManageDao dao;

	@Resource(name="egovMgtIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> egovMeetingManageLisAuthorGroupPopup(ComDefaultVO searchVO){
		return dao.egovMeetingManageLisAuthorGroupPopup(searchVO);
	}

    /**
	 * ?꾩씠??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> egovMeetingManageLisEmpLyrPopup(ComDefaultVO searchVO){
		return dao.egovMeetingManageLisEmpLyrPopup(searchVO);
	}

    /**
	 * ?뚯쓽?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectMeetingManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectMeetingManageList(searchVO);
	}

    /**
	 * ?뚯쓽?뺣낫瑜??곸꽭議고쉶 ?쒕떎.
	 * @param MeetingManageVO - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectMeetingManageDetail(MeetingManageVO meetingManageVO) throws Exception{
		return dao.selectMeetingManageDetail(meetingManageVO);
	}

    /**
	 * ?뚯쓽?뺣낫瑜?紐⑸줉 ?꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectMeetingManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectMeetingManageListCnt(searchVO);
	}

    /**
	 * ?뚯쓽?뺣낫瑜??깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertMeetingManage(MeetingManageVO meetingManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();

		meetingManageVO.setMtgId(sMakeId);

		dao.insertMeetingManage(meetingManageVO);
	}

    /**
	 * ?뚯쓽?뺣낫瑜??섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateMeetingManage(MeetingManageVO meetingManageVO){
		dao.updateMeetingManage(meetingManageVO);
	}

    /**
	 * ?뚯쓽?뺣낫瑜???젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteMeetingManage(MeetingManageVO meetingManageVO){
		dao.deleteMeetingManage(meetingManageVO);
	}
}
