**
 *  Class Name : EgovXMLDoc.java
 *  Description : XML?뚯씪???뚯떛?섏뿬 援ъ“泥??뺥깭濡?諛섑솚 ?먮뒗 援ъ“泥??뺥깭???곗씠?곕? XML?뚯씪濡???ν븯??Business Interface class
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.02.03    諛뺤???         理쒖큹 ?앹꽦
 *   2022.11.11    源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2024.10.29		LeeBaekHaeng	遺덊븘???뺣????쒓굅 (SndngMailDocument.Factory.parse(xmlFile);)
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 *  @since 2009. 02. 03
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 */
package egovframework.com.utl.sim.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Result;
import javax.xml.transform.Source;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.apache.commons.io.FilenameUtils;
import org.apache.xmlbeans.XmlOptions;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.Text;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import noNamespace.SndngMailDocument;

public class EgovXMLDoc {

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	static final String ACCESS_EXTERNAL_DTD = "http://jakarta.xml.XMLConstants/property/accessExternalDTD";
	static final String ACCESS_EXTERNAL_STYLESHEET = "http://jakarta.xml.XMLConstants/property/accessExternalStylesheet";
	static final String EXTERNAL_GENERAL_ENTITIES = "http://xml.org/sax/features/external-general-entities";
	static final String EXTERNAL_PARAMETER_ENTITIES = "http://xml.org/sax/features/external-parameter-entities";

	/**
	 * XML?뚯씪???뚯떛?섏뿬 硫붿씪諛쒖넚 ?대옒???꾩쓽)???댁슜???댁븘 諛섑솚
	 * @param file XML?뚯씪
	 * @return SndngMailDocument mailDoc 硫붿씪諛쒖넚 ?대옒??XML?ㅽ궎留덈? ?듯빐 ?앹꽦???먮컮?대옒??
	 */
	public static SndngMailDocument getXMLToClass(String file) throws Exception {
		FileInputStream fis = null;
		SndngMailDocument mailDoc = null;

		String storePathString = EgovProperties.getProperty("Globals.fileStorePath");
		try {
			File xmlFile = new File(storePathString,FilenameUtils.getName(file));
			if (xmlFile.exists() && xmlFile.isFile()) {
				fis = new FileInputStream(xmlFile);
				mailDoc = SndngMailDocument.Factory.parse(xmlFile);

			}
		} finally {
			EgovResourceCloseHelper.close(fis);
		}

		return mailDoc;
	}

	/**
	 * XML?곗씠?곕? XML?뚯씪濡????
	 * @param mailDoc ?ъ슜???꾩쓽 ?대옒??XML?ㅽ궎留덈? ?듯빐 ?앹꽦???먮컮?대옒??
	 * @param file ??λ맆 ?뚯씪
	 * @return boolean ??μ뿬遺 True / False
	 */
	public static boolean getClassToXML(SndngMailDocument mailDoc, String file) throws Exception {
		boolean result = false;

		FileOutputStream fos = null;
		String storePathString = EgovProperties.getProperty("Globals.fileStorePath");

		try {
			file = EgovFileTool.createNewFile(storePathString,FilenameUtils.getName(file));
			File xmlFile = new File(storePathString,FilenameUtils.getName(file));
			fos = new FileOutputStream(xmlFile);

			XmlOptions xmlOptions = new XmlOptions();
			xmlOptions.setSavePrettyPrint();
			xmlOptions.setSavePrettyPrintIndent(4);
			xmlOptions.setCharacterEncoding("UTF-8");
			String xmlStr = mailDoc.xmlText(xmlOptions);
			fos.write(xmlStr.getBytes(StandardCharsets.UTF_8));
			result = true;

		} finally {
			EgovResourceCloseHelper.close(fos);
		}

		return result;
	}

	/**
	 * XML ?뚯씪???뚯떛?섏뿬 ?곗씠?곕? 議곗옉?????덈뒗 Document 媛앹껜瑜?諛섑솚
	 * @param xml XML?뚯씪
	 * @return Document document 臾몄꽌媛앹껜
	 */
	public static Document getXMLDocument(String xml) throws Exception {
		Document xmlDoc = null;
		FileInputStream fis = null;
		String storePathString = EgovProperties.getProperty("Globals.fileStorePath");

		try {
			File srcFile = new File(storePathString,FilenameUtils.getName(xml));
			if (srcFile.exists() && srcFile.isFile()) {
				fis = new FileInputStream(srcFile);
				DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
				factory.setNamespaceAware(true);
				factory.setFeature(EgovXMLConstants.FEATURE_SECURE_PROCESSING, true);
				factory.setFeature(EXTERNAL_GENERAL_ENTITIES, false);
				factory.setFeature(EXTERNAL_PARAMETER_ENTITIES, false);
				factory.setAttribute(ACCESS_EXTERNAL_DTD, "");
				factory.setAttribute(ACCESS_EXTERNAL_STYLESHEET, "");
				factory.setExpandEntityReferences(false);
				DocumentBuilder builder;
				builder = factory.newDocumentBuilder();
				xmlDoc = builder.parse(fis);
			}
		} finally {
			EgovResourceCloseHelper.close(fis);
		}

		return xmlDoc;
	}

