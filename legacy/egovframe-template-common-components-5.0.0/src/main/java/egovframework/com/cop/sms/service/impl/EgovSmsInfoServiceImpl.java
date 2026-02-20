package egovframework.com.cop.sms.service.impl;

import java.text.ParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cop.sms.service.EgovSmsInfoService;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsConnection;
import egovframework.com.cop.sms.service.SmsRecptn;
import egovframework.com.cop.sms.service.SmsVO;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;

/**
 * 臾몄옄硫붿떆吏瑜??꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovSmsInfoService")
public class EgovSmsInfoServiceImpl extends EgovAbstractServiceImpl implements EgovSmsInfoService {
    @Resource(name="SmsDAO")
    private SmsDAO smsDao;

    @Resource(name="egovSmsIdGnrService")
    private EgovIdGnrService idgenService;

    private String smeConfigPath = null;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovSmsInfoServiceImpl.class);

    @PostConstruct
    public void init() {
	//--------------------------------
	// ?띿꽦 ?뺣낫 ?산린
	//--------------------------------
    	this.smeConfigPath = EgovProperties.getPathProperty("Globals.SMEConfigPath");
    }

    private String getPhoneNumber(String number) {
	String result = number;

	if (number == null || number.trim().equals("")) {
	    return "";
	}

	result = result.replace("-", "");
	result = result.replace("(", "");
	result = result.replace(")", "");
	result = result.replace(" ", "");

	return result;
    }

    private String formatPhoneNumber(String number) throws ParseException {
	if (number == null || number.trim().equals("")) {
	    return "";
	}

	StringBuffer buffer = new StringBuffer();


	if (number.length() == 9) {	// 02-500-1234 ?뺤떇
	    buffer.append(number.substring(0, 2));
	    buffer.append("-");
	    buffer.append(number.substring(2, 2+3));
	    buffer.append("-");
	    buffer.append(number.substring(2+3, 2+3+4));

	} else if (number.length() == 10) {
	    if (number.startsWith("02")) {	// 02-5000-1234 ?뺤떇
		buffer.append(number.substring(0, 2));
		buffer.append("-");
		buffer.append(number.substring(2, 2 + 4));
		buffer.append("-");
		buffer.append(number.substring(2 + 4, 2 + 4 + 4));

	    } else {				// 031-500-1234 ?뺤떇
		buffer.append(number.substring(0, 3));
		buffer.append("-");
		buffer.append(number.substring(3, 3 + 3));
		buffer.append("-");
		buffer.append(number.substring(3 + 3, 3 + 3 + 4));
	    }

	} else if (number.length() == 11) {	// 031-5000-1234 ?뺤떇
	    buffer.append(number.substring(0, 3));
	    buffer.append("-");
	    buffer.append(number.substring(3, 3+4));
	    buffer.append("-");
	    buffer.append(number.substring(3+4,3+4+4));

	} else if (number.length() == 12) {	// 0505-5000-1234 ?뺤떇
	    buffer.append(number.substring(0, 4));
	    buffer.append("-");
	    buffer.append(number.substring(4, 4+4));
	    buffer.append("-");
	    buffer.append(number.substring(4+4, 4+4+4));

	} else {
	    return number;
	}

	return buffer.toString();
    }

    /**
     * 臾몄옄硫붿떆吏 紐⑸줉??議고쉶 ?쒕떎.
     */
    @Override
	public Map<String, Object> selectSmsInfs(SmsVO searchVO) throws Exception {
	List<SmsVO> result = smsDao.selectSmsInfs(searchVO);
	int cnt = smsDao.selectSmsInfsCnt(searchVO);

	// ?꾪솕踰덊샇 ?щ㎎ 泥섎━
	for (SmsVO element : result) {
	    String phone = element.getTrnsmitTelno();
	    element.setTrnsmitTelno(formatPhoneNumber(phone));
	}

	Map<String, Object> map = new HashMap<>();

	map.put("resultList", result);
	map.put("resultCnt", Integer.toString(cnt));

	return map;
    }

    /**
     * 臾몄옄硫붿떆吏瑜??꾩넚(?깅줉)?쒕떎.
     */
    @Override
	public void insertSmsInf(Sms sms) throws Exception {
	HashMap<String, SmsRecptn> check = new HashMap<>();

	String smsId = idgenService.getNextStringId();

	sms.setSmsId(smsId);

	sms.setTrnsmitTelno(getPhoneNumber(sms.getTrnsmitTelno()));

	//---------------------------------------
	// 留덉뒪???뺣낫 ?깅줉
	//---------------------------------------
	smsDao.insertSmsInf(sms);

	//---------------------------------------
	// ?꾩넚 ?붿껌 諛??곸꽭(?섏떊???뺣낫 ?깅줉
	//---------------------------------------
	SmsRecptn smsRecptn = null;
		if (sms != null && sms.getRecptnTelno() != null) {
			for (int i = 0; i < sms.getRecptnTelno().length; i++) {
				if (getPhoneNumber(sms.getRecptnTelno()[i]).equals("")) {
					continue;
				}
				smsRecptn = new SmsRecptn();

				smsRecptn.setSmsId(smsId);
				smsRecptn
						.setRecptnTelno(getPhoneNumber(sms.getRecptnTelno()[i]));

				// ?숈씪 ?꾪솕踰덊샇硫?SKIP
				if (check.containsKey(smsRecptn.getRecptnTelno())) {
					continue;
				} else {
					check.put(smsRecptn.getRecptnTelno(), smsRecptn);
				}

				// ---------------------------------------
				// ???꾩넚 ?붿껌 ???
				// ---------------------------------------
				SmsConnection smsConn = new SmsConnection();

				smsConn.setCallFrom(sms.getTrnsmitTelno());
				smsConn.setCallTo(smsRecptn.getRecptnTelno());
				smsConn.setCallBack(smsRecptn.getRecptnTelno());
				smsConn.setCallBackUrl("");
				smsConn.setText(sms.getTrnsmitCn());

				smsConn.setMessageId(smsId + "-" + smsRecptn.getRecptnTelno());

				// SMS ?꾩넚 ?붿껌
				EgovSmsInfoSender sender = null;
				SmsConnection result = null;
				try {
					sender = new EgovSmsInfoSender(smeConfigPath);

					sender.open();
					result = sender.send(smsConn);
				} finally {
					if (sender != null) {
						sender.close();
					}
				}
				// //-------------------------------------

				// Sender???꾩넚 寃곌낵??SMS G/W 泥섎━ ?곸쓽 寃곌낵留?由ы꽩??
				// ?대룞?듭떊?ъ쓽 ?ㅻ쪟??蹂꾨룄??Receiver?먯꽌 ?섏떊 泥섎━??
				// ?섏떊 泥섎━??MessageId??援ъ꽦 ?뺤떇(SMS_ID + "-" + ?섏떊?꾪솕踰덊샇)瑜??듯빐 DB??寃곌낵瑜?諛섏쁺

				// 2011.10.21 蹂댁븞?먭? ?꾩냽議곗튂
				if (result != null) {
					smsRecptn
							.setResultCode(Integer.toString(result.getResult()));
					smsRecptn.setResultMssage(result.getResultMessage());
				}
				smsDao.insertSmsRecptnInf(smsRecptn);
			}
		}
	}

    /**
     * 臾몄옄硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     */
    @Override
	public SmsVO selectSmsInf(SmsVO searchVO) throws Exception {
	SmsVO vo = smsDao.selectSmsInf(searchVO);

	// ?꾪솕踰덊샇 ?щ㎎ 泥섎━
	vo.setTrnsmitTelno(formatPhoneNumber(vo.getTrnsmitTelno()));

	SmsRecptn recptn = new SmsRecptn();

	recptn.setSmsId(searchVO.getSmsId());

	List<SmsRecptn> list = smsDao.selectSmsRecptnInfs(recptn);

	// ?꾪솕踰덊샇 ?щ㎎ 泥섎━
	for (SmsRecptn element : list) {
	    String phone = element.getRecptnTelno();
	    element.setRecptnTelno(formatPhoneNumber(phone));
	}

	vo.setRecptn(list);

	return vo;
    }

    /**
     * 臾몄옄硫붿떆吏 ???꾩넚???붿껌?쒕떎.
     */
    @Override
	public SmsConnection sendRequsest(SmsConnection smsConn) throws Exception {
	String callTo = smsConn.getCallTo();
	String callFrom = smsConn.getCallFrom();
	String callBack = smsConn.getCallBack();
	String callBackUrl = smsConn.getCallBackUrl();
	String text = smsConn.getText();
	String messageId = smsConn.getMessageId();	// messageId 吏???꾩슂

	LOGGER.info("------------------------");
	LOGGER.info("callTo = {}", callTo);
	LOGGER.info("callFrom = {}", callFrom);
	LOGGER.info("callBack = {}", callBack);
	LOGGER.info("callBackUrl = {}", callBackUrl);
	LOGGER.info("text = {}", text);
	LOGGER.info("messageId = {}", messageId);

	// SMS ?꾩넚 ?붿껌
	EgovSmsInfoSender sender = null;
	SmsConnection result = null;
	try {
	    sender = new EgovSmsInfoSender(smeConfigPath);

	    sender.open();
	    result = sender.send(smsConn);
	} finally {
	    if (sender != null) {
		sender.close();
	    }
	}

	// Sender???꾩넚 寃곌낵??SMS G/W 泥섎━ ?곸쓽 寃곌낵留?由ы꽩??
	// ?대룞?듭떊?ъ쓽 ?ㅻ쪟??蹂꾨룄??Receiver?먯꽌 ?섏떊 泥섎━??(濡쒓렇 湲곕줉)

	if (result != null) {  // 2011.10.21 蹂댁븞?먭? ?꾩냽議곗튂
		smsConn.setResult(result.getResult());
		smsConn.setResultMessage(result.getResultMessage());
	}
	return smsConn;
    }

    /**
     * ?щ윭 嫄댁쓽 臾몄옄硫붿떆吏 ???꾩넚???붿껌?쒕떎.
     *
     * @param smsConn
     * @return
     * @throws Exception
     */
    @Override
	public SmsConnection[] sendRequsest(SmsConnection[] smsConn) throws Exception {
	EgovSmsInfoSender sender = null;

	try {
	    sender = new EgovSmsInfoSender(smeConfigPath);

	    sender.open();

	    // SMS ?꾩넚 ?붿껌
	    SmsConnection result = null;
	    for (int i = 0; i < smsConn.length; i++) {
		String callTo = smsConn[i].getCallTo();
		String callFrom = smsConn[i].getCallFrom();
		String callBack = smsConn[i].getCallBack();
		String callBackUrl = smsConn[i].getCallBackUrl();
		String text = smsConn[i].getText();
		String messageId = smsConn[i].getMessageId();	// messageId 吏???꾩슂

		LOGGER.info("------------------------");
		LOGGER.info("callTo[{}] = {}", i, callTo);
		LOGGER.info("callFrom[{}] = {}", i, callFrom);
		LOGGER.info("callBack[{}] = {}", i, callBack);
		LOGGER.info("callBackUrl[{}] = {}", i, callBackUrl);
		LOGGER.info("text =[{}] = {}", i, text);
		LOGGER.info("messageId[{}] = {}", i, messageId);

		//smsConn[i] = sendRequsest(smsConn[i]);
		result = sender.send(smsConn[i]);

		// Sender???꾩넚 寃곌낵??SMS G/W 泥섎━ ?곸쓽 寃곌낵留?由ы꽩??
		// ?대룞?듭떊?ъ쓽 ?ㅻ쪟??蹂꾨룄??Receiver?먯꽌 ?섏떊 泥섎━??(濡쒓렇 湲곕줉)

		smsConn[i].setResult(result.getResult());
		smsConn[i].setResultMessage(result.getResultMessage());
	    }

	} finally {
	    if (sender != null) {
		sender.close();
	    }
	}

	return smsConn;
    }
}
