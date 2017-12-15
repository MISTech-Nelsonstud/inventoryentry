using System;
using System.Collections.Generic;
using System.Web;
using System.Text;
using System.Xml;
using Microsoft.Win32;
using System.Collections;
using System.Collections.ObjectModel;
using System.Linq;
using System.Dynamic;
using System.Web.Script.Serialization;
using System.IO;
using CommonClasses;
using dbConnector2017;

namespace InventoryEntry
{
    public partial class ajaxpost : System.Web.UI.Page
    {  //***********************************************************************************//
        // Requires Reference to Extension System.Web.Helpers and Microsoft.CSharp           //
        //***********************************************************************************//


        private string appPath = "";
        private IDictionary<string, object> commandObj = null;
        private IDictionary<string, object> payload = null;
        private GenericResponse resp = null;
        private bool download = false;
        private string optionalData = "";
        private string action = "";
        protected void Page_Load(object sender, EventArgs e)
        {
            
            appPath = System.Reflection.Assembly.GetExecutingAssembly().CodeBase;
            appPath = appPath.Substring(8);
            appPath = appPath.Replace('/', '\\');
            appPath = appPath.Substring(0, appPath.LastIndexOf("\\"));
            appPath = appPath.Substring(0, appPath.LastIndexOf("\\"));
            if (!readRequest()) { return; }
            switch (commandObj["command"].ToString())
            {
                case "query":
                    runQuery();
                    return;
                case "fileupload":
                    fileupload();
                    return;
                case "downloadfile":
                    downloadFile();
                    return;
                case "fileList":
                    getFileList();
                    return;
                case "gridexcel":
                    gridExcel();
                    return;
                case "gridexcel2":
                    gridExcel2();
                    return;
                case "query2":
                    runUnsecureQuery();
                    return;
                default:
                    custom();
                    return;
            }
        }

        private void runQuery()
        {
            string sp = payload["sp"].ToString();
            bool noresult = Convert.ToBoolean(payload["noresult"]);
            string[] param = null;
            if (payload["parameters"] != null)
            {
                param = (payload["parameters"] as ArrayList).ToArray(typeof(string)) as string[];
            }
            SQLOutput res = null;
            if (noresult)
            {
                res = SQLServerQuery.noResultQuery(sp, param, "FASSQL2", "WebApps");
            }
            else
            {
                res = SQLServerQuery.Query(sp, param, "FASSQL2", "WebApps");
            }
            if (res.Error == "")
            {
                if (!noresult)
                {
                    resp.payload = res.JSON;
                }
            }
            else
            {
                resp.SetError(GenericResponse.errorLevels.SQLError);
            }
            
            sendResponse();
            Response.End();

        }
        private void runUnsecureQuery()
        {
            string sp = payload["sp"].ToString();
            bool noresult = Convert.ToBoolean(payload["noresult"]);
            string[] param = null;
            if (payload["parameters"] != null)
            {
                param = (payload["parameters"] as ArrayList).ToArray(typeof(string)) as string[];
            }
            SQLOutput res = null;
            if (noresult)
            {
                res = SQLServerQuery.noResultQuery(sp, param, "FASSQL2", "WebApps");
            }
            else
            {
                res = SQLServerQuery.Query(sp, param, "FASSQL2", "WebApps");
            }
            if (res.Error == "")
            {
                if (!noresult)
                {
                    resp.payload = res.JSON;
                }
            }
            else
            {
                resp.SetError(GenericResponse.errorLevels.SQLError);
            }

            
            sendResponse();
            Response.End();

        }
        #region fileupload
        private void fileupload()
        {
            doFileupload();
            sendResponse();
            Response.End();
        }
        private void doFileupload()
        {
            //int MaxFileSize = 5000000; //5MB is max size of uploaded files
            //place action function here in the format: if (action == [actionname]) { if (!actionfunction()){resp.SetError(); return resp;}}


            var postedFile = Request.Files[payload["controlid"].ToString()] as HttpPostedFile;
            if (postedFile == null)
            {
                resp.SetError(GenericResponse.errorLevels.fileNotInRequest);
                return;
            }

            //destinateion filename
            string destinationFileName = postedFile.FileName;
            if (destinationFileName.IndexOf("\\") >= 0) { destinationFileName = destinationFileName.Substring(destinationFileName.LastIndexOf("\\") + 1); }
            string overrideFileName = payload["destinationfilename"].ToString();
            if (overrideFileName != "") { destinationFileName = overrideFileName; }

            //destination path
            string destPath = payload["destinationpath"].ToString();
            if (destPath.Substring(0, 1) == "\\") { destPath = destPath.Substring(1); }
            destPath = Path.Combine(appPath, destPath);


            int count = 1;
            string filenameOnly = Path.GetFileNameWithoutExtension(destinationFileName);
            string extension = Path.GetExtension(destinationFileName);
            string path = Path.GetDirectoryName(destPath) + "\\" + Path.GetFileName(destPath);
            destPath += "\\" + destinationFileName;

            //if file exists then add filename(i)
            while (File.Exists(destPath))
            {
                string tempFileName = string.Format("{0}_{1}", filenameOnly, count++);
                destPath = Path.Combine(path, tempFileName + extension);

            }

            //check file size
            //if (postedFile.ContentLength > MaxFileSize)
            //{
            //    resp.SetError(GenericResponse.errorLevels.fileTooLarge);
            //    return;
            //}

            try
            {
                System.IO.Directory.CreateDirectory(path);
               // postedFile.SaveAs(destPath + "\\" + destinationFileName);
                postedFile.SaveAs(destPath);
                resp.filename = Path.GetFileName(destPath);
            }
            catch (Exception ex)
            {
                resp.SetError(GenericResponse.errorLevels.fileWriteError, ex.Message);
            }
            return;
        }

