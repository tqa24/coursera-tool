import * as cheerio from "cheerio";

const url = "https://fap.fpt.edu.vn/FrontOffice/MoveSubject.aspx";

export const formGetter = (id: string) => {
  //   const __EVENTTARGET = document
  //     .getElementById("__EVENTTARGET")
  //     ?.getAttribute("value");
  const __EVENTARGUMENT = document
    .getElementById("__EVENTARGUMENT")
    ?.getAttribute("value");
  const __LASTFOCUS = document
    .getElementById("__LASTFOCUS")
    ?.getAttribute("value");
  const __VIEWSTATEGENERATOR = document
    .getElementById("__VIEWSTATEGENERATOR")
    ?.getAttribute("value");
  const __VIEWSTATE = document
    .getElementById("__VIEWSTATE")
    ?.getAttribute("value");
  const __EVENTVALIDATION = document
    .getElementById("__EVENTVALIDATION")
    ?.getAttribute("value");
  const formData = new FormData();
  formData.append("__EVENTTARGET", "ctl00$mainContent$dllCourse");
  formData.append("__EVENTARGUMENT", __EVENTARGUMENT || "");
  formData.append("__LASTFOCUS", __LASTFOCUS || "");
  formData.append("__EVENTVALIDATION", __EVENTVALIDATION || "");
  formData.append("__VIEWSTATE", __VIEWSTATE || "");
  formData.append("__VIEWSTATEGENERATOR", __VIEWSTATEGENERATOR || "");
  formData.append("ctl00$mainContent$dllCourse", id + "");
  formData.append("ctl00$mainContent$hdException", "");
  return formData;
};

export const secondFormGetter = async (secondId: string, id: string) => {
  const page = await (
    await fetch(url + `?id=${secondId}`, {
      method: "GET",
    })
  ).text();
  const $ = cheerio.load(page);
  //   const __EVENTTARGET = $("#__EVENTTARGET").attr("value");
  const __EVENTARGUMENT = $("#__EVENTARGUMENT").attr("value");
  const __LASTFOCUS = $("#__LASTFOCUS").attr("value");
  const __VIEWSTATEGENERATOR = $("#__VIEWSTATEGENERATOR").attr("value");
  const __VIEWSTATE = $("#__VIEWSTATE").attr("value");
  const __EVENTVALIDATION = $("#__EVENTVALIDATION").attr("value");
  const formData = new FormData();
  formData.append("__EVENTTARGET", "ctl00$mainContent$dllCourse");
  formData.append("__EVENTARGUMENT", __EVENTARGUMENT || "");
  formData.append("__LASTFOCUS", __LASTFOCUS || "");
  formData.append("__EVENTVALIDATION", __EVENTVALIDATION || "");
  formData.append("__VIEWSTATE", __VIEWSTATE || "");
  formData.append("__VIEWSTATEGENERATOR", __VIEWSTATEGENERATOR || "");
  formData.append("ctl00$mainContent$dllCourse", id);
  formData.append("ctl00$mainContent$hdException", "");
  return formData;
};
