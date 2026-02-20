package egovframework.com.cop.sms.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cop.sms.service.SmsConnection;
import x3.client.smeapi.SMEConnection;
import x3.client.smeapi.SMEConnectionFactory;
import x3.client.smeapi.SMEException;
import x3.client.smeapi.SMERequest;
import x3.client.smeapi.SMEResponse;
import x3.client.smeapi.SMESender;
import x3.client.smeapi.SMESession;
import x3.client.smeapi.impl.SMEConfig;
import x3.client.smeapi.impl.SMEConnectionFactoryImpl;
import x3.client.smeapi.impl.SMELogger;

/**
 * 臾몄옄硫붿떆吏 ?곕룞 泥섎━瑜??꾪븳 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.05
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.08.05  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class EgovSmsInfoSender {
    /** SMS ?쒕쾭 URL */
    private final String connString;	// ex) sme://000.000.000.000:20000
    /** SMS ?곌퀎 ID */
    private final String smsId;
    /** SMS ?곌퀎 password */
    private final String smsPwd;

    /** SMS G/W Connection Factory */
    private SMEConnectionFactory factSender = null;
    /** SMS G/W Connection */
    private SMEConnection connSender = null;
    /** SMS G/W Session */
    private SMESession sessSender = null;
    /** SMS G/W Sender */
    private SMESender sender = null;

    private static final Logger LOGGER = LoggerFactory.getLogger(EgovSmsInfoSender.class);

    /**
     * SMS ?곌퀎瑜??꾪븳 ?앹꽦??
     * SMEConfig ?ㅼ젙?뚯씪濡쒕????꾩슂???곌껐 ?뺣낫 諛?濡쒓렇 愿???뺣낫瑜??삳뒗??
     *
     * @param configFile
     * @throws Exception
     */
    public EgovSmsInfoSender(String configFile) throws Exception {
	SMEConfig.configSet(configFile);

	connString = SMEConfig.getSmsUrl();
	smsId = SMEConfig.getSmsId();
	smsPwd = SMEConfig.getSmsPwd();

	String tmp = null;

	tmp = SMEConfig.getLogLevel();
	if (tmp != null && !tmp.equals("")) {
		SMELogger.setLogLevel(tmp);
	}

	tmp = SMEConfig.getLogLayout();
	if (tmp != null && !tmp.equals("")) {
		SMELogger.setLogLayout(tmp);
	}

	tmp = SMEConfig.getLogPath();
	if (tmp != null && !tmp.equals("")) {
		SMELogger.setLogPath(tmp);
	}

	SMELogger.setUseConsoleLogger(SMEConfig.getUseConsoleLogger());
	SMELogger.setUseFileLogger(SMEConfig.getUseFileLogger());
    }

    /**
     * SMS ?곌껐???꾪븳 Connection 諛?Session ?앹꽦?쒕떎.
     * 諛쒖넚嫄댁씠 ?덉쓣 寃쎌슦留?open()???몄텧?섍퀬 close()瑜??몄텧?섏뿬 醫낅즺?쒕떎.
     * 留뚯빟 DB ? ?곕룞??select濡??곗씠? 寃異쒖떆 ?곗씠?媛 ?놁쑝硫?
     * open()???몄텧?섏? ?딅뒗?? (以묒슂!!! 瑗??곗씠?媛 ?덉쓣 寃쎌슦留?open() ???섏뿬 ?묒냽)
     *
     * @throws SMEException
     */
    public void open() throws SMEException {
	this.factSender = new SMEConnectionFactoryImpl(connString);
	this.connSender = factSender.createConnection(smsId, smsPwd); // ?꾩씠?붿? ?⑥뒪?뚮뱶?낅땲??
	this.sessSender = connSender.createSession();
	this.sender = sessSender.createSender();

	// ?꾩옱 諛쒖넚???몄뿉 ??댁꽌 由ы룷???섏떊???꾪빐?쒕뒗 true 濡??ㅼ젙?댁빞  由ы룷???섏떊???????덈떎.
	// 留뚯빟 false 濡??명똿?섍퀬 諛쒖넚???섎㈃ ?꾩옱 諛쒖넚???몄뿉 ??댁꽌??寃곌낵?섏떊???????녿떎.
	// 由ы룷?멸? ?꾩슂?녿뒗 湲곌??먯꽌???꾨옒 ?뷀뤃?멸컪??false瑜??좎??쒕떎.
	// false濡??ㅼ젙???섎㈃ 蹂대궡??硫붿떆吏????댁꽌 寃곌낵瑜??섏떊?????놁뒿?덈떎.
	// [2008-08-25] 由ы룷???섏떊 ?꾩닔議곌굔?쇰줈 蹂寃?
	// 由ы룷?몃뒗 ?꾩닔 ?섏떊?낅땲??
	this.sessSender.setReceiverCreated(true);
	this.connSender.start();
    }

    /**
     * SMS瑜??꾩넚?쒕떎.
     *
     * @param smsConn
     * @return
     */
    public SmsConnection send(SmsConnection smsConn) throws SMEException {
	SMERequest request = null;

	try {
	    request = sessSender.createRequest();
	    // destination
	    request.setTo(smsConn.getCallTo()); //?섏떊踰덊샇
	    // origination
	    request.setFrom(smsConn.getCallFrom()); //諛쒖떊踰덊샇
	    // callback
	    request.setCallback(smsConn.getCallBack()); //?뚯떊踰덊샇(肄쒕갚踰덊샇)

	    // callbackurl
	    // 臾댁꽑?명꽣??二쇱냼  ?대??꾪솕 ?명꽣??(WAP) ?섏씠吏 ?묒냽??URL
	    // ?⑤Ц?먮찓?몄? ?몄쓽 蹂꾨룄 怨쇨툑???섎?濡?WAP ?섏씠吏媛 ?덈뒗 湲곌??먯꽌留??ъ슜
	    // ?대떦 URL ?묒냽???섏떊?먯뿉寃?怨쇨툑???섎?濡?二쇱쓽.
	    request.setCallbackURL(smsConn.getCallBackUrl()); //CallbackURL? ?좏깮?ы빆 ?낅땲??

	    // message (硫붿꽭吏?댁슜)
	    request.setText(smsConn.getText());

	    // serial *MUST* be unique number in single SME.
	    // 諛섎뱶??硫붿떆吏 諛쒖넚???곗냽?섎뒗 ?쇰젴踰덊샇 ?뺤떇????怨좎쑀媛믪씠?댁빞 ??
	    // SMS G/W濡??꾩넚?꾩쟻 ?쇰젴踰덊샇
	    // ?? 'TestMessage-000000' ?レ옄 ?먮뒗 臾몄옄 + ?レ옄濡?議고빀 媛??( 40 byte )
	    // ?? '200808251259590001'
	    request.setMessageId(smsConn.getMessageId()); //?쇰젴踰덊샇 怨좎쑀媛?

	    sender = sessSender.createSender();
	    SMEResponse res = sender.send(request);
	    int nRes = res.getResult();

	    smsConn.setResult(nRes);
	    //smsConn.setResultMessage("");

	    switch (nRes) {
	    case 0:
		smsConn.setResultMessage("");
		break;
	    case 3000:
		smsConn.setResultMessage("李⑸컻??踰덊샇 ?щ㎎ ?ㅻ쪟 ?먮뒗 遺??);
		break;
	    case 3001:
		smsConn.setResultMessage("肄쒕갚踰덊샇 ?щ㎎ ?ㅻ쪟");
		break;
	    case 3002:
		smsConn.setResultMessage("MessageID ?щ㎎ ?ㅻ쪟 ?먮뒗 遺??);
		break;
	    case 3003:
		smsConn.setResultMessage("Text 諛?Callback URL ?щ㎎ ?ㅻ쪟");
		break;
	    case 4005:
		smsConn.setResultMessage("SMG Server ?ㅽ뙵 硫붿떆吏濡?泥섎━ 嫄곕???);
		break;
	    case 5000:
		smsConn.setResultMessage("SMG Server ?대? ?먮윭 (?몄쬆?ㅽ뙣,?곌껐?ㅽ뙣)");
		break;
	    default:
		smsConn.setResultMessage("?????녿뒗 ?ㅻ쪟 諛쒖깮");
	    }

	} catch (SMEException ex) {
	    throw ex;
	}

	return smsConn;
    }

    /**
     * SMS ?곌껐???꾪븳 Connection 諛?Session ?댁젣?쒕떎.
     * 硫붿떆吏 泥섎━ ?꾩넚??諛섎뱶??醫낅즺?댁빞 ?쒕떎.
     */
    public void close() {
	try {
	    if (sender != null) {
			sender.close();
		}
	} catch (SMEException ignore) {
		LOGGER.debug(ignore.getMessage());
	}

	try {
	    if (sessSender != null) {
			sessSender.close();
		}
	} catch (SMEException ignore) {
		LOGGER.debug(ignore.getMessage());
	}

	try {
	    if (connSender != null) {
			connSender.close();
		}
	} catch (SMEException ignore) {
		LOGGER.debug(ignore.getMessage());
	}
    }
}