        #endregion

        #region download file
        private void downloadFile()
        {
            string pathandfile = payload["pathandfile"].ToString();
            string fullPath = (appPath + "\\" + pathandfile).Replace("/", "\\");
            if (!File.Exists(fullPath))
            {
                resp.SetError(GenericResponse.errorLevels.fileMissing);
                sendResponse();
                Response.End();
                return;
            }
            sendResponse();
            completeDownload(fullPath);
        }
        private void completeDownload(string fullPath)
        {
            var fi = new FileInfo(fullPath);
            string fileName = fi.Name;
            switch (fi.Extension)
            {
                case ".pdf":
                    Response.ContentType = "application/pdf";
                    Response.AppendHeader("content-disposition", "attachment; filename = " + fileName);
                    Response.WriteFile(fullPath);
                    Response.Flush();
                    Response.End();
                    return;
                case ".mp4":
                    Response.ContentType = "video/mp4";
                    Response.AppendHeader("content-disposition", "attachment; filename = " + fileName);
                    FileStream sourceFile = new FileStream(fullPath, FileMode.Open);
                    long fileSize = sourceFile.Length;
                    byte[] getContent = new byte[(int)fileSize];
                    sourceFile.Read(getContent, 0, (int)sourceFile.Length);
                    sourceFile.Close();
                    Response.BinaryWrite(getContent);
                    break;
            }
        }
        #endregion

        #region fileList
        private class OneFileItem
        {
            public string filename { get; set; }
            public string filetype { get; set; }
            public string filesize { get; set; }
            public string filedate { get; set; }
            public string urlpath { get; set; }
            public string frameheight { get; set; }
            public string framewidth { get; set; }
        }

