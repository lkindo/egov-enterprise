package egovframework.com.cop.adb.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.adb.service.AddressBook;
import egovframework.com.cop.adb.service.AddressBookUser;
import egovframework.com.cop.adb.service.AddressBookUserVO;
import egovframework.com.cop.adb.service.AddressBookVO;
import egovframework.com.cop.adb.service.EgovAddressBookService;
import jakarta.annotation.Resource;

/**
 * 二쇱냼濡앹젙蹂대? 愿由ы븯湲??꾪븳 ?쒕퉬??援ы쁽  ?대옒??
 * @author 怨듯넻而댄룷?뚰듃? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.9.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2016.12.13 理쒕몢??         ?대옒?ㅻ챸 蹂寃?
 *
 * </pre>
 */
@Service("EgovAdressBookService")
public class EgovAddressBookServiceImpl extends EgovAbstractServiceImpl implements EgovAddressBookService{


    @Resource(name = "AdressBookDAO")
    private AddressBookDAO adbkDAO;

    @Resource(name = "egovAdbkIdGnrService")
    private EgovIdGnrService idgenService;

    @Resource(name = "egovAdbkUserIdGnrService")
    private EgovIdGnrService idgenService2;

    /**
     * 二쇱냼濡?紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookVO
     * @return  Map<String, Object>
     * @exception Exception
     */
    @Override
	public Map<String, Object> selectAdressBookList(AddressBookVO adbkVO) throws Exception {

        List<AddressBookVO> result = adbkDAO.selectAdressBookList(adbkVO);

        int cnt = adbkDAO.selectAdressBookListCnt(adbkVO);

        Map<String, Object> map = new HashMap<>();

        map.put("resultList", result);
        map.put("resultCnt", Integer.toString(cnt));

        return map;
    }

    /**
     * 二쇱냼濡??뺣낫瑜?議고쉶?쒕떎.
     * @param AddressBookVO
     * @return  AdressBookVO
     * @exception Exception
     */
    @Override
	public AddressBookVO selectAdressBook(AddressBookVO addressBookVO)throws Exception {

        AddressBookVO adbkVO = adbkDAO.selectAdressBook(addressBookVO);

        if(adbkVO != null) {
        	adbkVO.setAdbkMan(adbkDAO.selectUserList(adbkVO));
        }

        return  adbkVO;
    }

    /**
     * 二쇱냼濡??뺣낫瑜???젣?쒕떎.
     * @param AddressBook
     * @return
     * @exception Exception
     */
    @Override
	public void deleteAdressBook(AddressBook addressBook) throws Exception {
        adbkDAO.updateAdressBook(addressBook);
    }

    /**
     * ?ъ슜??紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    @Override
	public Map<String, Object> selectManList(AddressBookUserVO addressBookUserVO) throws Exception{

        List<AddressBookUserVO> result = adbkDAO.selectManList(addressBookUserVO);
        int cnt = adbkDAO.selectManListCnt(addressBookUserVO);

        Map<String, Object> map = new HashMap<>();

        map.put("resultList", result);
        map.put("resultCnt", Integer.toString(cnt));

        return map;
    }

    /**
     * 紐낇븿 紐⑸줉??議고쉶?쒕떎.
     * @param AddressBookUserVO
     * @return Map<String, Object>
     * @exception Exception
     */
    @Override
	public Map<String, Object> selectCardList(AddressBookUserVO addressBookUserVO) throws Exception {

        List<AddressBookUserVO> result = adbkDAO.selectCardList(addressBookUserVO);
        int cnt = adbkDAO.selectCardListCnt(addressBookUserVO);

        Map<String, Object> map = new HashMap<>();

        map.put("resultList", result);
        map.put("resultCnt", Integer.toString(cnt));

        return map;
    }

    /**
     * 二쇱냼濡??뺣낫瑜??깅줉?쒕떎.
     * @param AddressBookVO
     * @return M
     * @exception Exception
     */
    @Override
	public void insertAdressBook(AddressBookVO adbkVO) throws Exception {

        adbkVO.setAdbkId(idgenService.getNextStringId());
        adbkVO.setUseAt("Y");

        adbkDAO.insertAdressBook(adbkVO);

        for (AddressBookUser element : adbkVO.getAdbkMan()) {
            element.setAdbkUserId(idgenService2.getNextStringId());
            element.setAdbkId(adbkVO.getAdbkId());
            adbkDAO.insertAdressBookUser(element);
        }
    }

    /**
     * 二쇱냼濡??뺣낫瑜??섏젙?쒕떎.
     * @param AddressBookVO
     * @return
     * @exception Exception
     */
    @Override
	public void updateAdressBook(AddressBookVO adbkVO) throws Exception {

        adbkDAO.updateAdressBook(adbkVO);

        List<AddressBookUser> temp = adbkDAO.selectUserList(adbkVO);


        for (AddressBookUser element : temp) {
            if(element.getEmplyrId() == null) {
				element.setEmplyrId("");
			}

            if(element.getNcrdId() == null){
                element.setNcrdId("");
            }else{
            	element.setNcrdId(element.getNcrdId().trim());
            }
        }

        for (AddressBookUser element : adbkVO.getAdbkMan()) {
            if(element.getEmplyrId() == null) {
				element.setEmplyrId("");
			}

            if(element.getNcrdId() == null){
                element.setNcrdId("");
            }else{
            	element.setNcrdId(element.getNcrdId().trim());
            }
        }


        for (AddressBookUser element : adbkVO.getAdbkMan()) {

            boolean check = false;

            for (AddressBookUser element2 : temp) {
                if(element.getEmplyrId().equals(element2.getEmplyrId())  &&
                        element.getNcrdId().equals(element2.getNcrdId()) ) {
                    check = true;
                    break;
                }
            }
            if(!check){
                element.setAdbkUserId(idgenService2.getNextStringId());
                element.setAdbkId(adbkVO.getAdbkId());
                adbkDAO.insertAdressBookUser(element);
            }
        }

        for (AddressBookUser element : temp) {

            boolean check = false;

            for (AddressBookUser element2 : adbkVO.getAdbkMan()) {
                if(element.getEmplyrId().equals(element2.getEmplyrId())  &&
                        element.getNcrdId().equals(element2.getNcrdId()) ) {
                    check = true;
                    break;
                }
            }
            if(!check){
                adbkDAO.deleteAdressBookUser(element);
            }
        }
    }

    /**
     * 二쇱냼濡?援ъ꽦???뺣낫瑜?遺덈윭?⑤떎.
     * @param String
     * @return
     * @exception Exception
     */
    @Override
	public AddressBookUser selectAdbkUser(String id)
            throws Exception {

        AddressBookUser adbkUser = new AddressBookUser();

        if(id.length() > 4 && id.substring(0,4).equals("NCRD") ){
            adbkUser = adbkDAO.selectCardUser(id);
        }else{
            adbkUser = adbkDAO.selectManUser(id);
        }

        return adbkUser;
    }
}
