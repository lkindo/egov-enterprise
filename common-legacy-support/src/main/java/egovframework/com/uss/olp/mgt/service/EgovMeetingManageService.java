package egovframework.com.uss.olp.mgt.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?????? ??? ? Service ? Class
 * @author ?????????
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ???         ????
 *
 * </pre>
 **/
public interface EgovMeetingManageService {

    /**
	 * ????????.
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> egovMeetingManageLisAuthorGroupPopup(ComDefaultVO searchVO) throws Exception;
    /**
	 * ????????.
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> egovMeetingManageLisEmpLyrPopup(ComDefaultVO searchVO) throws Exception;
    /**
	 * ???? ?????.
	 * @param searchVO - ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectMeetingManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ???????????.
	 * @param MeetingManageVO - ???? ??? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectMeetingManageDetail(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ???????? ?????.
	 * @param searchVO - ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectMeetingManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?????????.
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void  insertMeetingManage(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ??????????.
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void  updateMeetingManage(MeetingManageVO meetingManageVO) throws Exception;

    /**
	 * ???????????.
	 * @param searchVO - ???? ?? VO
	 * @throws Exception
	 **/
	void  deleteMeetingManage(MeetingManageVO meetingManageVO) throws Exception;


}