        private void getFileList()
        {
            string parentFolder = appPath + "\\" + payload["parentfolder"].ToString();
            if (!Directory.Exists(parentFolder))
            {
                resp.SetError(GenericResponse.errorLevels.dirMissing);
                sendResponse();
                Response.End();
                return;
            }
            List<OneFileItem> filedata = new List<OneFileItem>();
            var di = new DirectoryInfo(parentFolder);
            crawlFile(di, ref filedata);
            var oSerializer = new System.Web.Script.Serialization.JavaScriptSerializer();
            resp.payload = oSerializer.Serialize(filedata).Replace("&", "&amp;");
            sendResponse();
            Response.End();
        }
        private void crawlFile(DirectoryInfo parentFolder, ref List<OneFileItem> filedata)
        {
            foreach (FileInfo fi in parentFolder.GetFiles(payload["extensionfilter"].ToString()))
            {
                string urlPath = fi.DirectoryName;
                if (urlPath.Length > (appPath + "\\" + payload["parentfolder"].ToString()).Length)
                {
                    urlPath = urlPath.Substring((appPath + "\\" + payload["parentfolder"].ToString()).Length) + "/";
                }
                else
                {
                    urlPath = "";
                }
                var thisFile = new OneFileItem()
                {
                    filename = fi.Name,
                    filetype = getFileType(fi.Extension),
                    filesize = (fi.Length / 1028).ToString("0"),
                    filedate = fi.LastWriteTime.ToString("M/d/yyyy"),
                    urlpath = urlPath.Replace("\\", "/")
                };
                if (Convert.ToBoolean(payload["withmedia"]) && fi.Extension.ToUpper() == "MP4")
                {
                    var mediaInfo = getMediaInfo(fi.FullName);
                    createThumbnails(fi.FullName);
                    thisFile.framewidth = mediaInfo[0];
                    thisFile.frameheight = mediaInfo[1];
                }
                filedata.Add(thisFile);
            }
            if (!Convert.ToBoolean(payload["includesubfolders"])) { return; }
            foreach (DirectoryInfo di in parentFolder.GetDirectories())
            {
                crawlFile(di, ref filedata);
            }
        }
        private string getFileType(string extension)
        {
            string output = "Unknown";
            try
            {
                RegistryKey thisKey = Registry.ClassesRoot.OpenSubKey(extension);
                string fType = thisKey.GetValue("").ToString();
                thisKey = Registry.ClassesRoot.OpenSubKey(fType);
                string desc = thisKey.GetValue("").ToString();
                output = desc;
            }
            catch
            {
                output = "Unknown";
            }
            if (output == "Unknown" && extension.ToUpper() == "PDF") { return "Portable Document Format (PDF)"; }
            return output;
        }
        private List<string> getMediaInfo(string fullName)
        {
            var proc = new System.Diagnostics.Process();
            var psi = new System.Diagnostics.ProcessStartInfo()
            {
                FileName = "\"" + appPath + "\\bin\\mediainfo.exe\"",
                Arguments = "--Output=XML \"" + fullName + "\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };
            proc.StartInfo = psi;
            proc.Start();
            XmlDocument doc = new XmlDocument();
            doc.Load(proc.StandardOutput);
            proc.WaitForExit();
            proc.Close();
            var output = new List<string>();
            output.Add(fixMediaInfo(doc.SelectSingleNode("/Mediainfo/File").ChildNodes[1].SelectSingleNode("Width___________________________________").InnerXml));
            output.Add(fixMediaInfo(doc.SelectSingleNode("/Mediaingo/File").ChildNodes[1].SelectSingleNode("Height__________________________________").InnerXml));
            return output;
        }
        private void createThumbnails(string fullName)
        {
            string thumbnailFileName = fullName.Replace(".mp4", ".jpg");
            thumbnailFileName = thumbnailFileName.Substring(thumbnailFileName.LastIndexOf("\\") + 1);
            thumbnailFileName = appPath + "\\images\\" + thumbnailFileName;
            if (File.Exists(thumbnailFileName)) { return; }//do not create if it exists already
            if (!Directory.Exists(appPath + "\\images")) { return; }//images dir must exist
            var proc = new System.Diagnostics.Process();
            var psi = new System.Diagnostics.ProcessStartInfo()
            {
                FileName = "\"" + appPath + "\\bin\\ffmped.exe\"",
                Arguments = "-i \"" + fullName + "\" -ss 00:00:30 -s 75X75 -f image2 \"" + thumbnailFileName + "\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };
            proc.StartInfo = psi;
            proc.Start();
            proc.WaitForExit();
            proc.Close();
        }
        private string fixMediaInfo(string input)
        {
            return input.Replace("pixels", "").Replace(" ", "");
        }
        #endregion

        #region image to SQL
        private string bytesToSQLBinary(byte[] bytesIn)
        {
            string output = "";
            for (int n = 0; n < bytesIn.Length; n += 1)
            {
                output += bytesIn[n].ToString("x").PadLeft(2, '0');
            }
            return output;
        }
       
        #endregion
        #region Excel        
        private void gridExcel()
        {
            string[] columnname = (payload.ContainsKey("columnnames") ? (payload["columnnames"] as ArrayList).ToArray(typeof(string)) as string[] : null);
            var alData = (payload["data"] as ArrayList);
            List<string[]> data = new List<string[]>(alData.Count);
            foreach (ArrayList row in alData)
            {
                String[] strRow = (String[])row.ToArray(typeof(string));
                data.Add(strRow);
            }
            string title = (payload.ContainsKey("title") ? payload["title"].ToString() : "Grid Export");
            string fn = title + " " + DateTime.Now.ToString("Mdyyyyhhmmss") + ".xlsx";
            HashSet<char> invalid = new HashSet<char>(System.IO.Path.GetInvalidFileNameChars());
            char[] chrFN = fn.ToCharArray();

            for (int i = 0; i < chrFN.Length; i++)
            {
                if (invalid.Contains(chrFN[i]))
                {
                    chrFN[i] = ' ';
                }
            }
            fn = new string(chrFN);
            int[] numbercolumns = (payload.ContainsKey("numbercolumns") ? (payload["numbercolumns"] as ArrayList).ToArray(typeof(int)) as int[] : null);
            createReport(columnname, data, title, fn, numbercolumns);
        }


        private void gridExcel2()
        {
            string[] columnname = (payload.ContainsKey("columnnames") ? (payload["columnnames"] as ArrayList).ToArray(typeof(string)) as string[] : null);
            var alData = (payload["data"] as ArrayList);
            List<string[]> data = new List<string[]>(alData.Count);
            foreach (ArrayList row in alData)
            {
                String[] strRow = (String[])row.ToArray(typeof(string));
                data.Add(strRow);
            }
            string title = (payload.ContainsKey("title") ? payload["title"].ToString() : "Grid Export");
            string fn = title + " " + DateTime.Now.ToString("Mdyyyyhhmmss") + ".xlsx";
            HashSet<char> invalid = new HashSet<char>(System.IO.Path.GetInvalidFileNameChars());
            char[] chrFN = fn.ToCharArray();

            for (int i = 0; i < chrFN.Length; i++)
            {
                if (invalid.Contains(chrFN[i]))
                {
                    chrFN[i] = ' ';
                }
            }
            fn = new string(chrFN);
            int[] numbercolumns = (payload.ContainsKey("numbercolumns") ? (payload["numbercolumns"] as ArrayList).ToArray(typeof(int)) as int[] : null);
            createReport2(columnname, data, title, fn, numbercolumns);
        }



        private void createReport(string[] columnnames, List<string[]> data, string title, string filename, int[] numbercolumns)
        {
            var rpt = new OpenXMLExcel.OpenXMLExcel();
            if (title == null) { title = ""; }
            string tabtitle = title;
            if (tabtitle.Length > 30) { tabtitle = tabtitle.Substring(0, 30); }
            if (tabtitle == "") { tabtitle = "Sheet1"; }
            var wkid = rpt.AddWorkSheet(tabtitle, true, true);
            var reportData = new List<string[]>();
            string[] s = { title, "", "", "", "", "printed: " + DateTime.Now.ToString("M/d/yyyy hh:mm") };
            reportData.Add(s);
            if (columnnames != null && columnnames.Length > 0)
            {
                reportData.Add(columnnames);
                rpt.AddCommonFontStyle(wkid, OpenXMLExcel.CommonFontStyles.Calibri14Bold, 0, 1, 1, columnnames.Length);
                rpt.AddCommonBorderStyle(wkid, OpenXMLExcel.CommonBorderStyles.Bottom_DoubleLine, 0, 1, 1, columnnames.Length);
                rpt.AddCommonFillStyle(wkid, OpenXMLExcel.CommonFillStyles.LightSilver, 0, 1, 1, columnnames.Length);
            }
            if (data != null && data.Count > 0)
            {
                foreach (string[] row in data)
                {
                    reportData.Add(row);
                }
            }
            else
            {
                string[] nodata = { "no data" };
                reportData.Add(nodata);
            }
            rpt.AddWorksheetData(wkid, reportData);
            rpt.AddCommonFontStyle(wkid, OpenXMLExcel.CommonFontStyles.Calibri16Bold, 0, 0, 1, 1);
            rpt.AddMergeCell(wkid, 0, 0, 1, 5);

           // rpt.AddCommonNumberFormatStyle
            
            if (numbercolumns != null && numbercolumns.Length > 0 && data.Count > 0)
            {
                foreach (int col in numbercolumns)
                {
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.financeComma, col, 2, data.Count, 1);
                }
            }
            sendResponse();
            rpt.HTTPDownload(filename, Response);
            Response.End();

        }


        private void createReport2(string[] columnnames, List<string[]> data, string title, string filename, int[] numbercolumns)
        {
            var rpt = new OpenXMLExcel.OpenXMLExcel();
            if (title == null) { title = ""; }
            string tabtitle = title;
            if (tabtitle.Length > 30) { tabtitle = tabtitle.Substring(0, 30); }
            if (tabtitle == "") { tabtitle = "Sheet1"; }
            var wkid = rpt.AddWorkSheet(tabtitle, true, true);
            var reportData = new List<string[]>();
            string[] s = { title, "", "", "", "", "printed: " + DateTime.Now.ToString("M/d/yyyy hh:mm") };
            reportData.Add(s);
            if (columnnames != null && columnnames.Length > 0)
            {
                reportData.Add(columnnames);
                rpt.AddCommonFontStyle(wkid, OpenXMLExcel.CommonFontStyles.Calibri14Bold, 0, 1, 1, columnnames.Length);
                rpt.AddCommonBorderStyle(wkid, OpenXMLExcel.CommonBorderStyles.Bottom_DoubleLine, 0, 1, 1, columnnames.Length);
                rpt.AddCommonFillStyle(wkid, OpenXMLExcel.CommonFillStyles.LightSilver, 0, 1, 1, columnnames.Length);
            }
            if (data != null && data.Count > 0)
            {
                foreach (string[] row in data)
                {
                    reportData.Add(row);
                }
            }
            else
            {
                string[] nodata = { "no data" };
                reportData.Add(nodata);
            }
            rpt.AddWorksheetData(wkid, reportData);
            rpt.AddCommonFontStyle(wkid, OpenXMLExcel.CommonFontStyles.Calibri16Bold, 0, 0, 1, 1);
            rpt.AddMergeCell(wkid, 0, 0, 1, 5);

            // rpt.AddCommonNumberFormatStyle

            if (numbercolumns != null && numbercolumns.Length > 0 && data.Count > 0)
            {
                foreach (int col in numbercolumns)
                {
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.financePercent, col, 1, 50, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, 0, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 1, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 2, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 3, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 4, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 5, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.financeNoComma, 6, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.financeNoComma, 7, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.financeNoComma, 8, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 9, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 10, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.standardDate, 11, 2, data.Count, 1);
                    rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.textFormat, 12, 2, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 3, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 4, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 5, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 6, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 7, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 8, data.Count, 1);
                    //rpt.AddCommonNumberFormatStyle(wkid, OpenXMLExcel.CommonNumberStyles.General, col, 9, data.Count, 1);
                }
            }
            sendResponse();
            rpt.HTTPDownload(filename, Response);
            Response.End();

        }


