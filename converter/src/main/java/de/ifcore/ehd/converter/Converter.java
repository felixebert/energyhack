package de.ifcore.ehd.converter;

import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.util.Arrays;
import java.util.List;

import net.sf.json.JSON;
import net.sf.json.xml.XMLSerializer;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.text.StrBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class Converter
{
	private static List<String> districts = Arrays.asList("Pankow", "Lichtenberg", "Marzahn-Hellersdorf",
			"Treptow-Koepenick", "Neukoelln", "Friedrichshain-Kreuzberg", "Mitte", "Tempelhof-Schöneberg",
			"Steglitz-Zehlendorf", "Charlottenburg-Wilmersdorf", "Reinickendorf", "Spandau");

	public static void main(String[] args) throws MalformedURLException, IOException
	{
		StrBuilder json = new StrBuilder();
		for (String district : districts)
		{
			String jsonOfDistrict = requestOneDistrict(district);
			json.appendSeparator(",").append(jsonOfDistrict);
		}

		String result = "[" + json.toString() + "]";
		writeData(result, args[0]);
	}

	private static String requestOneDistrict(String district) throws IOException, MalformedURLException,
			UnsupportedEncodingException
	{
		String url = "https://www.vattenfall.de/SmeterEngine/networkcontrol";
		String charset = "UTF-8";
		String query = "<smeterengine><scale>DAY</scale><city>BERLIN</city><district name='"
				+ district
				+ "'><time_period begin=\"2013-06-15 12:00:00\" end=\"2013-06-15 19:29:59\" time_zone='CET'/></district></smeterengine>";

		URLConnection urlConnection = new URL(url).openConnection();
		urlConnection.setUseCaches(false);
		urlConnection.setDoOutput(true);
		urlConnection.setRequestProperty("accept-charset", charset);
		urlConnection.setRequestProperty("content-type", "text/xml");

		OutputStreamWriter writer = null;
		try
		{
			writer = new OutputStreamWriter(urlConnection.getOutputStream(), charset);
			writer.write(query);
		}
		finally
		{
			if (writer != null)
				try
				{
					writer.close();
				}
				catch (IOException logOrIgnore)
				{
				}
		}

		InputStream result = urlConnection.getInputStream();
		String resultString = IOUtils.toString(result);

		XMLSerializer xmlSerializer = new XMLSerializer();
		JSON json = xmlSerializer.read(resultString);
		return json.toString(2);
	}

	public static void writeData(String data, String filename) throws JsonProcessingException, IOException
	{
		ObjectMapper objectMapper = new ObjectMapper();
		FileWriter fw = new FileWriter(filename);
		fw.write(data);
		fw.flush();
		fw.close();
	}
}
