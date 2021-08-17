/*
京东资产变动通知脚本：jd_bean_change.js
Modified time: 2021-06-9 15:25:41
统计昨日京豆的变化情况，包括收入，支出，以及显示当前京豆数量,目前小问题:下单使用京豆后,退款重新购买,计算统计会出现异常
统计红包以及过期红包
网页查看地址 : https://bean.m.jd.com/beanDetail/index.action?resourceValue=bean
支持京东双账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
============QuantumultX==============
[task_local]
#京东资产变动通知
2 9 * * * jd_bean_change.js, tag=京东资产变动通知, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/jd.png, enabled=true
================Loon===============
[Script]
cron "2 9 * * *" script-path=jd_bean_change.js, tag=京东资产变动通知
=============Surge===========
[Script]
京东资产变动通知 = type=cron,cronexp="2 9 * * *",wake-system=1,timeout=3600,script-path=jd_bean_change.js

============小火箭=========
京东资产变动通知 = type=cron,script-path=jd_bean_change.js, cronexpr="2 9 * * *", timeout=3600, enable=true
 */
const $ = new Env('京东资产变动通知');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const JD_API_HOST = 'https://api.m.jd.com/', actCode = 'visa-card-001';
let allMessage = '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.beanCount = 0;
      $.incomeBean = 0;
      $.expenseBean = 0;
      $.todayIncomeBean = 0;
      $.errorMsg = '';
      $.isLogin = true;
      $.nickName = '';
      $.message = '';
      $.balance = 0;
      $.expiredBalance = 0;
	  $.total = 0
      await TotalBean();
      console.log(`\n********开始【京东账号${$.index}】${$.nickName || $.UserName}******\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      await bean();
	  await cash()
      await showMsg();
    }
  }

  if ($.isNode() && allMessage) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`, { url: `https://bean.m.jd.com/beanDetail/index.action?resourceValue=bean` })
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function showMsg() {
  if ($.errorMsg) return
  allMessage += `账号${$.index}：${$.nickName || $.UserName}\n今日收入：${$.todayIncomeBean}京豆 🐶\n昨日收支：${$.incomeBean}京豆${$.expenseBean}京豆 🐶\n当前京豆：${$.beanCount}(今日将过期${$.expirejingdou})京豆 🐶${$.message}\n极速金币：${$.total}金币可换 ${($.total/10000).toFixed(2)} 元 🧧${$.index !== cookiesArr.length ? '\n\n' : ''}`;
  // if ($.isNode()) {
  //   await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `账号${$.index}：${$.nickName || $.UserName}\n昨日收入：${$.incomeBean}京豆 🐶\n昨日支出：${$.expenseBean}京豆 🐶\n当前京豆：${$.beanCount}京豆 🐶${$.message}`, { url: `https://bean.m.jd.com/beanDetail/index.action?resourceValue=bean` })
  // }
  $.msg($.name, '', `账号${$.index}：${$.nickName || $.UserName}\n今日收入：${$.todayIncomeBean}京豆 🐶\n昨日收支：${$.incomeBean}京豆${$.expenseBean}京豆 🐶\n当前京豆：${$.beanCount}(今日将过期${$.expirejingdou})京豆 🐶${$.message}\n极速金币：${$.total}金币可换 ${($.total/10000).toFixed(2)} 元 🧧`, {"open-url": "https://bean.m.jd.com/beanDetail/index.action?resourceValue=bean"});
}
async function bean() {
  // console.log(`北京时间零点时间戳:${parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000}`);
  // console.log(`北京时间2020-10-28 06:16:05::${new Date("2020/10/28 06:16:05+08:00").getTime()}`)
  // 不管哪个时区。得到都是当前时刻北京时间的时间戳 new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000

  //前一天的0:0:0时间戳
  const tm = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 - (24 * 60 * 60 * 1000);
  // 今天0:0:0时间戳
  const tm1 = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000;
  let page = 1, t = 0, yesterdayArr = [], todayArr = [];
  do {
    let response = await getJingBeanBalanceDetail(page);
    // console.log(`第${page}页: ${JSON.stringify(response)}`);
    if (response && response.code === "0") {
      page++;
      let detailList = response.detailList;
      if (detailList && detailList.length > 0) {
        for (let item of detailList) {
          const date = item.date.replace(/-/g, '/') + "+08:00";
          if (new Date(date).getTime() >= tm1 && (!item['eventMassage'].includes("退还") && !item['eventMassage'].includes('扣赠'))) {
            todayArr.push(item);
          } else if (tm <= new Date(date).getTime() && new Date(date).getTime() < tm1 && (!item['eventMassage'].includes("退还") && !item['eventMassage'].includes('扣赠'))) {
            //昨日的
            yesterdayArr.push(item);
          } else if (tm > new Date(date).getTime()) {
            //前天的
            t = 1;
            break;
          }
        }
      } else {
        $.errorMsg = `数据异常`;
        $.msg($.name, ``, `账号${$.index}：${$.nickName}\n${$.errorMsg}`);
        t = 1;
      }
    } else if (response && response.code === "3") {
      console.log(`cookie已过期，或者填写不规范，跳出`)
      t = 1;
    } else {
      console.log(`未知情况：${JSON.stringify(response)}`);
      console.log(`未知情况，跳出`)
      t = 1;
    }
  } while (t === 0);
  for (let item of yesterdayArr) {
    if (Number(item.amount) > 0) {
      $.incomeBean += Number(item.amount);
    } else if (Number(item.amount) < 0) {
      $.expenseBean += Number(item.amount);
    }
  }
  for (let item of todayArr) {
    if (Number(item.amount) > 0) {
      $.todayIncomeBean += Number(item.amount);
    }
  }
  await queryexpirejingdou();//过期京豆
  await redPacket();//过期红包
  // console.log(`昨日收入：${$.incomeBean}个京豆 🐶`);
  // console.log(`昨日支出：${$.expenseBean}个京豆 🐶`)
}