        #endregion
        #region "Custom Request"
        private void custom()
        {
            string command = commandObj["command"].ToString();
            string[] parameters = null;
            if (payload["parameters"] != null)
            {
                parameters = (payload["parameters"] as ArrayList).ToArray(typeof(string)) as string[];
            }
            if (download)//on download, send response prior to download
            {
                sendResponse();
            }
            var oSerializer = new System.Web.Script.Serialization.JavaScriptSerializer();           
            //anonymous commands
            switch (command)
            {
                case "adlogin":
                    resp.payload = Security.login();
                    break;


            }

            if (!download)
            {
                sendResponse();
            }
            Response.End();
        }
        private class Payload
        {
            public String[] param = null;
        }
       
        #endregion
       

        #region send response
        private void sendResponse()
        {
            var oSerializer = new System.Web.Script.Serialization.JavaScriptSerializer();
            string mess = oSerializer.Serialize(resp);
            if (Convert.ToBoolean(commandObj["iframe"]))
            {
                var myCookie = new System.Web.HttpCookie(commandObj["tokenid"].ToString());
                myCookie.Value = mess;
                Response.Cookies.Add(myCookie);
            }
            if (!download)
            {
                Response.Write(mess);
            }
        }
        #endregion




        #region read request
        private bool readRequest()
        {
            string JSONString = "";

            if (Request.Params["commandobj"] == null)
            {
                int streamLen = Convert.ToInt32(Request.InputStream.Length);
                if (streamLen > 0)
                {
                    var StreamBytes = new Byte[streamLen];
                    int bytesRead = Request.InputStream.Read(StreamBytes, 0, streamLen);
                    var sb = new StringBuilder();
                    for (int i = 0; i < streamLen; i++)
                    {
                        sb.Append(Convert.ToChar(StreamBytes[i]).ToString());
                    }
                    JSONString = sb.ToString();
                }
            }
            else
            {
                JSONString = Request.Params["commandobj"];
            }
            if (JSONString == "") { return false; }
            commandObj = JSONToDictionary(JSONString).getResult() as IDictionary<string, object>;
            payload = commandObj["payload"] as IDictionary<string, object>;
            download = Convert.ToBoolean(commandObj["download"]);
            optionalData = commandObj["optionaldata"].ToString();
            action = commandObj["action"].ToString();
            resp = new GenericResponse(commandObj["tokenid"].ToString(), new HttpRequestWrapper(Request));
            return true;
        }
        #endregion

