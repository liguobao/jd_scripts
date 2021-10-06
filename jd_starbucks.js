/*
* 星巴克抽奖
* cron 23 12 * * * jd_starbucks.js
* */
const $ = new Env('星运大奖');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let cookiesArr = [];
let cookie = '';
let allMessage = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  });
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [
    $.getdata("CookieJD"),
    $.getdata("CookieJD2"),
    ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie)].filter((item) => !!item);
}
!(async () => {
  $.isLoginInfo = {};
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    cookie = cookiesArr[i];
    $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1]);
    $.index = i + 1;
    $.isLogin = true;
    $.nickName = $.UserName;
	$.activityId = '0c306caff6b0465e85d20a8144335c0c'
    if(!$.isLoginInfo[$.UserName]){
      await TotalBean();
      console.log(`\n*****开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
      $.isLoginInfo[$.UserName] = $.isLogin;
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
        continue;
      }
    }else {
      console.log(`\n*****开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
    }
	getUA()
	await run();
  }
	if (allMessage) {
    if ($.isNode()) await notify.sendNotify($.name, `${allMessage}\n入口：京东APP - 星巴克官方旗舰店`);
  }
})().catch((e) => {$.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')}).finally(() => {$.done();});

async function run(){
  try{
    $.Drawname = $.canDrawTimes = $.isvObfuscatorToken = $.LZ_TOKEN_KEY = $.LZ_TOKEN_VALUE = $.task =  ''
    await getWxCommonInfoToken();
	await $.wait(1000)
    await getIsvObfuscatorToken();
    if($.isvObfuscatorToken == '' || $.LZ_TOKEN_KEY == '' || $.LZ_TOKEN_VALUE == ''){
      console.log('获取[token]失败！')
      return
    }
	//console.log($.isvObfuscatorToken)
	//console.log($.LZ_TOKEN_KEY)
	//console.log($.LZ_TOKEN_VALUE)
	await $.wait(2000)
	await getSimpleActInfoVo()
    $.myPingData = await getMyPing()
    if ($.myPingData ==="" || $.myPingData === '400001' || typeof $.shopId == 'undefined' || typeof $.venderId == 'undefined') {
      $.log("获取活动信息失败！")
      return
    }
	//console.log($.myPingData)
	await $.wait(5000)
	await getactivityContent()
	console.log(`可抽奖次数：${$.canDrawTimes} `)
	if ($.canDrawTimes > 0)
	{
		await start()
		console.log(`抽奖获得：${$.Drawname} `)
		allMessage += `京东账号${$.index} ${$.nickName || $.UserName}\n抽奖获得：${$.Drawname} \n\n`;
	}else{
            console.log(`抽奖次数已经用完`)
         }
	
  }catch(e){
    console.log(e)
  }
}

function start() {
  return new Promise(resolve => {
    let body = `activityId=${$.activityId}&pin=${encodeURIComponent($.myPingData.secretPin)}`
    $.post(taskPostUrl('/wxDrawActivity/start', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
          if(typeof res == 'object'){
            if(res.result === true && res.data){
			if(typeof res.data.name != 'undefined') $.Drawname = res.data.name
            }else if(typeof res == 'object' && res.errorMessage){
              console.log(`${res.errorMessage || ''}`)
            }else{
              console.log(data)
            }
          }else{
            console.log(data)
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

function getactivityContent() {
  return new Promise(resolve => {
    let body = `activityId=${$.activityId}&pin=${encodeURIComponent($.myPingData.secretPin)}`
    $.post(taskPostUrl('/wxDrawActivity/activityContent', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
          if(typeof res == 'object'){
            if(res.result === true && res.data){
			if(typeof res.data.canDrawTimes != 'undefined') $.canDrawTimes = res.data.canDrawTimes
            }else if(typeof res == 'object' && res.errorMessage){
              console.log(`${res.errorMessage || ''}`)
            }else{
              console.log(data)
            }
          }else{
            console.log(data)
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

function getMyPing() {
  return new Promise(resolve => {
    $.post({
      url: `https://lzkj-isv.isvjcloud.com/customer/getMyPing`,
      body: `userId=${$.venderId}&token=${$.isvObfuscatorToken}&fromType=APP`,
      headers: {
        'User-Agent': $.UA,
        'Content-Type':'application/x-www-form-urlencoded',
        'Host':'lzkj-isv.isvjcloud.com',
		'Origin':'https://lzkj-isv.isvjcloud.com',
        'Referer':`https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity/${$.activityId}?activityId=${$.activityId}`,
        'Cookie': `LZ_TOKEN_KEY=${$.LZ_TOKEN_KEY};LZ_TOKEN_VALUE=${$.LZ_TOKEN_VALUE};`,
      }
    }, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} getMyPing API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
          let setcookies = resp['headers']['set-cookie'] || resp['headers']['Set-Cookie'] || ''
		  //console.log(setcookies)
          let setcookie = ''
          if(setcookies){
            if(typeof setcookies != 'object'){
              setcookie = setcookies.split(',')
            }else setcookie = setcookies
            let lz_jdpin_token = setcookie.filter(row => row.indexOf("lz_jdpin_token") !== -1)[0]
            $.lz_jdpin_token = ''
            if(lz_jdpin_token && lz_jdpin_token.indexOf("lz_jdpin_token=") > -1){
              $.lz_jdpin_token = lz_jdpin_token.split(';') && (lz_jdpin_token.split(';')[0] + ';') || ''
            }
            let LZ_TOKEN_VALUE = setcookie.filter(row => row.indexOf("LZ_TOKEN_VALUE") !== -1)[0]
            if(LZ_TOKEN_VALUE && LZ_TOKEN_VALUE.indexOf("LZ_TOKEN_VALUE=") > -1){
              $.LZ_TOKEN_VALUE = LZ_TOKEN_VALUE.split(';') && (LZ_TOKEN_VALUE.split(';')[0]) || ''
              $.LZ_TOKEN_VALUE = $.LZ_TOKEN_VALUE.replace('LZ_TOKEN_VALUE=','')
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(res.data || '');
      }
    })
  })
}

function getSimpleActInfoVo() {
  return new Promise(resolve => {
    $.post({
      url: `https://lzkj-isv.isvjcloud.com/customer/getSimpleActInfoVo`,
      body: `activityId=${$.activityId}`,
      headers: {
        'User-Agent': $.UA,
        'Content-Type':'application/x-www-form-urlencoded',
        'Host':'lzkj-isv.isvjcloud.com',
        'Referer':`https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity/${$.activityId}?activityId=${$.activityId}`,
        'Cookie': `LZ_TOKEN_KEY=${$.LZ_TOKEN_KEY}; LZ_TOKEN_VALUE=${$.LZ_TOKEN_VALUE};`,
      }
    }, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} getSimpleActInfoVo API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
		  //console.log(res)
          if(typeof res == 'object' && res.result === true){
            if(typeof res.data.shopId != 'undefined') $.shopId = res.data.shopId
            if(typeof res.data.venderId != 'undefined') $.venderId = res.data.venderId
          }else if(typeof res == 'object' && res.errorMessage){
            console.log(`getSimpleActInfoVo ${res.errorMessage || ''}`)
          }else{
            console.log(data)
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

function getWxCommonInfoToken () {
  return new Promise(resolve => {
    $.post({
      url: `https://lzkj-isv.isvjcloud.com/wxCommonInfo/token`,
      headers: {
        'User-Agent': $.UA,
        'Content-Type':'application/x-www-form-urlencoded',
        'Host':'lzkj-isv.isvjcloud.com',
        'Origin':'https://lzkj-isv.isvjcloud.com',
        'Referer': `https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity/${$.activityId}?activityId=${$.activityId}`,
        'Cookie': cookie,
      }
    }, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} wxCommonInfo API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
          if(typeof res == 'object' && res.result === true){
            if(typeof res.data.LZ_TOKEN_KEY != 'undefined') $.LZ_TOKEN_KEY = res.data.LZ_TOKEN_KEY
            if(typeof res.data.LZ_TOKEN_VALUE != 'undefined') $.LZ_TOKEN_VALUE = res.data.LZ_TOKEN_VALUE
          }else if(typeof res == 'object' && res.errorMessage){
            console.log(`token ${res.errorMessage || ''}`)
          }else{
            console.log(data)
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
function getIsvObfuscatorToken () {
  return new Promise(resolve => {
    $.post({
      url: `https://api.m.jd.com/client.action?functionId=isvObfuscator`,
      body: 'body=%7B%22url%22%3A%22https%3A%5C/%5C/lzkj-isv.isvjcloud.com%22%2C%22id%22%3A%22%22%7D&build=167841&client=apple&clientVersion=10.1.6&d_brand=apple&d_model=iPhone8%2C1&eid=GMUTP67XDAWH3OYLM5NVIFJMXXN7SAZZCMRXR5AR6FWSKEA3TEEGQBGYJGBN5GMGGQR5Z32BOKK33SIRZIVKMFLTZ6ZN4T3G4WY2S245WY5R7VHIP27A&ext=%7B%22prstate%22%3A%220%22%7D&isBackground=N&joycious=90&lang=zh_CN&networkType=wifi&networklibtype=JDNetworkBaseAF&openudid=0f761da7deb399f983fd0a627ba197fc8a816d35&osVersion=14.2&partner=apple&rfs=0000&scope=11&screen=750%2A1334&sign=a05c8ec7d9bb317358a48acf3d258116&st=1633512316329&sv=100',
      headers: {
        'User-Agent': $.UA,
        'Content-Type':'application/x-www-form-urlencoded',
        'Host':'api.m.jd.com',
        'Cookie': cookie,
      }
    }, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} isvObfuscator API请求失败，请检查网路重试`)
        } else {
          res = $.toObj(data);
          if(typeof res == 'object'){
            if(typeof res.token != 'undefined') $.isvObfuscatorToken = res.token
          }else{
            console.log(data)
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
function taskPostUrl(url, body) {
  return {
    url: `https://lzkj-isv.isvjcloud.com${url}`,
    body: body,
    headers: {
      "Accept": "application/json",
      "Accept-Language": "zh-cn",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded",
      'Cookie': `${cookie} LZ_TOKEN_KEY=${$.LZ_TOKEN_KEY}; LZ_TOKEN_VALUE=${$.LZ_TOKEN_VALUE}; AUTH_C_USER=${$.myPingData.secretPin}; ${$.lz_jdpin_token}`,
      "Host": "lzkj-isv.isvjcloud.com",
      "Origin": "https://lzkj-isv.isvjcloud.com",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `https://lzkj-isv.isvjcloud.com/wxDrawActivity/activity/${$.activityId}?activityId=${$.activityId}`,
      "User-Agent": $.UA ,
    }
  }
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

function getUA(){
  $.UA = `jdapp;iPhone;10.1.2;14.3;${randomString(40)};network/wifi;model/iPhone12,1;addressid/4199175193;appBuild/167802;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`
}
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}

// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