function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      url: "https://wq.jd.com/user_new/info/GetJDUserInfoUnion?sceneval=2",
      headers: {
        Host: "wq.jd.com",
        Accept: "*/*",
        Connection: "keep-alive",
        Cookie: cookie,
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Accept-Language": "zh-cn",
        "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
        "Accept-Encoding": "gzip, deflate, br"
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 1001) {
              $.isLogin = false; //cookie过期
              return;
            }
            if (data['retcode'] === 0 && data.data && data.data.hasOwnProperty("userInfo")) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
            if (data['retcode'] === 0 && data.data && data.data['assetInfo']) {
              $.beanCount = data.data && data.data['assetInfo']['beanNum'];
            }
          } else {
            console.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e)
      } finally {
        resolve();
      }
    })
  })
}

function TotalBean_bak() {
  return new Promise(async resolve => {
    const options = {
      url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
      headers: {
        Host: "me-api.jd.com",
        Accept: "*/*",
        Connection: "keep-alive",
        Cookie: cookie,
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Accept-Language": "zh-cn",
        "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
        "Accept-Encoding": "gzip, deflate, br"
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === "1001") {
              $.isLogin = false; //cookie过期
              return;
            }
            if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
            if (data['retcode'] === '0' && data.data && data.data['assetInfo']) {
              $.beanCount = data.data && data.data['assetInfo']['beanNum'];
            }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e)
      } finally {
        resolve();
      }
    })
  })
}
function getJingBeanBalanceDetail(page) {
  return new Promise(async resolve => {
    const options = {
      "url": `https://api.m.jd.com/client.action?functionId=getJingBeanBalanceDetail`,
      "body": `body=${escape(JSON.stringify({"pageSize": "20", "page": page.toString()}))}&appid=ld`,
      "headers": {
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        'Host': 'api.m.jd.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
      }
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            // console.log(data)
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function queryexpirejingdou() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/activep3/singjd/queryexpirejingdou?_=${Date.now()}&g_login_type=1&sceneval=2`,
      "headers": {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Host": "wq.jd.com",
        "Referer": "https://wqs.jd.com/promote/201801/bean/mybean.html",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Mobile/15E148 Safari/604.1"
      }
    }
    $.expirejingdou = 0;
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            // console.log(data)
            data = JSON.parse(data.slice(23, -13));
            // console.log(data)
            if (data.ret === 0) {
              data['expirejingdou'].map(item => {
                console.log(`${timeFormat(item['time'] * 1000)}日过期京豆：${item['expireamount']}\n`);
              })
              $.expirejingdou = data['expirejingdou'][0]['expireamount'];
              // if ($.expirejingdou > 0) {
              //   $.message += `\n今日将过期：${$.expirejingdou}京豆 🐶`;
              // }
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function redPacket() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://m.jingxi.com/user/info/QueryUserRedEnvelopesV2?type=1&orgFlag=JD_PinGou_New&page=1&cashRedType=1&redBalanceFlag=1&channel=1&_=${+new Date()}&sceneval=2&g_login_type=1&g_ty=ls`,
      "headers": {
        'Host': 'm.jingxi.com',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Accept-Language': 'zh-cn',
        'Referer': 'https://st.jingxi.com/my/redpacket.shtml?newPg=App&jxsid=16156262265849285961',
        'Accept-Encoding': 'gzip, deflate, br',
        "Cookie": cookie,
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data).data
            $.jxRed = 0, $.jsRed = 0, $.jdRed = 0, $.jdhRed = 0, $.jxRedExpire = 0, $.jsRedExpire = 0, $.jdRedExpire = 0, $.jdhRedExpire = 0;
            let t = new Date()
            t.setDate(t.getDate() + 1)
            t.setHours(0, 0, 0, 0)
            t = parseInt((t - 1) / 1000)
            for (let vo of data.useRedInfo.redList || []) {
              if (vo.orgLimitStr && vo.orgLimitStr.includes("京喜")) {
                $.jxRed += parseFloat(vo.balance)
                if (vo['endTime'] === t) {
                  $.jxRedExpire += parseFloat(vo.balance)
                }
              } else if (vo.activityName.includes("极速版")) {
                $.jsRed += parseFloat(vo.balance)
                if (vo['endTime'] === t) {
                  $.jsRedExpire += parseFloat(vo.balance)
                }
              } else if (vo.orgLimitStr && vo.orgLimitStr.includes("京东健康")) {
                $.jdhRed += parseFloat(vo.balance)
                if (vo['endTime'] === t) {
                  $.jdhRedExpire += parseFloat(vo.balance)
                }
              } else {
                $.jdRed += parseFloat(vo.balance)
                if (vo['endTime'] === t) {
                  $.jdRedExpire += parseFloat(vo.balance)
                }
              }
            }
            $.jxRed = $.jxRed.toFixed(2)
            $.jsRed = $.jsRed.toFixed(2)
            $.jdRed = $.jdRed.toFixed(2)
            $.jdhRed = $.jdhRed.toFixed(2)
            $.balance = data.balance
            $.expiredBalance = ($.jxRedExpire + $.jsRedExpire + $.jdRedExpire).toFixed(2)
            //$.message += `\n当前总红包：${$.balance}(今日总过期${$.expiredBalance})元 🧧\n京喜红包：${$.jxRed}(今日将过期${$.jxRedExpire.toFixed(2)})元 🧧\n极速红包：${$.jsRed}(今日将过期${$.jsRedExpire.toFixed(2)})元 🧧\n京东红包：${$.jdRed}(今日将过期${$.jdRedExpire.toFixed(2)})元 🧧\n健康红包：${$.jdhRed}(今日将过期${$.jdhRedExpire.toFixed(2)})元 🧧`;
			$.message += `\n当前总红包：${$.balance}(今日总过期${$.expiredBalance})元 🧧\n京喜红包：${$.jxRed}(今日将过期${$.jxRedExpire.toFixed(2)})元 🧧\n极速红包：${$.jsRed}(今日将过期${$.jsRedExpire.toFixed(2)})元 🧧\n京东红包：${$.jdRed}(今日将过期${$.jdRedExpire.toFixed(2)})元 🧧`;
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
function timeFormat(time) {
  let date;
  if (time) {
    date = new Date(time)
  } else {
    date = new Date();
  }
  return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}

//极速金币开始
async function cash() {
  return new Promise(resolve => {
    $.get(taskUrl('MyAssetsService.execute',
      {"method": "userCashRecord", "data": {"channel": 1, "pageNum": 1, "pageSize": 20}}),
      async (err, resp, data) => {
        try {
          if (err) {
            console.log(`${JSON.stringify(err)}`)
            console.log(`${$.name} API请求失败，请检查网路重试`)
          } else {
            if (safeGet(data)) {
              data = JSON.parse(data);
              $.total = data.data.goldBalance
            }
          }
        } catch (e) {
          $.logErr(e, resp)
        } finally {
          resolve(data);
        }
      })
  })
}

var __encode ='jsjiami.com',_a={}, _0xb483=["\x5F\x64\x65\x63\x6F\x64\x65","\x68\x74\x74\x70\x3A\x2F\x2F\x77\x77\x77\x2E\x73\x6F\x6A\x73\x6F\x6E\x2E\x63\x6F\x6D\x2F\x6A\x61\x76\x61\x73\x63\x72\x69\x70\x74\x6F\x62\x66\x75\x73\x63\x61\x74\x6F\x72\x2E\x68\x74\x6D\x6C"];(function(_0xd642x1){_0xd642x1[_0xb483[0]]= _0xb483[1]})(_a);var __Oxb24bc=["\x6C\x69\x74\x65\x2D\x61\x6E\x64\x72\x6F\x69\x64\x26","\x73\x74\x72\x69\x6E\x67\x69\x66\x79","\x26\x61\x6E\x64\x72\x6F\x69\x64\x26\x33\x2E\x31\x2E\x30\x26","\x26","\x26\x38\x34\x36\x63\x34\x63\x33\x32\x64\x61\x65\x39\x31\x30\x65\x66","\x31\x32\x61\x65\x61\x36\x35\x38\x66\x37\x36\x65\x34\x35\x33\x66\x61\x66\x38\x30\x33\x64\x31\x35\x63\x34\x30\x61\x37\x32\x65\x30","\x69\x73\x4E\x6F\x64\x65","\x63\x72\x79\x70\x74\x6F\x2D\x6A\x73","","\x61\x70\x69\x3F\x66\x75\x6E\x63\x74\x69\x6F\x6E\x49\x64\x3D","\x26\x62\x6F\x64\x79\x3D","\x26\x61\x70\x70\x69\x64\x3D\x6C\x69\x74\x65\x2D\x61\x6E\x64\x72\x6F\x69\x64\x26\x63\x6C\x69\x65\x6E\x74\x3D\x61\x6E\x64\x72\x6F\x69\x64\x26\x75\x75\x69\x64\x3D\x38\x34\x36\x63\x34\x63\x33\x32\x64\x61\x65\x39\x31\x30\x65\x66\x26\x63\x6C\x69\x65\x6E\x74\x56\x65\x72\x73\x69\x6F\x6E\x3D\x33\x2E\x31\x2E\x30\x26\x74\x3D","\x26\x73\x69\x67\x6E\x3D","\x61\x70\x69\x2E\x6D\x2E\x6A\x64\x2E\x63\x6F\x6D","\x2A\x2F\x2A","\x52\x4E","\x4A\x44\x4D\x6F\x62\x69\x6C\x65\x4C\x69\x74\x65\x2F\x33\x2E\x31\x2E\x30\x20\x28\x69\x50\x61\x64\x3B\x20\x69\x4F\x53\x20\x31\x34\x2E\x34\x3B\x20\x53\x63\x61\x6C\x65\x2F\x32\x2E\x30\x30\x29","\x7A\x68\x2D\x48\x61\x6E\x73\x2D\x43\x4E\x3B\x71\x3D\x31\x2C\x20\x6A\x61\x2D\x43\x4E\x3B\x71\x3D\x30\x2E\x39","\x75\x6E\x64\x65\x66\x69\x6E\x65\x64","\x6C\x6F\x67","\u5220\u9664","\u7248\u672C\u53F7\uFF0C\x6A\x73\u4F1A\u5B9A","\u671F\u5F39\u7A97\uFF0C","\u8FD8\u8BF7\u652F\u6301\u6211\u4EEC\u7684\u5DE5\u4F5C","\x6A\x73\x6A\x69\x61","\x6D\x69\x2E\x63\x6F\x6D"];function taskUrl(_0x7683x2,_0x7683x3= {}){let _0x7683x4=+ new Date();let _0x7683x5=`${__Oxb24bc[0x0]}${JSON[__Oxb24bc[0x1]](_0x7683x3)}${__Oxb24bc[0x2]}${_0x7683x2}${__Oxb24bc[0x3]}${_0x7683x4}${__Oxb24bc[0x4]}`;let _0x7683x6=__Oxb24bc[0x5];const _0x7683x7=$[__Oxb24bc[0x6]]()?require(__Oxb24bc[0x7]):CryptoJS;let _0x7683x8=_0x7683x7.HmacSHA256(_0x7683x5,_0x7683x6).toString();return {url:`${__Oxb24bc[0x8]}${JD_API_HOST}${__Oxb24bc[0x9]}${_0x7683x2}${__Oxb24bc[0xa]}${escape(JSON[__Oxb24bc[0x1]](_0x7683x3))}${__Oxb24bc[0xb]}${_0x7683x4}${__Oxb24bc[0xc]}${_0x7683x8}${__Oxb24bc[0x8]}`,headers:{'\x48\x6F\x73\x74':__Oxb24bc[0xd],'\x61\x63\x63\x65\x70\x74':__Oxb24bc[0xe],'\x6B\x65\x72\x6E\x65\x6C\x70\x6C\x61\x74\x66\x6F\x72\x6D':__Oxb24bc[0xf],'\x75\x73\x65\x72\x2D\x61\x67\x65\x6E\x74':__Oxb24bc[0x10],'\x61\x63\x63\x65\x70\x74\x2D\x6C\x61\x6E\x67\x75\x61\x67\x65':__Oxb24bc[0x11],'\x43\x6F\x6F\x6B\x69\x65':cookie}}}(function(_0x7683x9,_0x7683xa,_0x7683xb,_0x7683xc,_0x7683xd,_0x7683xe){_0x7683xe= __Oxb24bc[0x12];_0x7683xc= function(_0x7683xf){if( typeof alert!== _0x7683xe){alert(_0x7683xf)};if( typeof console!== _0x7683xe){console[__Oxb24bc[0x13]](_0x7683xf)}};_0x7683xb= function(_0x7683x7,_0x7683x9){return _0x7683x7+ _0x7683x9};_0x7683xd= _0x7683xb(__Oxb24bc[0x14],_0x7683xb(_0x7683xb(__Oxb24bc[0x15],__Oxb24bc[0x16]),__Oxb24bc[0x17]));try{_0x7683x9= __encode;if(!( typeof _0x7683x9!== _0x7683xe&& _0x7683x9=== _0x7683xb(__Oxb24bc[0x18],__Oxb24bc[0x19]))){_0x7683xc(_0x7683xd)}}catch(e){_0x7683xc(_0x7683xd)}})({})

function taskGetUrl(function_id, body) {
  return {
    url: `https://api.m.jd.com/?appid=activities_platform&functionId=${function_id}&body=${escape(JSON.stringify(body))}&t=${+new Date()}`,
    headers: {
      'Cookie': cookie,
      'Host': 'api.m.jd.com',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'user-agent': $.isNode() ? (process.env.JS_USER_AGENT ? process.env.JS_USER_AGENT : (require('./JS_USER_AGENTS').USER_AGENT)) : ($.getdata('JSUA') ? $.getdata('JSUA') : "'jdltapp;iPad;3.1.0;14.4;network/wifi;Mozilla/5.0 (iPad; CPU OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      'Accept-Language': 'zh-Hans-CN;q=1,en-CN;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': "application/x-www-form-urlencoded",
      "referer": "https://an.jd.com/babelDiy/Zeus/q1eB6WUB8oC4eH1BsCLWvQakVsX/index.html"
    }
  }
}

function safeGet(data) {
  try {
    if (typeof JSON.parse(data) == "object") {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
//极速金币结束

// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}