        #region JSON Deserializer
        private dynamic JSONToDictionary(string JSONString)
        {
            var jss = new JavaScriptSerializer();
            jss.RegisterConverters(new JavaScriptConverter[] { new DynamicJsonConverter() });
            return jss.Deserialize(JSONString, typeof(object)) as dynamic;
        }
        internal class DynamicJsonObj : DynamicObject
        {
            private IDictionary<string, object> Dict { get; set; }
            public DynamicJsonObj(IDictionary<string, object> dict)
            {
                this.Dict = dict;
            }
            public override bool TryGetMember(GetMemberBinder binder, out object result)
            {
                result = this.Dict[binder.Name];
                if (result is IDictionary<string, object>)
                {
                    result = new DynamicJsonObj(result as IDictionary<string, object>);
                }
                else if (result is ArrayList)
                {
                    var resultList = (result as ArrayList);
                    if (resultList.Count > 0 && resultList[0] is IDictionary<string, object>)
                    {
                        result = new List<DynamicJsonObj>((result as ArrayList).ToArray().Select(x => new DynamicJsonObj(x as IDictionary<string, object>)));
                    }
                    else
                    {
                        result = new List<object>((result as ArrayList).ToArray());
                    }
                }
                else if (result is ArrayList)
                {
                    result = new List<Object>((result as ArrayList).ToArray());
                }

                return this.Dict.ContainsKey(binder.Name);
            }
            public IDictionary<string, object> getResult()
            {
                return this.Dict;
            }
        }
        public class DynamicJsonConverter : JavaScriptConverter
        {
            public override object Deserialize(IDictionary<string, object> dictionary, Type type, JavaScriptSerializer serializer)
            {
                if (dictionary == null)
                    throw new ArgumentNullException("dictionary");

                if (type == typeof(object))
                {
                    return new DynamicJsonObj(dictionary);
                }
                return null;
            }
            public override IDictionary<string, object> Serialize(object obj, JavaScriptSerializer serializer)
            {
                throw new NotImplementedException();
            }
            public override IEnumerable<Type> SupportedTypes
            {
                get { return new ReadOnlyCollection<Type>(new List<Type>(new Type[] { typeof(object) })); }
            }
        }
        #endregion
    }
}