	/**
	 * Document??理쒖긽??Element濡??대룞
	 * @param document XML?곗씠??
	 * @return Element root 猷⑦듃
	 */
	public static Element getRootElement(Document document) throws Exception {
		return document.getDocumentElement();
	}

	/**
	 * ?섏쐞???덈줈??Elemenet瑜??앹꽦
	 * @param document XML?곗씠??
	 * @param rt 異붽??좎쐞移?
	 * @param id ?앹꽦??Element??ID
	 * @return Element element 異붽???Element
	 */
	public static Element insertElement(Document document, Element rt, String id) throws Exception {
		Element child;
		Element root;

		if (rt == null) {
			root = getRootElement(document);
		} else {
			root = rt;
		}
		child = document.createElement(id);
		root.appendChild(child);

		return child;
	}

	/**
	 * ?섏쐞??臾몄옄?댁쓣 媛吏???덈줈??Elemenet瑜??앹꽦
	 * @param document XML?곗씠??
	 * @param rt 異붽? ?꾩튂
	 * @param id ?앹꽦??Element??ID
	 * @param text Element ?섏쐞???ㅼ뼱媛?臾몄옄??
	 * @return Element element 異붽???Element
	 */
	public static Element insertElement(Document document, Element rt, String id, String text) throws Exception {
		Element echild;
		Text tchild;
		Element root;

		if (rt == null) {
			root = getRootElement(document);
		} else {
			root = rt;
		}
		echild = document.createElement(id);
		root.appendChild(echild);
		tchild = document.createTextNode(text);
		echild.appendChild(tchild);

		return echild;
	}

	/**
	 * ?섏쐞??臾몄옄?댁쓣 異붽?
	 * @param document XML?곗씠??
	 * @param rt 異붽? ?꾩튂
	 * @param text Element ?섏쐞???ㅼ뼱媛?臾몄옄??
	 * @return Element element 異붽???Element
	 */
	public static Text insertText(Document document, Element rt, String text) throws Exception {
		Text tchild;
		Element root;

		if (rt == null) {
			root = getRootElement(document);
		} else {
			root = rt;
		}
		tchild = document.createTextNode(text);
		root.appendChild(tchild);

		return tchild;
	}

	/**
	 * 留덉?留됱쑝濡??낅젰?섏뿀嫄곕굹 李몄“??XML Node???곸쐞 Element瑜?由ы꽩
	 * @param current ?꾩옱?몃뱶
	 * @return Element parent ?곸쐞?몃뱶
	 */
	public static Element getParentNode(Element current) throws Exception {
		Node parent = current.getParentNode();
		return (Element) parent;
	}

	/**
	 * Document 媛앹껜瑜?XML?뚯씪濡????
	 * @param document 臾몄꽌媛앹껜
	 * @param file ??λ맆 ?뚯씪
	 * @return boolean ??μ뿬遺 True / False
	 */
	public static boolean getXMLFile(Document document, String file) throws Exception {
		boolean retVal = false;
		String storePathString = EgovProperties.getProperty("Globals.fileStorePath");

		File srcFile = new File(storePathString,FilenameUtils.getName(file));
		if (srcFile.exists() && srcFile.isFile()) {
			Source source = new DOMSource(document);
			Result result = new StreamResult(srcFile);
			TransformerFactory factory = TransformerFactory.newInstance();
			factory.setFeature(EgovXMLConstants.FEATURE_SECURE_PROCESSING, true);
			factory.setAttribute(ACCESS_EXTERNAL_DTD, "");
			factory.setAttribute(ACCESS_EXTERNAL_STYLESHEET, "");
			Transformer transformer = factory.newTransformer();
			transformer.setOutputProperty(OutputKeys.INDENT, "yes");
			transformer.setOutputProperty(OutputKeys.METHOD, "xml");
			transformer.setOutputProperty(OutputKeys.INDENT, "yes");
			transformer.transform(source, result);
		}

		return retVal;
	}

}
