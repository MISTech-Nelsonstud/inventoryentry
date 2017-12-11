using System;
using System.Web;
using dbConnector2017;
using System.Collections.Generic;
using System.Collections;

namespace CommonClasses
{
    internal class ResponseObject
    {
        public bool success = false;
        public string errormessage = "";
        public string displayerrormessage { get; set; }
        public string clientIP { get; set; }
        public ResponseObject(HttpRequestBase req)
        {
            this.clientIP = req.ServerVariables["REMOTE_ADDR"];
            if (!isIPV4(this.clientIP))
            {
                string other = System.Net.Dns.GetHostName();
                foreach (System.Net.IPAddress ip in System.Net.Dns.GetHostAddresses(other))
                {
                    if (isIPV4(ip))
                    {
                        this.clientIP = ip.ToString();
                        break;
                    }
                }
            }
        }
        private bool isIPV4(string input)
        {
            System.Net.IPAddress output;
            if (System.Net.IPAddress.TryParse(input, out output))
            {
                return isIPV4(output);
            }
            return false;
        }
        private bool isIPV4(System.Net.IPAddress input)
        {
            return input.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork;
        }
    }

    
    internal class GenericResponse : ResponseObject
    {
        public string tokenid { get; set; }
        public bool haserror { get; set; }
        public string payload { get; set; }
        public string filename { get; set; }

        public GenericResponse(string _tokenid, HttpRequestBase req) : base(req)
        {
            tokenid = _tokenid;
            SetError(errorLevels.noError);
            payload = "";
        }

        public enum errorLevels
        {
            noError,
            actionFalse,
            fileTooLarge,
            fileWriteError,
            fileNotInRequest,
            customError,
            fileMissing,
            dirMissing,
            SQLError,
            reportError
        };
        public void SetError(errorLevels ErrorLevel, string CustomMessage = "")
        {
            if (!haserror && ErrorLevel != errorLevels.noError) { haserror = true; }
            switch (ErrorLevel)
            {
                case errorLevels.noError:
                    errormessage = "Request Successful";
                    break;
                case errorLevels.actionFalse:
                    errormessage = "Action was not successful";
                    break;
                case errorLevels.fileTooLarge:
                    errormessage = "File size too large exceeded " + CustomMessage; ;
                    break;
                case errorLevels.fileWriteError:
                    errormessage = "There was an error writing to disk: " + CustomMessage;
                    break;
                case errorLevels.fileNotInRequest:
                    errormessage = "The file is not in the http request";
                    break;
                case errorLevels.fileMissing:
                    errormessage = "File not found";
                    break;
                case errorLevels.dirMissing:
                    errormessage = "Directory not found";
                    break;
                case errorLevels.SQLError:
                    errormessage = "SQL Error";
                    break;
                case errorLevels.reportError:
                    errormessage = "Report Error";
                    break;
                case errorLevels.customError:
                    errormessage = CustomMessage;
                    break;
            }
        }
    }


    
   

    
    internal class ColumnDefinitions
    {
        public string ColumnNameToDisplay { get; set; }
        public int index { get; set; }
        private string pColumnName;
        public string ColumnName
        {
            get
            {
                return pColumnName;
            }
        }
        public ColumnDefinitions(string columnName)
        {
            pColumnName = columnName;
            ColumnNameToDisplay = columnName;
        }
        public bool TranslateBoolToYesNo = false;
        public bool decrypt = false;
    }

    
}